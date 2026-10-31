import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { validateData } from '../middlewares/validate.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { SUPPORTED_LANGUAGES, ROOM_REQUEST_STATUS } from '../utils/domain-values.js';
import { roomRequestSchema, activityRegistrationSchema, partnershipRequestSchema } from '../validators/request-body-schemas.js';
import { buildSystemPrompt } from '../prompts/kim.prompt.js';
import { loadKnowledge, allowedSources, resolveRequestedImages } from './knowledge.service.js';
import { generateKimTurn, generateText } from './gemini.service.js';
import { createRoomRequest } from './rooms.service.js';
import { registerToActivity } from './activities.service.js';
import { createPartnership } from './partnerships.service.js';
import { isTakeoverActive } from './human-takeover.service.js';

const PENDING_VALIDATION_STATUS = ROOM_REQUEST_STATUS.PENDING;
const NEW_PARTNERSHIP_STATUS = 'Nouveau';

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

/** Valide puis enregistre la demande émise par Kim ; renvoie le récapitulatif pour l'UI. */
async function executeAction(action) {
  const { type, data = {} } = action;
  if (type === 'room_request') {
    const roomRequestData = validateData(roomRequestSchema, data);
    const created = await createRoomRequest(roomRequestData);
    return {
      kind: 'room_request', id: created.id, status: PENDING_VALIDATION_STATUS, warnings: created.warnings,
      summary: {
        room: created.room_name, date: roomRequestData.requested_date, start_time: roomRequestData.start_time,
        end_time: roomRequestData.end_time, attendees: roomRequestData.attendees, purpose: roomRequestData.purpose,
        requester: `${roomRequestData.requester_firstname} ${roomRequestData.requester_lastname}`,
      },
    };
  }
  if (type === 'activity_registration') {
    const registrationData = validateData(activityRegistrationSchema, data);
    const created = await registerToActivity(registrationData);
    return {
      kind: 'activity_registration', id: created.id, status: created.status, warnings: [],
      summary: {
        activity: created.activity_title, name: `${registrationData.firstname} ${registrationData.lastname}`,
        age: registrationData.age, level: registrationData.current_level || null,
      },
    };
  }
  if (type === 'partnership') {
    const partnershipData = validateData(partnershipRequestSchema, data);
    const created = await createPartnership(partnershipData);
    return {
      kind: 'partnership', id: created.id, status: NEW_PARTNERSHIP_STATUS, warnings: [],
      summary: { organization: partnershipData.organization, contact: partnershipData.contact_name, type: partnershipData.partnership_type },
    };
  }
  return null;
}

async function explainError(error, language) {
  const detail = error.details ? `${error.message} ${JSON.stringify(error.details)}` : error.message;
  try {
    return await generateText(
      `Tu es Kim, assistant du CSCTICAO. Explique poliment et brièvement à l'utilisateur, en langue "${language}", `
      + `que sa demande n'a PAS été enregistrée et pourquoi, puis ce qu'il doit corriger. Ne promets rien. Motif technique : ${detail}`,
    ) || detail;
  } catch { return detail; }
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
      reply: '', language: preferredLanguage, sources: [], images: [], needs_human: true, human_takeover: true, request: null,
    };
  }
  let reply;
  let replyLanguage = preferredLanguage;
  let sources = [];
  let images = [];
  let needsHuman = false;
  let createdRequest = null;

  try {
    const knowledge = await loadKnowledge();
    const history = await loadHistory(sessionId);
    const turn = await generateKimTurn({ systemInstruction: buildSystemPrompt(knowledge), history, message });

    reply = String(turn.reply || '').trim();
    replyLanguage = SUPPORTED_LANGUAGES.includes(turn.language) ? turn.language : preferredLanguage;
    needsHuman = Boolean(turn.needs_human);
    const allowedSourceLabels = allowedSources(knowledge);
    sources = (Array.isArray(turn.sources) ? turn.sources : [])
      .filter((source) => source && allowedSourceLabels.has(source.url))
      .map((source) => ({ label: allowedSourceLabels.get(source.url), url: source.url }));
    images = resolveRequestedImages(knowledge, turn.images);
    if (!reply) throw new Error('Réponse vide de Gemini');

    if (turn.action?.ready) {
      try {
        createdRequest = await executeAction(turn.action);
      } catch (error) {
        if (!(error instanceof AppError)) throw error;
        reply = await explainError(error, replyLanguage);
        sources = [];
        images = [];
      }
    }
  } catch (error) {
    console.error('[CHAT]', error);
    reply = FALLBACK_REPLY_BY_LANGUAGE[preferredLanguage];
    replyLanguage = preferredLanguage;
    sources = [];
    images = [];
    needsHuman = true;
    createdRequest = null;
  }

  await recordExchange({ sessionId, message, reply, language: replyLanguage, sources, needsHuman });
  return { reply, language: replyLanguage, sources, images, needs_human: needsHuman, human_takeover: false, request: createdRequest };
}
