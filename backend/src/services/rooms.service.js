import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { parseJsonValue } from '../utils/json-value-parsing.js';
import { buildUpdateAssignments } from '../utils/sql-update-builder.js';
import { ROOM_AVAILABILITY_STATUSES, ROOM_REQUEST_STATUS } from '../utils/domain-values.js';

const toRoom = (roomRow) => ({ ...roomRow, equipment: parseJsonValue(roomRow.equipment, []) });

// ---------------------------------------------------------------------------
// Catalogue des salles (modifiable par l'administration)
// ---------------------------------------------------------------------------

export async function listRooms() {
  const roomRows = await query(
    `SELECT ID, NAME, SPACE_TYPE, MAX_CAPACITY, EQUIPMENT, DESCRIPTION, PRICING, STATUS, IMAGE_URL
     FROM ROOMS ORDER BY NAME`,
  );
  return roomRows.map(toRoom);
}

async function assertRoomNameIsFree(name, roomIdToIgnore = null) {
  const [duplicate] = await query(
    'SELECT ID FROM ROOMS WHERE LOWER(NAME) = LOWER(?) AND (?::text IS NULL OR ID <> ?)',
    [name, roomIdToIgnore, roomIdToIgnore],
  );
  if (duplicate) throw new AppError(409, `Une salle nommée « ${name} » existe déjà.`);
}

export async function createRoom(roomData) {
  await assertRoomNameIsFree(roomData.name);
  const roomId = generateIdentifier();
  await query(
    `INSERT INTO ROOMS (ID, NAME, SPACE_TYPE, MAX_CAPACITY, EQUIPMENT, DESCRIPTION, PRICING, STATUS, IMAGE_URL)
     VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
    [
      roomId, roomData.name, roomData.space_type, roomData.max_capacity ?? null,
      JSON.stringify(roomData.equipment ?? []), roomData.description ?? null, roomData.pricing ?? null,
      roomData.status ?? ROOM_AVAILABILITY_STATUSES.AVAILABLE, roomData.image_url ?? null,
    ],
  );
  return { id: roomId, ...roomData };
}

export async function updateRoom(roomId, roomChanges) {
  const [existingRoom] = await query('SELECT ID FROM ROOMS WHERE ID = ?', [roomId]);
  if (!existingRoom) throw new AppError(404, 'Salle introuvable.');
  if (roomChanges.name !== undefined) await assertRoomNameIsFree(roomChanges.name, roomId);

  const { assignments, binds } = buildUpdateAssignments(
    {
      name: 'NAME', space_type: 'SPACE_TYPE', max_capacity: 'MAX_CAPACITY', equipment: 'EQUIPMENT',
      description: 'DESCRIPTION', pricing: 'PRICING', status: 'STATUS', image_url: 'IMAGE_URL',
    },
    roomChanges,
    { arrayFields: ['equipment'] },
  );
  if (!assignments.length) throw new AppError(400, 'Aucun champ à mettre à jour.');
  await query(`UPDATE ROOMS SET ${assignments.join(', ')} WHERE ID = ?`, [...binds, roomId]);
  return { id: roomId, ...roomChanges };
}

/** Une salle qui a déjà reçu des demandes ne se supprime pas : on la met « En maintenance ». */
export async function deleteRoom(roomId) {
  const [existingRoom] = await query('SELECT ID, NAME FROM ROOMS WHERE ID = ?', [roomId]);
  if (!existingRoom) throw new AppError(404, 'Salle introuvable.');
  const [{ request_count: requestCount }] = await query(
    'SELECT COUNT(*) AS REQUEST_COUNT FROM ROOM_REQUESTS WHERE ROOM_ID = ?',
    [roomId],
  );
  if (Number(requestCount) > 0) {
    throw new AppError(
      409,
      `« ${existingRoom.name} » est liée à ${requestCount} demande(s) de réservation et ne peut pas être supprimée. `
      + 'Passez-la en « En maintenance » pour la retirer des réservations.',
    );
  }
  await query('DELETE FROM ROOMS WHERE ID = ?', [roomId]);
  return { id: roomId, deleted: true };
}

// ---------------------------------------------------------------------------
// Demandes de réservation
// ---------------------------------------------------------------------------

/** Avertissements non bloquants : l'administration tranche. */
async function buildOpeningHoursWarnings(requestedDate, startTime, endTime) {
  const dayOfWeek = new Date(`${requestedDate}T00:00:00Z`).getUTCDay() || 7; // 1 = lundi ... 7 = dimanche
  const [openingHours] = await query(
    `SELECT TO_CHAR(OPEN_TIME, 'HH24:MI') AS OPEN_TIME, TO_CHAR(CLOSE_TIME, 'HH24:MI') AS CLOSE_TIME
     FROM OPENING_HOURS WHERE DAY_OF_WEEK = ?`,
    [dayOfWeek],
  );
  if (!openingHours) {
    const [{ configured_days: configuredDays }] = await query('SELECT COUNT(*) AS CONFIGURED_DAYS FROM OPENING_HOURS');
    // Tant que l'administration n'a saisi aucun horaire, on n'affirme pas que le Centre est fermé.
    if (Number(configuredDays) === 0) return [];
    return [{ code: 'CLOSED_DAY', message: 'Le Centre est fermé ce jour-là selon ses horaires officiels.' }];
  }
  if (startTime < openingHours.open_time || endTime > openingHours.close_time) {
    return [{
      code: 'OUTSIDE_HOURS',
      message: `Horaire hors des heures d'ouverture officielles (${openingHours.open_time}-${openingHours.close_time} ce jour-là).`,
    }];
  }
  return [];
}

async function hasApprovedOverlap(roomId, requestedDate, startTime, endTime, requestIdToIgnore = null) {
  const [{ overlap_count: overlapCount }] = await query(
    `SELECT COUNT(*) AS OVERLAP_COUNT FROM ROOM_REQUESTS
     WHERE ROOM_ID = ? AND REQUESTED_DATE = ?::date AND STATUS = ?
       AND START_TIME < ?::time AND END_TIME > ?::time
       AND (?::text IS NULL OR ID <> ?)`,
    [roomId, requestedDate, ROOM_REQUEST_STATUS.APPROVED, endTime, startTime, requestIdToIgnore, requestIdToIgnore],
  );
  return Number(overlapCount) > 0;
}

export async function createRoomRequest(requestData) {
  const [room] = await query('SELECT ID, NAME, MAX_CAPACITY, STATUS FROM ROOMS WHERE ID = ?', [requestData.room_id]);
  if (!room) throw new AppError(404, 'Salle introuvable.');
  if (room.status !== ROOM_AVAILABILITY_STATUSES.AVAILABLE) {
    throw new AppError(409, `La salle « ${room.name} » est actuellement en maintenance.`);
  }
  if (requestData.end_time <= requestData.start_time) {
    throw new AppError(400, "L'heure de fin doit être postérieure à l'heure de début.");
  }
  if (requestData.requested_date < new Date().toISOString().slice(0, 10)) {
    throw new AppError(400, 'La date souhaitée est déjà passée.');
  }
  if (room.max_capacity && requestData.attendees > room.max_capacity) {
    throw new AppError(422, `La capacité maximale de « ${room.name} » est de ${room.max_capacity} personnes.`);
  }
  if (await hasApprovedOverlap(requestData.room_id, requestData.requested_date, requestData.start_time, requestData.end_time)) {
    throw new AppError(409, `« ${room.name} » est déjà réservée sur ce créneau.`);
  }
  const warnings = await buildOpeningHoursWarnings(requestData.requested_date, requestData.start_time, requestData.end_time);

  const requestId = generateIdentifier();
  await query(
    `INSERT INTO ROOM_REQUESTS
       (ID, REQUESTER_LASTNAME, REQUESTER_FIRSTNAME, EMAIL, PHONE, ROOM_ID, REQUESTED_DATE,
        START_TIME, END_TIME, ATTENDEES, EXTRA_EQUIPMENT, PURPOSE, STATUS)
     VALUES (?, ?, ?, ?, ?, ?, ?::date, ?::time, ?::time, ?, ?::jsonb, ?, ?)`,
    [
      requestId, requestData.requester_lastname, requestData.requester_firstname, requestData.email, requestData.phone,
      requestData.room_id, requestData.requested_date, requestData.start_time, requestData.end_time, requestData.attendees,
      JSON.stringify(requestData.extra_equipment || []), requestData.purpose, ROOM_REQUEST_STATUS.PENDING,
    ],
  );
  return { id: requestId, status: ROOM_REQUEST_STATUS.PENDING, room_name: room.name, warnings };
}

export async function listRoomRequests(statusFilter) {
  const requestRows = await query(
    `SELECT request.ID, request.REQUESTER_LASTNAME, request.REQUESTER_FIRSTNAME, request.EMAIL, request.PHONE,
            request.ROOM_ID, room.NAME AS ROOM_NAME, TO_CHAR(request.REQUESTED_DATE, 'YYYY-MM-DD') AS REQUESTED_DATE,
            TO_CHAR(request.START_TIME, 'HH24:MI') AS START_TIME, TO_CHAR(request.END_TIME, 'HH24:MI') AS END_TIME,
            request.ATTENDEES, request.EXTRA_EQUIPMENT, request.PURPOSE, request.STATUS,
            request.ADMIN_COMMENT, request.CREATED_AT
     FROM ROOM_REQUESTS request JOIN ROOMS room ON room.ID = request.ROOM_ID
     WHERE (?::text IS NULL OR request.STATUS = ?)
     ORDER BY request.CREATED_AT DESC`,
    [statusFilter || null, statusFilter || null],
  );
  return requestRows.map((requestRow) => ({
    ...requestRow,
    extra_equipment: parseJsonValue(requestRow.extra_equipment, []),
  }));
}

export async function updateRoomRequestStatus(requestId, { status, admin_comment: adminComment }) {
  const [existingRequest] = await query(
    `SELECT ID, ROOM_ID, TO_CHAR(REQUESTED_DATE, 'YYYY-MM-DD') AS REQUESTED_DATE,
            TO_CHAR(START_TIME, 'HH24:MI') AS START_TIME, TO_CHAR(END_TIME, 'HH24:MI') AS END_TIME
     FROM ROOM_REQUESTS WHERE ID = ?`,
    [requestId],
  );
  if (!existingRequest) throw new AppError(404, 'Demande introuvable.');
  if (status === ROOM_REQUEST_STATUS.REFUSED && !adminComment) {
    throw new AppError(400, 'Un motif est obligatoire pour refuser une demande.');
  }
  if (
    status === ROOM_REQUEST_STATUS.APPROVED
    && await hasApprovedOverlap(
      existingRequest.room_id, existingRequest.requested_date,
      existingRequest.start_time, existingRequest.end_time, requestId,
    )
  ) {
    throw new AppError(409, 'Une autre réservation validée occupe déjà ce créneau.');
  }
  await query('UPDATE ROOM_REQUESTS SET STATUS = ?, ADMIN_COMMENT = ? WHERE ID = ?', [status, adminComment || null, requestId]);
  return { id: requestId, status, admin_comment: adminComment || null };
}
