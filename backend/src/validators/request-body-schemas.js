import {
  ACTIVITY_CATEGORIES, PARTNERSHIP_STATUSES, PARTNERSHIP_TYPES, ROOM_AVAILABILITY_STATUSES,
  ROOM_REQUEST_STATUS, REGISTRATION_STATUS, SUPPORTED_LANGUAGES,
} from '../utils/domain-values.js';

// ---------- Public ----------
export const chatMessageSchema = {
  message: { type: 'string', required: true, max: 2000 },
  sessionId: { type: 'string', required: true, max: 64 },
  language: { type: 'string', oneOf: SUPPORTED_LANGUAGES },
  intent: { type: 'string', oneOf: ['agent_request'] },   // clic sur « Parler à un agent » : accord explicite
  deviceId: { type: 'string', max: 64 },                   // identifiant d'appareil (compté côté serveur pour le quota)
};

export const evaluationMessageSchema = {
  message: { type: 'string', required: true, max: 2000 },
  language: { type: 'string', oneOf: SUPPORTED_LANGUAGES },
  history: { type: 'chatHistory' },
  intent: { type: 'string', oneOf: ['agent_request'] },
  contexts_mode: { type: 'string', oneOf: ['cited', 'all'] },
};

export const roomRequestSchema = {
  requester_lastname: { type: 'string', required: true, max: 100 },
  requester_firstname: { type: 'string', required: true, max: 100 },
  email: { type: 'email', required: true },
  phone: { type: 'phone', required: true },
  room_id: { type: 'string', required: true, max: 36 },
  requested_date: { type: 'date', required: true },
  start_time: { type: 'time', required: true },
  end_time: { type: 'time', required: true },
  attendees: { type: 'int', required: true, min: 1, max: 100000 },
  extra_equipment: { type: 'stringArray' },
  purpose: { type: 'string', required: true, max: 1000 },
  consent: { type: 'boolean', required: true, mustBeTrue: true },   // consentement au traitement des données (loi n° 2013-450)
};

export const activityRegistrationSchema = {
  lastname: { type: 'string', required: true, max: 100 },
  firstname: { type: 'string', required: true, max: 100 },
  age: { type: 'int', required: true, min: 1, max: 120 },
  email: { type: 'email', required: true },
  phone: { type: 'phone', required: true },
  activity_id: { type: 'string', required: true, max: 36 },
  current_level: { type: 'string', max: 100 },
  guardian_name: { type: 'string', max: 150 },          // obligatoire si le candidat a moins de 18 ans (vérifié par le service)
  guardian_consent: { type: 'boolean' },
  consent: { type: 'boolean', required: true, mustBeTrue: true },   // consentement au traitement des données (loi n° 2013-450)
};

export const partnershipRequestSchema = {
  organization: { type: 'string', required: true, max: 200 },
  contact_name: { type: 'string', required: true, max: 150 },
  email: { type: 'email', required: true },
  phone: { type: 'phone' },
  partnership_type: { type: 'string', required: true, oneOf: PARTNERSHIP_TYPES },
  description: { type: 'string', required: true, max: 4000 },
  consent: { type: 'boolean', required: true, mustBeTrue: true },   // consentement au traitement des données (loi n° 2013-450)
};

// ---------- Administration : authentification et traitement des demandes ----------
export const loginSchema = {
  email: { type: 'email', required: true },
  password: { type: 'string', required: true, max: 200 },
};

export const roomRequestStatusSchema = {
  status: { type: 'string', required: true, oneOf: Object.values(ROOM_REQUEST_STATUS) },
  admin_comment: { type: 'string', max: 1000 },
};

export const activityRegistrationStatusSchema = {
  status: { type: 'string', required: true, oneOf: Object.values(REGISTRATION_STATUS) },
  admin_comment: { type: 'string', max: 1000 },
};

export const humanReplySchema = {
  message: { type: 'string', required: true, max: 2000 },
};

export const partnershipRequestStatusSchema = {
  status: { type: 'string', required: true, oneOf: PARTNERSHIP_STATUSES },
};

// ---------- Administration : données du Centre modifiables sans toucher au code ----------
const roomFields = (isCreation) => ({
  name: { type: 'string', required: isCreation, max: 150 },
  space_type: { type: 'string', required: isCreation, max: 80 },
  max_capacity: { type: 'int', min: 1, max: 100000, nullable: true },
  surface_m2: { type: 'number', min: 1, max: 1000000, nullable: true },
  equipment: { type: 'stringArray' },
  description: { type: 'string', max: 2000, nullable: true },
  pricing: { type: 'string', max: 500, nullable: true },
  conditions: { type: 'string', max: 2000, nullable: true },
  status: { type: 'string', oneOf: Object.values(ROOM_AVAILABILITY_STATUSES) },
  image_url: { type: 'url', max: 500, nullable: true },
});
export const roomCreationSchema = roomFields(true);
export const roomModificationSchema = roomFields(false);

const activityFields = (isCreation) => ({
  title: { type: 'string', required: isCreation, max: 200 },
  category: { type: 'string', required: isCreation, oneOf: ACTIVITY_CATEGORIES },
  age_min: { type: 'int', min: 0, max: 120, nullable: true },
  age_max: { type: 'int', min: 0, max: 120, nullable: true },
  age_range_label: { type: 'string', max: 80, nullable: true },
  total_seats: { type: 'int', min: 0, max: 100000, nullable: true },
  description: { type: 'string', max: 4000, nullable: true },
  schedule: { type: 'string', max: 500, nullable: true },
  duration: { type: 'string', max: 100, nullable: true },
  price: { type: 'string', max: 100, nullable: true },
  prerequisites: { type: 'string', max: 1000, nullable: true },
  enrollment_conditions: { type: 'string', max: 1000, nullable: true },
  image_url: { type: 'url', max: 500, nullable: true },
});
export const activityCreationSchema = activityFields(true);
export const activityModificationSchema = activityFields(false);

const centerInformationFields = (isCreation) => ({
  category: { type: 'string', required: isCreation, max: 40 },
  title: { type: 'string', required: isCreation, max: 200 },
  content: { type: 'string', required: isCreation, max: 4000 },
  source_label: { type: 'string', max: 200, nullable: true },
  source_url: { type: 'url', max: 500, nullable: true },
});
export const centerInformationCreationSchema = centerInformationFields(true);
export const centerInformationModificationSchema = centerInformationFields(false);

export const openingDaySchema = {
  day_of_week: { type: 'int', required: true, min: 1, max: 7 },
  open_time: { type: 'time', required: true },
  close_time: { type: 'time', required: true },
};

export const siteBackgroundSchema = {
  image_url: { type: 'url', max: 500, nullable: true },
};

export const chatFeedbackSchema = {
  messageId: { type: 'string', required: true, max: 64 },
  sessionId: { type: 'string', required: true, max: 64 },
  rating: { type: 'int', required: true, min: -1, max: 1 },
};

export const unansweredStatusSchema = {
  status: { type: 'string', required: true, oneOf: ['À compléter', 'Traité'] },
};

export const googleLoginSchema = {
  credential: { type: 'string', required: true, max: 4000 },
  state: { type: 'string', required: true, max: 1000 },
};

export const registerSchema = {
  full_name: { type: 'string', required: true, max: 150 },
  email: { type: 'email', required: true },
  phone: { type: 'phone' },
  password: { type: 'string', required: true, max: 200 },
  consent: { type: 'boolean', required: true, mustBeTrue: true },   // consentement au traitement des données (loi n° 2013-450)
  language: { type: 'string', oneOf: SUPPORTED_LANGUAGES },
};

export const forgotPasswordSchema = {
  email: { type: 'email', required: true },
  language: { type: 'string', oneOf: SUPPORTED_LANGUAGES },
};

export const resetPasswordSchema = {
  token: { type: 'string', required: true, max: 200 },
  password: { type: 'string', required: true, max: 200 },
};

export const verifyEmailSchema = {
  token: { type: 'string', required: true, max: 200 },
};

const eventFields = (isCreation) => ({
  title: { type: 'string', required: isCreation, max: 200 },
  description: { type: 'string', max: 4000, nullable: true },
  location: { type: 'string', max: 200, nullable: true },
  starts_at: { type: 'datetime', required: isCreation },
  ends_at: { type: 'datetime', nullable: true },
  image_url: { type: 'url', max: 500, nullable: true },
  is_published: { type: 'boolean' },
});
export const eventCreationSchema = eventFields(true);
export const eventModificationSchema = eventFields(false);

const newsFields = (isCreation) => ({
  title: { type: 'string', required: isCreation, max: 200 },
  summary: { type: 'string', max: 500, nullable: true },
  content: { type: 'string', required: isCreation, max: 8000 },
  image_url: { type: 'url', max: 500, nullable: true },
  published_at: { type: 'datetime' },
  is_published: { type: 'boolean' },
});
export const newsCreationSchema = newsFields(true);
export const newsModificationSchema = newsFields(false);

const SLIDE_ACTIONS = ['reserve', 'register', 'contact', 'partner', 'link', 'none'];
const slideFields = (isCreation) => ({
  title: { type: 'string', required: isCreation, max: 200 },
  image_url: { type: 'url', max: 500, nullable: true },
  admin_text: { type: 'string', required: isCreation, max: 2000, nullable: true },
  additive: { type: 'string', max: 1000, nullable: true },
  action_type: { type: 'string', max: 20, oneOf: SLIDE_ACTIONS },
  action_label: { type: 'string', max: 80, nullable: true },
  action_url: { type: 'url', max: 500, nullable: true },
  sort_order: { type: 'int', min: 0, max: 100000 },
  is_published: { type: 'boolean' },
});
export const slideCreationSchema = slideFields(true);
export const slideModificationSchema = slideFields(false);

const videoFields = (isCreation) => ({
  title: { type: 'string', required: isCreation, max: 200 },
  description: { type: 'string', max: 2000, nullable: true },
  video_url: { type: 'url', required: isCreation, max: 500 },
  sort_order: { type: 'int', min: 0, max: 100000 },
  is_published: { type: 'boolean' },
});
export const videoCreationSchema = videoFields(true);
export const videoModificationSchema = videoFields(false);

const SUGGESTION_ACTIONS = ['message', 'presentation', 'videos', 'form_room', 'form_register', 'form_partner', 'agent', 'faq_hours', 'faq_contact'];
const suggestionFields = (isCreation) => ({
  label: { type: 'string', required: isCreation, max: 120 },
  label_en: { type: 'string', max: 120, nullable: true },
  label_ko: { type: 'string', max: 120, nullable: true },
  message: { type: 'string', max: 500, nullable: true },
  action_type: { type: 'string', max: 20, required: isCreation, oneOf: SUGGESTION_ACTIONS },
  sort_order: { type: 'int', min: 0, max: 100000 },
  is_published: { type: 'boolean' },
});
export const suggestionCreationSchema = suggestionFields(true);
export const suggestionModificationSchema = suggestionFields(false);

export const mediaDescriptionSchema = {
  image_url: { type: 'url', max: 500, nullable: true },
  video_url: { type: 'url', max: 500, nullable: true },
  title: { type: 'string', max: 200, nullable: true },
  kind: { type: 'string', max: 20, oneOf: ['room', 'activity', 'event', 'news', 'video', 'slide'] },
};
