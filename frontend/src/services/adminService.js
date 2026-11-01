import { sendApiRequest } from './httpClient.js';

const extractData = (responseBody) => responseBody.data;
const statusQuery = (status) => (status ? `?status=${encodeURIComponent(status)}` : '');

const authorized = (token, options = {}) => ({ ...options, token });

const crudFor = (resource) => ({
  list: (token) => sendApiRequest(`/admin/${resource}`, authorized(token)).then(extractData),
  create: (token, data) => sendApiRequest(`/admin/${resource}`, authorized(token, { method: 'POST', body: data })).then(extractData),
  update: (token, id, changes) => sendApiRequest(`/admin/${resource}/${id}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),
  remove: (token, id) => sendApiRequest(`/admin/${resource}/${id}`, authorized(token, { method: 'DELETE' })).then(extractData),
});

export const adminService = {
  describeMedia: (token, payload) => sendApiRequest('/admin/describe-media', authorized(token, { method: 'POST', body: payload })).then((responseBody) => responseBody.data.description),
  events: crudFor('events'),
  videos: crudFor('videos'),
  suggestions: crudFor('chat-suggestions'),
  presentations: {
    ...crudFor('presentations'),
    regenerate: (token, id) => sendApiRequest(`/admin/presentations/${id}/regenerate`, authorized(token, { method: 'POST' })).then(extractData),
  },
  news: crudFor('news'),
  getStatistics: (token) => sendApiRequest('/admin/stats', authorized(token)).then(extractData),

  // --- Traitement des demandes ---
  listRoomRequests: (token, status) => sendApiRequest(`/admin/rooms/requests${statusQuery(status)}`, authorized(token)).then(extractData),
  updateRoomRequest: (token, requestId, changes) =>
    sendApiRequest(`/admin/rooms/requests/${requestId}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),

  listRegistrations: (token, status) => sendApiRequest(`/admin/activities/registrations${statusQuery(status)}`, authorized(token)).then(extractData),
  updateRegistration: (token, registrationId, changes) =>
    sendApiRequest(`/admin/activities/registrations/${registrationId}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),

  listPartnerships: (token, status) => sendApiRequest(`/admin/partnerships${statusQuery(status)}`, authorized(token)).then(extractData),
  updatePartnership: (token, partnershipId, status) =>
    sendApiRequest(`/admin/partnerships/${partnershipId}`, authorized(token, { method: 'PATCH', body: { status } })).then(extractData),

  listFlaggedChats: (token) => sendApiRequest('/admin/chats/flagged', authorized(token)).then(extractData),
  getChatSession: (token, sessionId) =>
    sendApiRequest(`/admin/chats/session/${encodeURIComponent(sessionId)}`, authorized(token)).then(extractData),

  uploadImage: (token, imageFile) => {
    const imageForm = new FormData();
    imageForm.append('image', imageFile);
    return sendApiRequest('/admin/images', authorized(token, { method: 'POST', body: imageForm })).then(extractData);
  },

  startTakeover: (token, sessionId) =>
    sendApiRequest(`/admin/chats/session/${encodeURIComponent(sessionId)}/takeover`, authorized(token, { method: 'POST' })).then(extractData),
  endTakeover: (token, sessionId) =>
    sendApiRequest(`/admin/chats/session/${encodeURIComponent(sessionId)}/takeover`, authorized(token, { method: 'DELETE' })).then(extractData),
  replyToVisitor: (token, sessionId, message) =>
    sendApiRequest(`/admin/chats/session/${encodeURIComponent(sessionId)}/reply`, authorized(token, { method: 'POST', body: { message } })).then(extractData),

  // --- Gestion des données du Centre ---
  listRooms: () => sendApiRequest('/rooms').then(extractData),
  createRoom: (token, roomData) => sendApiRequest('/admin/rooms', authorized(token, { method: 'POST', body: roomData })).then(extractData),
  updateRoom: (token, roomId, changes) => sendApiRequest(`/admin/rooms/${roomId}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),
  deleteRoom: (token, roomId) => sendApiRequest(`/admin/rooms/${roomId}`, authorized(token, { method: 'DELETE' })).then(extractData),

  listActivities: () => sendApiRequest('/activities').then(extractData),
  createActivity: (token, activityData) => sendApiRequest('/admin/activities', authorized(token, { method: 'POST', body: activityData })).then(extractData),
  updateActivity: (token, activityId, changes) =>
    sendApiRequest(`/admin/activities/${activityId}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),
  deleteActivity: (token, activityId) => sendApiRequest(`/admin/activities/${activityId}`, authorized(token, { method: 'DELETE' })).then(extractData),

  listCenterInformation: (token) => sendApiRequest('/admin/center-information', authorized(token)).then(extractData),
  createCenterInformation: (token, informationData) =>
    sendApiRequest('/admin/center-information', authorized(token, { method: 'POST', body: informationData })).then(extractData),
  updateCenterInformation: (token, informationId, changes) =>
    sendApiRequest(`/admin/center-information/${informationId}`, authorized(token, { method: 'PATCH', body: changes })).then(extractData),
  deleteCenterInformation: (token, informationId) =>
    sendApiRequest(`/admin/center-information/${informationId}`, authorized(token, { method: 'DELETE' })).then(extractData),

  setSiteBackground: (token, slot, imageUrl) =>
    sendApiRequest(`/admin/site-backgrounds/${encodeURIComponent(slot)}`, authorized(token, { method: 'PUT', body: { image_url: imageUrl } })).then(extractData),

  listOpeningHours: () => sendApiRequest('/opening-hours').then(extractData),
  replaceOpeningHours: (token, openDays) =>
    sendApiRequest('/admin/opening-hours', authorized(token, { method: 'PUT', body: { days: openDays } })).then(extractData),
};
