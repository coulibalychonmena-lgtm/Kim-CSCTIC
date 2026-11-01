import {
  ACTIVITY_CATEGORIES, PARTNERSHIP_STATUSES, PARTNERSHIP_TYPES, ROOM_AVAILABILITY_STATUSES,
  ROOM_REQUEST_STATUS, REGISTRATION_STATUS, SUPPORTED_LANGUAGES,
} from '../utils/domain-values.js';

// ---------- Public ----------
export const chatMessageSchema = {
  message: { type: 'string', required: true, max: 2000 },
  sessionId: { type: 'string', required: true, max: 64 },
  language: { type: 'string', oneOf: SUPPORTED_LANGUAGES },
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
};

export const activityRegistrationSchema = {
  lastname: { type: 'string', required: true, max: 100 },
  firstname: { type: 'string', required: true, max: 100 },
  age: { type: 'int', required: true, min: 1, max: 120 },
  email: { type: 'email', required: true },
  phone: { type: 'phone', required: true },
  activity_id: { type: 'string', required: true, max: 36 },
  current_level: { type: 'string', max: 100 },
};

export const partnershipRequestSchema = {
  organization: { type: 'string', required: true, max: 200 },
  contact_name: { type: 'string', required: true, max: 150 },
  email: { type: 'email', required: true },
  phone: { type: 'phone' },
  partnership_type: { type: 'string', required: true, oneOf: PARTNERSHIP_TYPES },
  description: { type: 'string', required: true, max: 4000 },
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
  equipment: { type: 'stringArray' },
  description: { type: 'string', max: 2000, nullable: true },
  pricing: { type: 'string', max: 500, nullable: true },
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

export const registerSchema = {
  full_name: { type: 'string', required: true, max: 150 },
  email: { type: 'email', required: true },
  phone: { type: 'phone' },
  password: { type: 'string', required: true, max: 200 },
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
