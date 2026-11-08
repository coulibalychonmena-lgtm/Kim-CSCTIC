import { query } from '../config/database.js';
import { ROOM_REQUEST_STATUS, REGISTRATION_STATUS } from '../utils/domain-values.js';

import { computeQualityIndicators } from '../utils/quality-indicators.js';

export async function getDashboardStatistics() {
  const [statisticsRow] = await query(
    `SELECT
       (SELECT COUNT(*) FROM ROOM_REQUESTS WHERE STATUS = ?) AS PENDING_ROOM_REQUESTS,
       (SELECT COUNT(*) FROM ACTIVITY_REGISTRATIONS
         WHERE DATE_TRUNC('month', SUBMITTED_AT) = DATE_TRUNC('month', NOW())) AS REGISTRATIONS_THIS_MONTH,
       (SELECT COUNT(*) FROM ACTIVITY_REGISTRATIONS WHERE STATUS = ?) AS PENDING_REGISTRATIONS,
       (SELECT COUNT(*) FROM PARTNERSHIP_REQUESTS WHERE STATUS = 'Nouveau') AS NEW_PARTNERSHIPS,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE NEEDS_HUMAN = TRUE) AS FLAGGED_CHATS`,
    [ROOM_REQUEST_STATUS.PENDING, REGISTRATION_STATUS.PENDING],
  );
  return Object.fromEntries(Object.entries(statisticsRow).map(([name, count]) => [name, Number(count)]));
}

/**
 * Indicateurs de qualité de Kim sur 30 jours (complètent l'évaluation RAGAS, section 4 du rapport) :
 * taux de « je ne sais pas », taux d'escalade, satisfaction (pouces), temps de réponse (médiane et 95e centile).
 */
export async function getQualityIndicators() {
  const [row] = await query(
    `WITH recent AS (
       SELECT * FROM CHAT_LOGS WHERE CREATED_AT > NOW() - INTERVAL '30 days' AND FROM_FAQ = FALSE AND KIM_RESPONSE IS NOT NULL
     )
     SELECT
       (SELECT COUNT(*) FROM recent) AS QUESTIONS,
       (SELECT COUNT(*) FROM recent WHERE REQUEST_CATEGORY = 'out_of_base' OR AGENT_OFFERED) AS UNANSWERED,
       (SELECT COUNT(*) FROM recent WHERE ESCALATION_REASON IS NOT NULL) AS ESCALATIONS,
       (SELECT COUNT(*) FROM CHAT_FEEDBACK WHERE RATING = 1 AND CREATED_AT > NOW() - INTERVAL '30 days') AS THUMBS_UP,
       (SELECT COUNT(*) FROM CHAT_FEEDBACK WHERE RATING = -1 AND CREATED_AT > NOW() - INTERVAL '30 days') AS THUMBS_DOWN,
       (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY RESPONSE_MS) FROM recent WHERE RESPONSE_MS IS NOT NULL) AS LATENCY_P50,
       (SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY RESPONSE_MS) FROM recent WHERE RESPONSE_MS IS NOT NULL) AS LATENCY_P95`,
  );
  return computeQualityIndicators(row);
}
