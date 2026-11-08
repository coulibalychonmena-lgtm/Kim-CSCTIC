import { ADULT_AGE, guardianProblem } from '../utils/booking-rules.js';
import { query, withTransaction } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { buildUpdateAssignments } from '../utils/sql-update-builder.js';
import { REGISTRATION_STATUS } from '../utils/domain-values.js';

const withRemainingSeats = (activityRow) => ({
  ...activityRow,
  remaining_seats: activityRow.total_seats === null || activityRow.total_seats === undefined
    ? null
    : Math.max(0, Number(activityRow.total_seats) - Number(activityRow.assigned_seats || 0)),
});

// ---------------------------------------------------------------------------
// Catalogue des formations (modifiable par l'administration)
// ---------------------------------------------------------------------------

export async function listActivities() {
  const activityRows = await query(
    `SELECT ID, TITLE, CATEGORY, AGE_MIN, AGE_MAX, AGE_RANGE_LABEL, TOTAL_SEATS, ASSIGNED_SEATS,
            DESCRIPTION, SCHEDULE, DURATION, PRICE, PREREQUISITES, ENROLLMENT_CONDITIONS, IMAGE_URL
     FROM ACTIVITIES ORDER BY CATEGORY, TITLE`,
  );
  return activityRows.map(withRemainingSeats);
}

function assertAgeRangeIsCoherent(minimumAge, maximumAge) {
  if (minimumAge !== null && minimumAge !== undefined && maximumAge !== null && maximumAge !== undefined && minimumAge > maximumAge) {
    throw new AppError(422, "L'âge minimum ne peut pas dépasser l'âge maximum.");
  }
}

async function assertActivityTitleIsFree(title, activityIdToIgnore = null) {
  const [duplicate] = await query(
    'SELECT ID FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER(?) AND (?::text IS NULL OR ID <> ?)',
    [title, activityIdToIgnore, activityIdToIgnore],
  );
  if (duplicate) throw new AppError(409, `Une formation intitulée « ${title} » existe déjà.`);
}

export async function createActivity(activityData) {
  assertAgeRangeIsCoherent(activityData.age_min, activityData.age_max);
  await assertActivityTitleIsFree(activityData.title);
  const activityId = generateIdentifier();
  await query(
    `INSERT INTO ACTIVITIES
       (ID, TITLE, CATEGORY, AGE_MIN, AGE_MAX, AGE_RANGE_LABEL, TOTAL_SEATS, ASSIGNED_SEATS, DESCRIPTION, SCHEDULE, DURATION, PRICE, PREREQUISITES, ENROLLMENT_CONDITIONS, IMAGE_URL)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    [
      activityId, activityData.title, activityData.category, activityData.age_min ?? null, activityData.age_max ?? null,
      activityData.age_range_label ?? null, activityData.total_seats ?? null,
      activityData.description ?? null, activityData.schedule ?? null,
      activityData.duration ?? null, activityData.price ?? null, activityData.prerequisites ?? null,
      activityData.enrollment_conditions ?? null, activityData.image_url ?? null,
    ],
  );
  return { id: activityId, assigned_seats: 0, ...activityData };
}

export async function updateActivity(activityId, activityChanges) {
  const [existingActivity] = await query(
    'SELECT ID, AGE_MIN, AGE_MAX, ASSIGNED_SEATS FROM ACTIVITIES WHERE ID = ?',
    [activityId],
  );
  if (!existingActivity) throw new AppError(404, 'Formation introuvable.');

  const resultingMinimumAge = activityChanges.age_min !== undefined ? activityChanges.age_min : existingActivity.age_min;
  const resultingMaximumAge = activityChanges.age_max !== undefined ? activityChanges.age_max : existingActivity.age_max;
  assertAgeRangeIsCoherent(resultingMinimumAge, resultingMaximumAge);

  if (
    activityChanges.total_seats !== undefined && activityChanges.total_seats !== null
    && activityChanges.total_seats < Number(existingActivity.assigned_seats)
  ) {
    throw new AppError(
      422,
      `Le quota ne peut pas être inférieur au nombre de places déjà attribuées (${existingActivity.assigned_seats}).`,
    );
  }
  if (activityChanges.title !== undefined) await assertActivityTitleIsFree(activityChanges.title, activityId);

  const { assignments, binds } = buildUpdateAssignments(
    {
      title: 'TITLE', category: 'CATEGORY', age_min: 'AGE_MIN', age_max: 'AGE_MAX',
      age_range_label: 'AGE_RANGE_LABEL', total_seats: 'TOTAL_SEATS',
      description: 'DESCRIPTION', schedule: 'SCHEDULE', duration: 'DURATION', price: 'PRICE', prerequisites: 'PREREQUISITES',
      enrollment_conditions: 'ENROLLMENT_CONDITIONS', image_url: 'IMAGE_URL',
    },
    activityChanges,
  );
  if (!assignments.length) throw new AppError(400, 'Aucun champ à mettre à jour.');
  await query(`UPDATE ACTIVITIES SET ${assignments.join(', ')} WHERE ID = ?`, [...binds, activityId]);
  return { id: activityId, ...activityChanges };
}

/** Une formation qui a déjà reçu des pré-inscriptions ne se supprime pas : l'historique reste consultable. */
export async function deleteActivity(activityId) {
  const [existingActivity] = await query('SELECT ID, TITLE FROM ACTIVITIES WHERE ID = ?', [activityId]);
  if (!existingActivity) throw new AppError(404, 'Formation introuvable.');
  const [{ registration_count: registrationCount }] = await query(
    'SELECT COUNT(*) AS REGISTRATION_COUNT FROM ACTIVITY_REGISTRATIONS WHERE ACTIVITY_ID = ?',
    [activityId],
  );
  if (Number(registrationCount) > 0) {
    throw new AppError(
      409,
      `« ${existingActivity.title} » compte ${registrationCount} pré-inscription(s) et ne peut pas être supprimée. `
      + 'Traitez ou refusez ces pré-inscriptions avant de la retirer du catalogue.',
    );
  }
  await query('DELETE FROM ACTIVITIES WHERE ID = ?', [activityId]);
  return { id: activityId, deleted: true };
}

// ---------------------------------------------------------------------------
// Pré-inscriptions
// ---------------------------------------------------------------------------

export async function registerToActivity(registrationData, userId = null) {
  const guardianIssue = guardianProblem(registrationData);
  if (guardianIssue) throw new AppError(422, guardianIssue.message, { [guardianIssue.field]: guardianIssue.message });
  return withTransaction(async (database) => {
    // Verrou sur la formation : deux inscriptions simultanées sont traitées l'une après l'autre.
    const [activity] = await database.query(
      'SELECT ID, TITLE, AGE_MIN, AGE_MAX, TOTAL_SEATS, ASSIGNED_SEATS FROM ACTIVITIES WHERE ID = ? FOR UPDATE',
      [registrationData.activity_id],
    );
    if (!activity) throw new AppError(404, 'Formation introuvable.');
    if (activity.age_min !== null && registrationData.age < activity.age_min) {
      throw new AppError(422, `L'âge minimum requis pour « ${activity.title} » est de ${activity.age_min} ans.`, { age: `Minimum ${activity.age_min} ans.` });
    }
    if (activity.age_max !== null && registrationData.age > activity.age_max) {
      throw new AppError(422, `L'âge maximum pour « ${activity.title} » est de ${activity.age_max} ans.`, { age: `Maximum ${activity.age_max} ans.` });
    }
    const [duplicate] = await database.query(
      `SELECT ID FROM ACTIVITY_REGISTRATIONS
       WHERE ACTIVITY_ID = ? AND LOWER(EMAIL) = LOWER(?) AND LOWER(FIRSTNAME) = LOWER(?) AND LOWER(LASTNAME) = LOWER(?) AND STATUS <> ?`,
      [activity.id, registrationData.email, registrationData.firstname, registrationData.lastname, REGISTRATION_STATUS.REFUSED],
    );
    if (duplicate) throw new AppError(409, `Une pré-inscription à « ${activity.title} » existe déjà pour cette personne.`);

    const isFull = activity.total_seats !== null && Number(activity.assigned_seats) >= Number(activity.total_seats);
    const status = isFull ? REGISTRATION_STATUS.WAITLIST : REGISTRATION_STATUS.PENDING;
    const registrationId = generateIdentifier();
    await database.query(
      `INSERT INTO ACTIVITY_REGISTRATIONS
         (ID, LASTNAME, FIRSTNAME, AGE, EMAIL, PHONE, ACTIVITY_ID, CURRENT_LEVEL, STATUS, USER_ID, GUARDIAN_NAME, GUARDIAN_CONSENT, CONSENT_AT)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        registrationId, registrationData.lastname, registrationData.firstname, registrationData.age,
        registrationData.email, registrationData.phone, registrationData.activity_id,
        registrationData.current_level || null, status, userId,
        registrationData.age < ADULT_AGE ? registrationData.guardian_name : null, registrationData.age < ADULT_AGE && registrationData.guardian_consent === true,
      ],
    );
    return { id: registrationId, status, activity_title: activity.title };
  });
}

export async function listRegistrations(statusFilter) {
  return query(
    `SELECT registration.ID, registration.LASTNAME, registration.FIRSTNAME, registration.AGE, registration.EMAIL,
            registration.PHONE, registration.ACTIVITY_ID, activity.TITLE AS ACTIVITY_TITLE,
            registration.CURRENT_LEVEL, registration.STATUS, registration.ADMIN_COMMENT, registration.SUBMITTED_AT,
            activity.ENROLLMENT_CONDITIONS AS ACTIVITY_CONDITIONS, registration.GUARDIAN_NAME, registration.GUARDIAN_CONSENT
     FROM ACTIVITY_REGISTRATIONS registration JOIN ACTIVITIES activity ON activity.ID = registration.ACTIVITY_ID
     WHERE (?::text IS NULL OR registration.STATUS = ?)
     ORDER BY registration.SUBMITTED_AT DESC`,
    [statusFilter || null, statusFilter || null],
  );
}

/** Valide / refuse une pré-inscription et tient le compteur de places à jour (formation verrouillée pendant le calcul). */
export async function updateRegistrationStatus(registrationId, { status: newStatus, admin_comment: adminComment }) {
  const [registrationPreview] = await query('SELECT ACTIVITY_ID FROM ACTIVITY_REGISTRATIONS WHERE ID = ?', [registrationId]);
  if (!registrationPreview) throw new AppError(404, 'Pré-inscription introuvable.');
  if (newStatus === REGISTRATION_STATUS.REFUSED && !adminComment) {
    throw new AppError(400, 'Un message est obligatoire pour refuser une pré-inscription.');
  }
  return withTransaction(async (database) => {
    const [activity] = await database.query('SELECT ID, TOTAL_SEATS, ASSIGNED_SEATS FROM ACTIVITIES WHERE ID = ? FOR UPDATE', [registrationPreview.activity_id]);
    const [registration] = await database.query('SELECT ID, STATUS FROM ACTIVITY_REGISTRATIONS WHERE ID = ?', [registrationId]);
    const becomesConfirmed = newStatus === REGISTRATION_STATUS.CONFIRMED && registration.status !== REGISTRATION_STATUS.CONFIRMED;
    const stopsBeingConfirmed = registration.status === REGISTRATION_STATUS.CONFIRMED && newStatus !== REGISTRATION_STATUS.CONFIRMED;

    if (becomesConfirmed) {
      if (activity.total_seats !== null && Number(activity.assigned_seats) >= Number(activity.total_seats)) {
        throw new AppError(409, 'Plus aucune place disponible dans cette formation.');
      }
      await database.query('UPDATE ACTIVITIES SET ASSIGNED_SEATS = ASSIGNED_SEATS + 1 WHERE ID = ?', [activity.id]);
    } else if (stopsBeingConfirmed) {
      await database.query('UPDATE ACTIVITIES SET ASSIGNED_SEATS = GREATEST(ASSIGNED_SEATS - 1, 0) WHERE ID = ?', [activity.id]);
    }
    await database.query(
      'UPDATE ACTIVITY_REGISTRATIONS SET STATUS = ?, ADMIN_COMMENT = ?, UPDATED_AT = NOW() WHERE ID = ?',
      [newStatus, adminComment || null, registrationId],
    );
    return { id: registrationId, status: newStatus, admin_comment: adminComment || null };
  });
}
