// Purge des données personnelles arrivées au terme de leur durée de conservation (politique de confidentialité, section « Durées »).
//   node scripts/purge-expired-data.js            supprime
//   node scripts/purge-expired-data.js --dry-run  compte seulement
// À planifier une fois par semaine (Render → Cron Job : « npm run purge »). Durées modifiables par variables d'environnement.
import { assertEnvironmentVariablesPresent, DATABASE_VARIABLE_NAMES } from '../src/config/environment.js';

assertEnvironmentVariablesPresent(DATABASE_VARIABLE_NAMES);
const { query, closeDatabase } = await import('../src/config/database.js');

const dryRun = process.argv.includes('--dry-run');
const chatMonths = Number(process.env.RETENTION_CHAT_MONTHS || 12);
const requestMonths = Number(process.env.RETENTION_REQUESTS_MONTHS || 24);
const OPEN_STATUSES = ['En attente de validation humaine', "Liste d'attente", 'Nouveau', "En cours d'étude"];

const rules = [
  ['conversations avec Kim', 'CHAT_LOGS', 'CREATED_AT < NOW() - make_interval(months => ?)', [chatMonths]],
  ['jetons de compte expirés ou utilisés', 'ACCOUNT_TOKENS', '(EXPIRES_AT < NOW() - INTERVAL \'7 days\' OR USED_AT IS NOT NULL)', []],
  ['demandes de salle traitées', 'ROOM_REQUESTS', 'STATUS <> ALL(?::text[]) AND CREATED_AT < NOW() - make_interval(months => ?)', [OPEN_STATUSES, requestMonths]],
  ['pré-inscriptions traitées', 'ACTIVITY_REGISTRATIONS', 'STATUS <> ALL(?::text[]) AND SUBMITTED_AT < NOW() - make_interval(months => ?)', [OPEN_STATUSES, requestMonths]],
  ['propositions de partenariat traitées', 'PARTNERSHIP_REQUESTS', 'STATUS <> ALL(?::text[]) AND RECEIVED_AT < NOW() - make_interval(months => ?)', [OPEN_STATUSES, requestMonths]],
];

try {
  for (const [label, table, condition, binds] of rules) {
    if (dryRun) {
      const [{ total }] = await query(`SELECT COUNT(*) AS TOTAL FROM ${table} WHERE ${condition}`, binds);
      console.log(`${label} : ${total} ligne(s) à supprimer`);
    } else {
      const deleted = await query(`DELETE FROM ${table} WHERE ${condition} RETURNING 1`, binds);
      console.log(`${label} : ${deleted.length} ligne(s) supprimée(s)`);
    }
  }
} finally {
  await closeDatabase();
}
