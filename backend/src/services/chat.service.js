import { query } from '../config/database.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { SUPPORTED_LANGUAGES, TRANSLATION_LANGUAGES } from '../utils/domain-values.js';
import { buildSystemPrompt } from '../prompts/kim.prompt.js';
import { loadKnowledge, allowedSources, resolveRequestedImages, resolveRequestedForm } from './knowledge.service.js';
import { generateKimTurn } from './gemini.service.js';
import { isTakeoverActive } from './human-takeover.service.js';
import { listPresentation } from './presentation.service.js';
import { translateRows } from './translation.service.js';
import { videosService } from './entries.service.js';

const FALLBACK_REPLY_BY_LANGUAGE = {
  fr: "Je ne parviens pas à répondre pour le moment. Votre question a été transmise à un agent du Centre qui vous répondra.",
  en: "I can't answer right now. Your question has been forwarded to a Centre agent who will get back to you.",
  ko: '지금은 답변을 드릴 수 없습니다. 질문을 센터 직원에게 전달했으니 곧 답변을 드리겠습니다.',
};

async function loadHistory(sessionId) {
  const historyRows = await query(
    `SELECT USER_MESSAGE, KIM_RESPONSE FROM CHAT_LOGS WHERE SESSION_ID = ?
     ORDER BY CREATED_AT DESC LIMIT 10`,
    [sessionId],
  );
  return historyRows.reverse();
}

async function recordExchange({ sessionId, message, reply, language, sources, needsHuman }) {
  await query(
    `INSERT INTO CHAT_LOGS (ID, SESSION_ID, USER_MESSAGE, KIM_RESPONSE, DETECTED_LANGUAGE, CITED_SOURCE, NEEDS_HUMAN)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      generateIdentifier(), sessionId, message, reply, language,
      sources.map((source) => source.url).join(' | ').slice(0, 500) || null, needsHuman,
    ],
  );
}

export async function handleMessage({ message, sessionId, language }) {
  const preferredLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';

  // Un agent a repris la main : Kim se tait, le message est transmis à l'agent.
  if (await isTakeoverActive(sessionId)) {
    await recordExchange({ sessionId, message, reply: null, language: preferredLanguage, sources: [], needsHuman: true });
    return {
      reply: '', language: preferredLanguage, sources: [], images: [], needs_human: true, human_takeover: true, form: null, presentation: null, videos: null,
    };
  }
  let reply;
  let replyLanguage = preferredLanguage;
  let sources = [];
  let images = [];
  let needsHuman = false;
  let form = null;
  let presentation = null;
  let videos = null;

  try {
    const knowledge = await loadKnowledge();
    const history = await loadHistory(sessionId);
    const turn = await generateKimTurn({ systemInstruction: buildSystemPrompt(knowledge), history, message });

    reply = String(turn.reply || '').trim();
    // Kim répond dans la langue de la question (quelle que soit la langue de l'interface).
    replyLanguage = TRANSLATION_LANGUAGES.includes(turn.language) ? turn.language : preferredLanguage;
    needsHuman = Boolean(turn.needs_human);
    const allowedSourceLabels = allowedSources(knowledge);
    sources = (Array.isArray(turn.sources) ? turn.sources : [])
      .filter((source) => source && allowedSourceLabels.has(source.url))
      .map((source) => ({ label: allowedSourceLabels.get(source.url), url: source.url }));
    sources = await translateRows(sources, ['label'], replyLanguage);
    images = await translateRows(resolveRequestedImages(knowledge, turn.images), ['title'], replyLanguage);
    if (!reply) throw new Error('Réponse vide de Gemini');

    form = resolveRequestedForm(knowledge, turn.form);
    // Diaporama et vidéos demandés par Kim : une panne de ces rubriques ne doit pas faire échouer la réponse.
    if (turn.present_services === true) presentation = await listPresentation(replyLanguage).catch(() => null);
    if (turn.show_videos === true && knowledge.videos.length) videos = await videosService.listPublished().catch(() => null);
  } catch (error) {
    console.error('[CHAT]', error);
    reply = FALLBACK_REPLY_BY_LANGUAGE[preferredLanguage];
    replyLanguage = preferredLanguage;
    sources = [];
    images = [];
    needsHuman = true;
    form = null;
    presentation = null;
    videos = null;
  }

  await recordExchange({ sessionId, message, reply, language: replyLanguage, sources, needsHuman });
  return { reply, language: replyLanguage, sources, images, needs_human: needsHuman, human_takeover: false, form, presentation: presentation?.length ? presentation : null, videos: videos?.length ? videos : null };
}
