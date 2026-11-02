export const USER_ROLES = {
  ADMINISTRATOR: 'Administrateur',
  CENTER_AGENT: 'Agent du Centre',
  VISITOR: 'Visiteur',
};

export const ROOM_AVAILABILITY_STATUSES = {
  AVAILABLE: 'Disponible',
  UNDER_MAINTENANCE: 'En maintenance',
};

export const ROOM_REQUEST_STATUS = {
  PENDING: 'En attente de validation humaine',
  APPROVED: 'Validée',
  REFUSED: 'Refusée',
};

export const REGISTRATION_STATUS = {
  PENDING: 'En attente de validation humaine',
  CONFIRMED: 'Confirmée',
  WAITLIST: "Liste d'attente",
  REFUSED: 'Refusée',
};

export const PARTNERSHIP_STATUSES = ['Nouveau', "En cours d'étude", 'Traité', 'Archivé'];
export const PARTNERSHIP_TYPES = ['Technique', 'Financier', 'Événementiel', 'Pédagogique'];
export const ACTIVITY_CATEGORIES = ['Sport', 'TIC', 'Langue', 'Culture'];
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ko']; // langues de l'interface
// Langues dans lesquelles Kim répond et dans lesquelles le contenu de l'administration est traduit automatiquement.
export const TRANSLATION_LANGUAGES = [
  'fr', 'en', 'ko', 'es', 'pt', 'ar', 'zh', 'ja', 'de', 'it', 'ru', 'tr', 'nl', 'hi', 'sw', 'pl', 'vi', 'id', 'ha', 'wo', 'bm',
];
export const SITE_BACKGROUND_SLOTS = ['hero', 'services', 'evenements'];
