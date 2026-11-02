import { createHash } from 'node:crypto';
import { query } from '../config/database.js';
import { TRANSLATION_LANGUAGES } from '../utils/domain-values.js';
import { generateText } from './gemini.service.js';

const SOURCE_LANGUAGE = 'fr';
const MAXIMUM_TEXTS_PER_BATCH = 30;
const MAXIMUM_CHARACTERS_PER_BATCH = 9000;
const memoryCache = new Map();   // `${langue}|${empreinte}` -> traduction (évite d'interroger la base à chaque requête)
const inFlight = new Map();      // `${langue}|${empreinte}` -> promesse (deux visiteurs simultanés = une seule traduction)

let languageNames;
function languageNameOf(language) {
  languageNames ||= new Intl.DisplayNames(['fr'], { type: 'language' });
  try { return languageNames.of(language) || language; } catch { return language; }
}

const fingerprintOf = (text) => createHash('sha256').update(text).digest('hex');
const isTranslatable = (language) => language !== SOURCE_LANGUAGE && TRANSLATION_LANGUAGES.includes(language);

function parseTranslationList(rawText, expectedLength) {
  const cleaned = String(rawText || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === expectedLength && parsed.every((item) => typeof item === 'string' && item.trim())) return parsed;
  } catch { /* réponse inexploitable : traitée comme un échec */ }
  return null;
}

const instructionsFor = (language) =>
  `Traduis en ${languageNameOf(language)} (langue source : français ; si un texte est déjà dans cette langue, renvoie-le tel quel). `
  + 'Conserve le sens, le ton, les retours à la ligne et la ponctuation. Ne traduis pas les noms propres de personnes, les sigles '
  + '(CSCTICAO, TIC, PMR…), les adresses e-mail, numéros de téléphone, adresses web ni les nombres. ';

async function translateBatch(texts, language) {
  const answer = await generateText(
    `${instructionsFor(language)}Réponds uniquement par un tableau JSON de ${texts.length} chaînes, dans le même ordre, sans commentaire.\n${JSON.stringify(texts)}`,
  );
  const translations = parseTranslationList(answer, texts.length);
  if (translations) return translations;
  // Lot mal formé : on traduit les textes un par un plutôt que de tout perdre.
  return Promise.all(texts.map(async (text) => (await generateText(`${instructionsFor(language)}Réponds par la traduction seule.\n${text}`)).trim() || text));
}

function splitIntoBatches(texts) {
  const batches = [];
  let current = [];
  let characters = 0;
  for (const text of texts) {
    if (current.length && (current.length >= MAXIMUM_TEXTS_PER_BATCH || characters + text.length > MAXIMUM_CHARACTERS_PER_BATCH)) {
      batches.push(current); current = []; characters = 0;
    }
    current.push(text); characters += text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function translateMissing(texts, language) {
  const results = new Map();
  for (const batch of splitIntoBatches(texts)) {
    try {
      const translations = await translateBatch(batch, language);
      batch.forEach((text, position) => results.set(text, translations[position]));
    } catch (error) {
      console.error(`[TRADUCTION] ${language} impossible :`, error.message);
    }
  }
  const stored = [...results.entries()].filter(([text, translation]) => translation && translation !== text);
  for (const [text, translation] of stored) {
    await query(
      'INSERT INTO CONTENT_TRANSLATIONS (SOURCE_HASH, LANGUAGE, TRANSLATION) VALUES (?, ?, ?) ON CONFLICT (SOURCE_HASH, LANGUAGE) DO NOTHING',
      [fingerprintOf(text), language, translation],
    ).catch((error) => console.error('[TRADUCTION] enregistrement impossible :', error.message));
  }
  return results;
}

/**
 * Traduit une liste de textes (français) vers `language`. Les traductions déjà faites viennent du cache (mémoire, puis base) ;
 * seules les nouvelles passent par Kim. En cas d'échec, le texte d'origine est renvoyé : le site ne casse jamais.
 */
export async function translateTexts(texts, language) {
  if (!isTranslatable(language)) return texts;
  const uniqueTexts = [...new Set(texts.filter((text) => typeof text === 'string' && text.trim()))];
  const keyOf = (text) => `${language}|${fingerprintOf(text)}`;
  const answers = new Map();

  let unknownTexts = uniqueTexts.filter((text) => {
    const cached = memoryCache.get(keyOf(text));
    if (cached !== undefined) { answers.set(text, cached); return false; }
    return true;
  });
  if (unknownTexts.length) {
    const rows = await query(
      'SELECT SOURCE_HASH, TRANSLATION FROM CONTENT_TRANSLATIONS WHERE LANGUAGE = ? AND SOURCE_HASH = ANY(?::text[])',
      [language, unknownTexts.map(fingerprintOf)],
    ).catch(() => []);
    const translationByHash = new Map(rows.map((row) => [row.source_hash, row.translation]));
    unknownTexts = unknownTexts.filter((text) => {
      const stored = translationByHash.get(fingerprintOf(text));
      if (stored === undefined) return true;
      memoryCache.set(keyOf(text), stored); answers.set(text, stored);
      return false;
    });
  }

  const waitingFor = [];
  const toTranslate = [];
  for (const text of unknownTexts) {
    if (inFlight.has(keyOf(text))) waitingFor.push(inFlight.get(keyOf(text)).then((translation) => answers.set(text, translation)));
    else toTranslate.push(text);
  }
  if (toTranslate.length) {
    const batchPromise = translateMissing(toTranslate, language);
    for (const text of toTranslate) {
      const textPromise = batchPromise.then((results) => results.get(text) || text);
      inFlight.set(keyOf(text), textPromise);
      waitingFor.push(textPromise.then((translation) => {
        answers.set(text, translation);
        if (translation !== text) memoryCache.set(keyOf(text), translation);
      }).finally(() => inFlight.delete(keyOf(text))));
    }
  }
  await Promise.all(waitingFor);
  return texts.map((text) => (typeof text === 'string' && answers.has(text) ? answers.get(text) : text));
}

/** Traduit les champs `fieldNames` (texte ou liste de textes) d'une liste d'objets. Les autres champs restent inchangés. */
export async function translateRows(rows, fieldNames, language) {
  if (!isTranslatable(language) || !rows.length) return rows;
  const texts = [];
  for (const row of rows) {
    for (const fieldName of fieldNames) {
      const value = row[fieldName];
      if (typeof value === 'string') texts.push(value);
      else if (Array.isArray(value)) texts.push(...value.filter((item) => typeof item === 'string'));
    }
  }
  const translated = await translateTexts(texts, language);
  let position = 0;
  return rows.map((row) => {
    const translatedRow = { ...row };
    for (const fieldName of fieldNames) {
      const value = row[fieldName];
      if (typeof value === 'string') { translatedRow[fieldName] = translated[position]; position += 1; }
      else if (Array.isArray(value)) {
        translatedRow[fieldName] = value.map((item) => { if (typeof item !== 'string') return item; const result = translated[position]; position += 1; return result; });
      }
    }
    return translatedRow;
  });
}
