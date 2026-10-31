import { query } from '../config/snowflake.js';
import { ROOM_REQUEST_STATUS, REGISTRATION_STATUS } from '../utils/domain-values.js';

export async function getDashboardStatistics() {
  const [statisticsRow] = await query(
    `SELECT
       (SELECT COUNT(*) FROM ROOM_REQUESTS WHERE STATUS = ?) AS PENDING_ROOM_REQUESTS,
       (SELECT COUNT(*) FROM ACTIVITY_REGISTRATIONS
         WHERE DATE_TRUNC('month', SUBMITTED_AT) = DATE_TRUNC('month', CURRENT_TIMESTAMP())) AS REGISTRATIONS_THIS_MONTH,
       (SELECT COUNT(*) FROM ACTIVITY_REGISTRATIONS WHERE STATUS = ?) AS PENDING_REGISTRATIONS,
       (SELECT COUNT(*) FROM PARTNERSHIP_REQUESTS WHERE STATUS = 'Nouveau') AS NEW_PARTNERSHIPS,
       (SELECT COUNT(*) FROM CHAT_LOGS WHERE NEEDS_HUMAN = TRUE) AS FLAGGED_CHATS`,
    [ROOM_REQUEST_STATUS.PENDING, REGISTRATION_STATUS.PENDING],
  );
  return Object.fromEntries(Object.entries(statisticsRow).map(([name, count]) => [name, Number(count)]));
}
