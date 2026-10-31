import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';

const SESSION_ID_PATTERN = /^[\w-]{1,64}$/;

function assertValidSessionId(sessionId) {
  if (!SESSION_ID_PATTERN.test(sessionId)) throw new AppError(400, 'Identifiant de conversation invalide.');
}

export async function isTakeoverActive(sessionId) {
  const [takeover] = await query('SELECT SESSION_ID FROM CHAT_TAKEOVERS WHERE SESSION_ID = ?', [sessionId]);
  return Boolean(takeover);
}

/** Un agent reprend la main : Kim cesse de répondre dans cette conversation. Sans effet si déjà reprise. */
export async function startTakeover(sessionId) {
  assertValidSessionId(sessionId);
  await query(
    'INSERT INTO CHAT_TAKEOVERS (SESSION_ID) VALUES (?) ON CONFLICT (SESSION_ID) DO NOTHING',
    [sessionId],
  );
  return { session_id: sessionId, takeover_active: true };
}

/** L'agent rend la conversation à Kim. */
export async function endTakeover(sessionId) {
  assertValidSessionId(sessionId);
  await query('DELETE FROM CHAT_TAKEOVERS WHERE SESSION_ID = ?', [sessionId]);
  return { session_id: sessionId, takeover_active: false };
}

/** Message d'un agent ; répondre vaut reprise en main. */
export async function sendHumanReply(sessionId, message) {
  await startTakeover(sessionId);
  const messageId = generateIdentifier();
  await query('INSERT INTO HUMAN_MESSAGES (ID, SESSION_ID, MESSAGE) VALUES (?, ?, ?)', [messageId, sessionId, message]);
  return { id: messageId };
}

export const listHumanMessages = (sessionId) =>
  query('SELECT ID, MESSAGE, CREATED_AT FROM HUMAN_MESSAGES WHERE SESSION_ID = ? ORDER BY CREATED_AT ASC', [sessionId]);

/** Vue du visiteur : messages des agents et état de la reprise en main. */
export async function getVisitorView(sessionId) {
  assertValidSessionId(sessionId);
  const [messages, takeoverActive] = await Promise.all([listHumanMessages(sessionId), isTakeoverActive(sessionId)]);
  return { takeover_active: takeoverActive, messages };
}
