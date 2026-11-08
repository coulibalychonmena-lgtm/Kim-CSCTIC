// Détection, sans modèle, de l'accord explicite de l'utilisateur pour l'escalade vers un agent (fonctions pures).
// Kim (le modèle) peut se tromper ou être manipulé par une injection de prompt : la décision d'escalade
// s'appuie donc d'abord sur ces règles, vérifiables et testées (tests/escalation-policy.test.js).

const normalize = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFD').replace(/\p{M}+/gu, '').normalize('NFC') // accents : « sí » → « si » ; NFC recompose le hangul décomposé par NFD
  .replace(/[’']/g, "'")
  .replace(/[^\p{L}\p{N}' ]+/gu, ' ')                  // ponctuation
  .replace(/\s+/g, ' ')
  .trim();

// Réponses courtes qui acceptent la proposition « Voulez-vous que je transmette votre question à un agent ? ».
const AFFIRMATIVE_STARTS = [
  'oui', 'ouais', 'ok', 'okay', "d'accord", 'volontiers', 'avec plaisir', 'bien sur', 'tout a fait', 'transmettez', 'svp', "s'il vous plait",
  'yes', 'yeah', 'yep', 'sure', 'please do', 'go ahead', 'of course', 'absolutely',
  'si', 'claro', 'vale', 'sim', 'com certeza',
  '네', '예', '응', '그래요', '좋아요', '좋습니다', '부탁', '맞아요',
  'نعم', '是', '好', 'はい', 'ja', 'da', 'evet',
];
const NEGATIONS = /\b(non|pas|jamais|no|not|never|nein|nao|ne\b)|아니|안 |싫|不|没|ない/u;
const MAXIMUM_AFFIRMATIVE_WORDS = 8;

/** « oui », « yes please », « 네, 부탁합니다»… : un accord bref, sans négation. Une phrase longue n'est jamais un simple accord. */
export function isAffirmative(message) {
  const text = normalize(message);
  if (!text || text.split(' ').length > MAXIMUM_AFFIRMATIVE_WORDS) return false;
  if (NEGATIONS.test(text)) return false;
  return AFFIRMATIVE_STARTS.some((start) => text === start || text.startsWith(`${start} `) || (/[^\u0000-\u007f]/.test(start) && text.startsWith(start)));
}

// Demande explicite de parler à une personne du Centre.
const AGENT_REQUEST_PATTERNS = [
  /\b(parler|parle|passe[rz]?|transmet\w*|contacter|joindre|appeler|voir|avoir)\b.{0,40}\b(agent|humain|conseiller|conseillere|responsable|personne|quelqu'un|administratif|administration)\b/,
  /\b(un|une|l')\s?(agent|humain|conseiller)\b.{0,20}\b(s'il vous plait|svp|maintenant|please)\b/,
  /\b(speak|talk|chat|connect|transfer|put me through|get me|contact|reach)\b.{0,40}\b(agent|human|person|someone|representative|staff|operator|administrator)\b/,
  /\b(hablar|contactar)\b.{0,30}\b(agente|persona|humano)\b/,
  /\b(falar|contactar|contatar)\b.{0,30}\b(agente|pessoa|humano)\b/,
  /(상담원|직원|담당자|사람).{0,12}(연결|대화|통화|말하|문의|만나)/u,
  /(연결|대화|통화|문의).{0,12}(상담원|직원|담당자)/u,
];

export function asksForAgent(message) {
  const text = normalize(message);
  return Boolean(text) && AGENT_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}
