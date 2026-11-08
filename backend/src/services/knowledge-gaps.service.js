import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { analyzeCatalogQuality, questionKey } from '../utils/catalog-quality.js';
import * as roomsService from './rooms.service.js';
import * as activitiesService from './activities.service.js';

const OPEN_STATUS = 'À compléter';
export const GAP_STATUSES = [OPEN_STATUS, 'Traité'];

/**
 * Journalise une question restée sans réponse : les doublons sont regroupés (clé normalisée) et comptés,
 * pour que l'équipe complète chaque semaine les contenus les plus demandés. Ne lève jamais d'erreur.
 */
export async function recordUnansweredQuestion(question, language) {
  const key = questionKey(question);
  if (key.length < 3) return;
  await query(
    `INSERT INTO UNANSWERED_QUESTIONS (QUESTION_KEY, QUESTION, LANGUAGE) VALUES (?, ?, ?)
     ON CONFLICT (QUESTION_KEY) DO UPDATE
       SET OCCURRENCES = UNANSWERED_QUESTIONS.OCCURRENCES + 1, LAST_SEEN = NOW(), QUESTION = EXCLUDED.QUESTION,
           STATUS = CASE WHEN UNANSWERED_QUESTIONS.STATUS = 'Traité' THEN 'À compléter' ELSE UNANSWERED_QUESTIONS.STATUS END`,
    [key, String(question).slice(0, 2000), language || null],
  ).catch((error) => console.error('[LACUNES] journalisation impossible :', error.message));
}

export const listUnansweredQuestions = (status) =>
  query(
    `SELECT ID, QUESTION, LANGUAGE, OCCURRENCES, STATUS, FIRST_SEEN, LAST_SEEN FROM UNANSWERED_QUESTIONS
     WHERE (?::text IS NULL OR STATUS = ?) ORDER BY (STATUS = 'Traité'), OCCURRENCES DESC, LAST_SEEN DESC LIMIT 500`,
    [status || null, status || null],
  );

export async function updateUnansweredStatus(identifier, status) {
  const updated = await query('UPDATE UNANSWERED_QUESTIONS SET STATUS = ? WHERE ID = ? RETURNING ID', [status, identifier]);
  if (!updated.length) throw new AppError(404, 'Question introuvable.');
  return { id: identifier, status };
}

/** Constats de qualité du catalogue : fiches incomplètes, photos partagées, doublons probables, types utilisés. */
export async function catalogQualityReport() {
  const [rooms, activities] = await Promise.all([roomsService.listRooms(), activitiesService.listActivities()]);
  return analyzeCatalogQuality(rooms, activities);
}
