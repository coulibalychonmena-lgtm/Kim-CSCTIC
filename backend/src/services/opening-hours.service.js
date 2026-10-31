import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { validateData } from '../middlewares/validate.middleware.js';
import { openingDaySchema } from '../validators/request-body-schemas.js';

export const listOpeningHours = () =>
  query(
    `SELECT DAY_OF_WEEK, TO_CHAR(OPEN_TIME, 'HH24:MI') AS OPEN_TIME, TO_CHAR(CLOSE_TIME, 'HH24:MI') AS CLOSE_TIME
     FROM OPENING_HOURS ORDER BY DAY_OF_WEEK`,
  );

/**
 * Remplace l'ensemble des horaires : les jours absents de la liste sont considérés
 * comme des jours de fermeture. Toute la liste est validée avant la moindre écriture.
 */
export async function replaceOpeningHours(openDays) {
  if (!Array.isArray(openDays)) throw new AppError(400, 'Une liste de jours est attendue.');
  const validatedDays = openDays.map((openDay) => validateData(openingDaySchema, openDay));

  const seenDays = new Set();
  for (const day of validatedDays) {
    if (seenDays.has(day.day_of_week)) throw new AppError(400, 'Un jour ne peut apparaître qu’une seule fois.');
    seenDays.add(day.day_of_week);
    if (day.close_time <= day.open_time) {
      throw new AppError(400, "L'heure de fermeture doit être postérieure à l'heure d'ouverture.");
    }
  }

  await query('DELETE FROM OPENING_HOURS');
  for (const day of validatedDays) {
    await query(
      'INSERT INTO OPENING_HOURS (DAY_OF_WEEK, OPEN_TIME, CLOSE_TIME) VALUES (?, ?::time, ?::time)',
      [day.day_of_week, day.open_time, day.close_time],
    );
  }
  return listOpeningHours();
}
