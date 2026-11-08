// Règles métier des formulaires, partagées par le serveur et testées (le navigateur applique les mêmes règles pour aider la saisie).

export const ADULT_AGE = 18;

/** Un candidat mineur exige le nom et l'accord d'un parent ou tuteur. Renvoie { field, message } ou null. */
export function guardianProblem({ age, guardian_name: guardianName, guardian_consent: guardianConsent }) {
  if (age >= ADULT_AGE) return null;
  if (!String(guardianName || '').trim()) return { field: 'guardian_name', message: "Nom du parent ou tuteur obligatoire pour un candidat mineur." };
  if (guardianConsent !== true) return { field: 'guardian_consent', message: "L'accord d'un parent ou tuteur est obligatoire pour un candidat mineur." };
  return null;
}

/**
 * Un créneau doit tenir dans les horaires d'ouverture du jour. `openingDay` = { open_time, close_time } ou null
 * (jour fermé) ; `anyHoursConfigured` = false tant que l'administration n'a saisi aucun horaire (on n'affirme alors rien).
 */
export function slotProblem({ openingDay, anyHoursConfigured, startTime, endTime }) {
  if (!anyHoursConfigured) return null;
  if (!openingDay) return { field: 'requested_date', message: 'Le Centre est fermé ce jour-là selon ses horaires officiels.' };
  if (startTime < openingDay.open_time || endTime > openingDay.close_time) {
    return { field: 'start_time', message: `Horaire hors des heures d'ouverture (${openingDay.open_time}–${openingDay.close_time} ce jour-là).` };
  }
  return null;
}

/** Jour de la semaine ISO (1 = lundi … 7 = dimanche) d'une date AAAA-MM-JJ. */
export const isoDayOfWeek = (isoDate) => new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7;
