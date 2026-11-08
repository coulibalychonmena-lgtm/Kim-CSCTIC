import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { SUPPORTED_LANGUAGES, USER_ROLES } from '../utils/domain-values.js';
import { runKimTurn } from './kim-turn.service.js';
import { decideEscalation } from '../utils/escalation-policy.js';
import { evaluateQuota, DEFAULT_QUOTA_LIMITS } from '../utils/anonymous-quota-policy.js';
import { noticeText } from '../utils/chat-notices.js';
import { recordUnansweredQuestion } from './knowledge-gaps.service.js';
import { isTakeoverActive } from './human-takeover.service.js';

const QUOTA_ERROR_CODES = { login_required: 'LOGIN_REQUIRED', client_cap: 'CLIENT_CAP', account_cap: 'ACCOUNT_CAP' };

async function loadHistory(sessionId) {
  const historyRows = await query(
    `SELECT USER_MESSAGE, KIM_RESPONSE FROM CHAT_LOGS WHERE SESSION_ID = ?
     ORDER BY CREATED_AT DESC LIMIT 10`,
    [sessionId],
  );
  return historyRows.reverse();
}

async function recordExchange(exchange) {
  const exchangeId = generateIdentifier();
  await query(
    `INSERT INTO CHAT_LOGS (ID, SESSION_ID, USER_MESSAGE, KIM_RESPONSE, DETECTED_LANGUAGE, CITED_SOURCE, NEEDS_HUMAN,
                            AGENT_OFFERED, ESCALATION_REASON, REQUEST_CATEGORY, CLIENT_HASH, DEVICE_ID, USER_ID, FROM_FAQ, RESPONSE_MS)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exchangeId, exchange.sessionId, exchange.message, exchange.reply, exchange.language,
      (exchange.sources || []).map((source) => source.url).join(' | ').slice(0, 500) || null, Boolean(exchange.needsHuman),
      Boolean(exchange.agentOffered), exchange.escalationReason || null, exchange.category || null,
      exchange.clientHash || null, exchange.deviceId || null, exchange.userId || null, Boolean(exchange.fromFaq),
      exchange.responseMs ?? null,
    ],
  );
  return exchangeId;
}

/** Compteurs d'usage lus en base : le quota vit côté serveur, jamais dans le navigateur. */
async function loadUsage({ sessionId, deviceId, clientHash, userId }) {
  const [usage] = await query(
    `SELECT
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE SESSION_ID = ? AND USER_ID IS NULL AND FROM_FAQ = FALSE
          AND CREATED_AT > NOW() - INTERVAL '24 hours') AS SESSION_COUNT,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE DEVICE_ID = ? AND USER_ID IS NULL AND FROM_FAQ = FALSE
          AND CREATED_AT > NOW() - INTERVAL '24 hours') AS DEVICE_COUNT,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE CLIENT_HASH = ? AND FROM_FAQ = FALSE
          AND CREATED_AT > NOW() - INTERVAL '1 hour') AS CLIENT_COUNT_LAST_HOUR,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE USER_ID = ? AND FROM_FAQ = FALSE
          AND CREATED_AT > NOW() - INTERVAL '1 hour') AS ACCOUNT_COUNT_LAST_HOUR`,
    [sessionId, deviceId || null, clientHash || null, userId || null],
  );
  return {
    sessionCount: Number(usage.session_count), deviceCount: Number(usage.device_count),
    clientCountLastHour: Number(usage.client_count_last_hour), accountCountLastHour: Number(usage.account_count_last_hour),
  };
}

/** Contexte de l'escalade : proposition en attente, escalade déjà active, compteurs du jour. */
async function loadEscalationContext({ sessionId, clientHash }) {
  const [previous] = await query('SELECT AGENT_OFFERED FROM CHAT_LOGS WHERE SESSION_ID = ? ORDER BY CREATED_AT DESC LIMIT 1', [sessionId]);
  const [counts] = await query(
    `SELECT
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE SESSION_ID = ? AND ESCALATION_REASON IS NOT NULL
          AND CREATED_AT > NOW() - INTERVAL '12 hours') AS ACTIVE_IN_SESSION,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE SESSION_ID = ? AND ESCALATION_REASON IS NOT NULL
          AND CREATED_AT > NOW() - INTERVAL '24 hours') AS TODAY_IN_SESSION,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE CLIENT_HASH = ? AND ESCALATION_REASON IS NOT NULL
          AND CREATED_AT > NOW() - INTERVAL '24 hours') AS TODAY_FOR_CLIENT`,
    [sessionId, sessionId, clientHash || null],
  );
  return {
    previousOfferPending: Boolean(previous?.agent_offered),
    activeEscalationInSession: Number(counts.active_in_session) > 0,
    escalationsTodayInSession: Number(counts.today_in_session),
    escalationsTodayForClient: Number(counts.today_for_client),
  };
}

export async function handleMessage({ message, sessionId, language, intent = null, deviceId = null, clientHash = null, user = null, onReplyDelta = undefined }) {
  const preferredLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
  const userId = user?.role === USER_ROLES.VISITOR ? user.sub : null;
  const identity = { sessionId, deviceId, clientHash, userId };

  // Un agent a repris la main : Kim se tait, le message est transmis à l'agent (hors quota).
  if (await isTakeoverActive(sessionId)) {
    await recordExchange({ ...identity, message, reply: null, language: preferredLanguage, needsHuman: true });
    return {
      reply: '', language: preferredLanguage, sources: [], images: [], needs_human: true, human_takeover: true, form: null, presentation: null, videos: null,
    };
  }

  // Quota d'usage : 5 questions anonymes, plafond par réseau, plafond par compte (429 + message dans la langue du visiteur).
  const quota = evaluateQuota({
    isAdministrator: user?.role === USER_ROLES.ADMINISTRATOR,
    isAuthenticated: Boolean(user),
    usage: await loadUsage(identity),
    limits: DEFAULT_QUOTA_LIMITS,
  });
  if (!quota.allowed) {
    throw new AppError(429, noticeText(quota.reason, preferredLanguage), { limit: DEFAULT_QUOTA_LIMITS.anonymousQuestions, loginRequired: quota.reason !== 'account_cap' },
      { code: QUOTA_ERROR_CODES[quota.reason], headers: quota.retryAfterSeconds ? { 'Retry-After': String(quota.retryAfterSeconds) } : undefined });
  }

  const context = await loadEscalationContext(identity);
  const startedAt = Date.now();
  let result;
  let decision;
  let technicalFailure = false;
  try {
    const history = await loadHistory(sessionId);
    result = await runKimTurn({ message, history, preferredLanguage, onReplyDelta });
    decision = decideEscalation({ modelFlags: result.modelFlags, intent, userMessage: message, ...context });
  } catch (error) {
    // Une panne technique n'alerte jamais le personnel : le visiteur peut réessayer ou demander un agent.
    console.error('[CHAT]', error);
    technicalFailure = true;
    result = {
      reply: noticeText('technical_failure', preferredLanguage), language: preferredLanguage, sources: [], images: [], form: null,
      presentation: null, videos: null, modelFlags: { agentOffer: true, category: null },
    };
    decision = { escalate: false, reason: 'technical_failure', notice: null };
  }

  const reply = decision.notice ? `${result.reply}\n\n${noticeText(decision.notice, result.language)}` : result.reply;
  const agentOffered = technicalFailure || Boolean(result.modelFlags.agentOffer);
  const messageId = await recordExchange({
    ...identity, message, reply, language: result.language, sources: result.sources, needsHuman: decision.escalate,
    agentOffered, escalationReason: decision.escalate ? decision.reason : null, category: result.modelFlags.category,
    responseMs: Date.now() - startedAt,
  });
  // Question restée sans réponse : à compléter dans la base de connaissances (hors attaques et hors-sujet).
  const category = result.modelFlags.category;
  if (!technicalFailure && (category === 'out_of_base' || (agentOffered && !['off_topic', 'malicious'].includes(category)))) {
    await recordUnansweredQuestion(message, result.language);
  }
  return {
    message_id: messageId, reply, language: result.language, sources: result.sources, images: result.images,
    needs_human: decision.escalate, agent_offer: agentOffered, human_takeover: false,
    form: result.form, presentation: result.presentation, videos: result.videos,
    anonymous_remaining: quota.remaining,
  };
}

/** Avis du visiteur sur une réponse (l'échange doit appartenir à la session). */
export async function recordFeedback({ messageId, sessionId, rating }) {
  const [exchange] = await query('SELECT ID FROM CHAT_LOGS WHERE ID = ? AND SESSION_ID = ?', [messageId, sessionId]);
  if (!exchange) throw new AppError(404, 'Réponse introuvable pour cette session.');
  await query(
    `INSERT INTO CHAT_FEEDBACK (CHAT_LOG_ID, SESSION_ID, RATING) VALUES (?, ?, ?)
     ON CONFLICT (CHAT_LOG_ID, SESSION_ID) DO UPDATE SET RATING = EXCLUDED.RATING, CREATED_AT = NOW()`,
    [messageId, sessionId, rating],
  );
  return { recorded: true };
}

/** Les 30 derniers échanges de la session, du plus ancien au plus récent (les échanges FAQ en bouton sont inclus). */
export async function loadSessionHistory(sessionId) {
  const exchanges = await query(
    `SELECT log.ID, log.USER_MESSAGE, log.KIM_RESPONSE, log.DETECTED_LANGUAGE, log.NEEDS_HUMAN, log.AGENT_OFFERED, log.CREATED_AT,
            feedback.RATING
     FROM CHAT_LOGS log LEFT JOIN CHAT_FEEDBACK feedback ON feedback.CHAT_LOG_ID = log.ID AND feedback.SESSION_ID = log.SESSION_ID
     WHERE log.SESSION_ID = ? ORDER BY log.CREATED_AT DESC LIMIT 30`,
    [sessionId],
  );
  return exchanges.reverse();
}
