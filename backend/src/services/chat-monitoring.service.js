import { query } from '../config/snowflake.js';
import { listHumanMessages, isTakeoverActive } from './human-takeover.service.js';

const CHAT_LOG_COLUMNS = 'ID, SESSION_ID, USER_MESSAGE, KIM_RESPONSE, DETECTED_LANGUAGE, CITED_SOURCE, NEEDS_HUMAN, CREATED_AT';

export const listFlaggedChats = () =>
  query(`SELECT ${CHAT_LOG_COLUMNS} FROM CHAT_LOGS WHERE NEEDS_HUMAN = TRUE ORDER BY CREATED_AT DESC LIMIT 200`);

/** Conversation complète (visiteur, Kim, agent) classée par heure, avec l'état de la reprise en main. */
export async function getChatSession(sessionId) {
  const [chatLogs, humanMessages, takeoverActive] = await Promise.all([
    query(`SELECT ${CHAT_LOG_COLUMNS} FROM CHAT_LOGS WHERE SESSION_ID = ? ORDER BY CREATED_AT ASC`, [sessionId]),
    listHumanMessages(sessionId),
    isTakeoverActive(sessionId),
  ]);
  const timeline = [
    ...chatLogs.flatMap((chatLog) => [
      { id: `${chatLog.id}-user`, role: 'user', text: chatLog.user_message, created_at: chatLog.created_at },
      ...(chatLog.kim_response
        ? [{ id: `${chatLog.id}-kim`, role: 'kim', text: chatLog.kim_response, created_at: chatLog.created_at }]
        : []),
    ]),
    ...humanMessages.map((humanMessage) => ({
      id: humanMessage.id, role: 'agent', text: humanMessage.message, created_at: humanMessage.created_at,
    })),
  ].sort((first, second) => new Date(first.created_at) - new Date(second.created_at));
  return { timeline, takeover_active: takeoverActive };
}
