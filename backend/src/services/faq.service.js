import { query } from '../config/database.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { faqText, formatContacts, formatOpeningHours } from '../utils/faq-texts.js';
import { translateRows } from './translation.service.js';

/**
 * Réponses FAQ (horaires, contact) servies depuis la base, SANS modèle : elles ne coûtent rien et restent hors quota.
 * L'échange est tout de même journalisé (FROM_FAQ = TRUE) pour les statistiques.
 */
export async function answerFaq(topic, language, { sessionId, deviceId, clientHash, userId } = {}) {
  let reply;
  let source;
  if (topic === 'hours') {
    const openingHours = await query(`SELECT DAY_OF_WEEK, TO_CHAR(OPEN_TIME, 'HH24:MI') AS OPEN_TIME, TO_CHAR(CLOSE_TIME, 'HH24:MI') AS CLOSE_TIME FROM OPENING_HOURS ORDER BY DAY_OF_WEEK`);
    reply = formatOpeningHours(openingHours, language);
    source = { label: faqText('source_hours', language), url: 'kim:horaires' };
  } else {
    const contacts = await query("SELECT TITLE, CONTENT FROM CENTER_INFORMATION WHERE LOWER(CATEGORY) LIKE '%contact%' ORDER BY TITLE");
    reply = formatContacts(await translateRows(contacts, ['title', 'content'], language), language);
    source = contacts.length ? { label: faqText('source_contact', language), url: 'kim:contact' } : null;
  }
  if (sessionId) {
    await query(
      `INSERT INTO CHAT_LOGS (ID, SESSION_ID, USER_MESSAGE, KIM_RESPONSE, DETECTED_LANGUAGE, NEEDS_HUMAN, CLIENT_HASH, DEVICE_ID, USER_ID, FROM_FAQ)
       VALUES (?, ?, ?, ?, ?, FALSE, ?, ?, ?, TRUE)`,
      [generateIdentifier(), sessionId, `[FAQ ${topic}]`, reply, language, clientHash || null, deviceId || null, userId || null],
    ).catch((error) => console.error('[FAQ] journalisation impossible :', error.message));
  }
  return { reply, language, sources: source ? [source] : [] };
}
