import { query } from '../config/database.js';
import { parseJsonValue } from '../utils/json-value-parsing.js';
import { ROOM_REQUEST_STATUS } from '../utils/domain-values.js';

const DAY_NAMES_FROM_MONDAY = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/** Charge l'état réel de la base (PostgreSQL / Supabase) pour nourrir Kim à chaque message. */
export async function loadKnowledge() {
  const [centerInformation, rooms, activities, openingHours, approvedBookings] = await Promise.all([
    query('SELECT TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL FROM CENTER_INFORMATION ORDER BY CATEGORY, TITLE'),
    query('SELECT ID, NAME, SPACE_TYPE, MAX_CAPACITY, EQUIPMENT, DESCRIPTION, PRICING, STATUS, IMAGE_URL FROM ROOMS ORDER BY NAME'),
    query(`SELECT ID, TITLE, CATEGORY, AGE_MIN, AGE_MAX, AGE_RANGE_LABEL, TOTAL_SEATS, ASSIGNED_SEATS, DESCRIPTION, SCHEDULE, ENROLLMENT_CONDITIONS, IMAGE_URL
           FROM ACTIVITIES ORDER BY CATEGORY, TITLE`),
    query(`SELECT DAY_OF_WEEK, TO_CHAR(OPEN_TIME, 'HH24:MI') AS OPEN_TIME, TO_CHAR(CLOSE_TIME, 'HH24:MI') AS CLOSE_TIME
           FROM OPENING_HOURS ORDER BY DAY_OF_WEEK`),
    query(`SELECT request.ROOM_ID, room.NAME AS ROOM_NAME, TO_CHAR(request.REQUESTED_DATE, 'YYYY-MM-DD') AS REQUESTED_DATE,
                  TO_CHAR(request.START_TIME, 'HH24:MI') AS START_TIME, TO_CHAR(request.END_TIME, 'HH24:MI') AS END_TIME
           FROM ROOM_REQUESTS request JOIN ROOMS room ON room.ID = request.ROOM_ID
           WHERE request.STATUS = ? AND request.REQUESTED_DATE >= CURRENT_DATE
           ORDER BY request.REQUESTED_DATE, request.START_TIME`, [ROOM_REQUEST_STATUS.APPROVED]),
  ]);
  return {
    centerInformation,
    rooms: rooms.map((room) => ({ ...room, equipment: parseJsonValue(room.equipment, []) })),
    activities,
    openingHours,
    approvedBookings,
  };
}

/** Texte lisible injecté dans le prompt système. Une rubrique vide est annoncée comme telle. */
export function formatKnowledge(knowledge) {
  const orFallback = (value, fallbackText = 'non renseigné') =>
    (value === null || value === undefined || value === '' ? fallbackText : value);
  const lines = [];

  lines.push('## INFORMATIONS OFFICIELLES DU CENTRE');
  if (!knowledge.centerInformation.length) lines.push("- aucune information enregistrée pour le moment");
  for (const information of knowledge.centerInformation) {
    lines.push(
      `- ${information.title} : ${information.content} `
      + `[source: ${orFallback(information.source_label, 'CSCTICAO')} | ${orFallback(information.source_url, 'n/a')}]`,
    );
  }

  lines.push('\n## SALLES ET ESPACES (à la location)');
  if (!knowledge.rooms.length) lines.push("- aucune salle enregistrée pour le moment");
  for (const room of knowledge.rooms) {
    lines.push(
      `- id=${room.id} | ${room.name} (${room.space_type}) | statut: ${room.status} | capacité max: ${orFallback(room.max_capacity)} | `
      + `équipements: ${room.equipment.length ? room.equipment.join(', ') : 'non renseignés'} | `
      + `tarif/conditions: ${orFallback(room.pricing)} | photo: ${room.image_url ? 'disponible' : 'aucune'} | ${orFallback(room.description, '')}`,
    );
  }

  lines.push('\n## FORMATIONS ET ACTIVITÉS');
  if (!knowledge.activities.length) lines.push("- aucune formation enregistrée pour le moment");
  for (const activity of knowledge.activities) {
    const remainingSeats = activity.total_seats === null
      ? 'quota non défini'
      : Math.max(0, activity.total_seats - activity.assigned_seats);
    const targetAudience = activity.age_min !== null || activity.age_max !== null
      ? `${orFallback(activity.age_min, '?')}-${orFallback(activity.age_max, '?')} ans`
      : orFallback(activity.age_range_label);
    lines.push(
      `- id=${activity.id} | ${activity.title} (${activity.category}) | public: ${targetAudience} | `
      + `places restantes: ${remainingSeats} | horaires: ${orFallback(activity.schedule)} | conditions d'inscription (niveau, adhésion…): ${orFallback(activity.enrollment_conditions, 'aucune renseignée')} | photo: ${activity.image_url ? 'disponible' : 'aucune'} | ${orFallback(activity.description, '')}`,
    );
  }

  lines.push("\n## HORAIRES D'OUVERTURE");
  if (!knowledge.openingHours.length) lines.push("- horaires non renseignés pour le moment");
  for (const day of knowledge.openingHours) {
    lines.push(`- ${DAY_NAMES_FROM_MONDAY[day.day_of_week]} : ${day.open_time}-${day.close_time}`);
  }

  lines.push('\n## CRÉNEAUX DÉJÀ VALIDÉS (indisponibles)');
  if (!knowledge.approvedBookings.length) lines.push('- aucun');
  for (const booking of knowledge.approvedBookings) {
    lines.push(`- ${booking.room_name} (id=${booking.room_id}) le ${booking.requested_date} de ${booking.start_time} à ${booking.end_time}`);
  }

  return lines.join('\n');
}

/** Sources internes citables pour les données du catalogue (identifiant → libellé affiché). */
export const INTERNAL_SOURCES = new Map([
  ['kim:salles', 'Catalogue des salles du Centre'],
  ['kim:formations', 'Catalogue des formations du Centre'],
  ['kim:horaires', "Horaires d'ouverture du Centre"],
]);

/**
 * Sources que Kim peut citer (anti-hallucination) : les adresses saisies par l'administration
 * et les identifiants internes du catalogue. Toute autre valeur est ignorée.
 */
export const allowedSources = (knowledge) =>
  new Map([
    ...INTERNAL_SOURCES,
    ...knowledge.centerInformation
      .filter((information) => information.source_url)
      .map((information) => [information.source_url, information.source_label || information.source_url]),
  ]);

const MAXIMUM_IMAGES_PER_REPLY = 4;

/**
 * Photos que Kim a demandé d'afficher. L'adresse vient toujours de la base (jamais du modèle) :
 * un identifiant inconnu ou une entrée sans photo est ignoré.
 */
export function resolveRequestedImages(knowledge, requestedImages) {
  const imagesByKey = new Map([
    ...knowledge.rooms.map((room) => [`room:${room.id}`, { title: room.name, url: room.image_url }]),
    ...knowledge.activities.map((activity) => [`activity:${activity.id}`, { title: activity.title, url: activity.image_url }]),
  ]);
  return (Array.isArray(requestedImages) ? requestedImages : [])
    .map((requested) => imagesByKey.get(`${requested?.kind}:${requested?.id}`))
    .filter((image) => image?.url)
    .slice(0, MAXIMUM_IMAGES_PER_REPLY);
}
