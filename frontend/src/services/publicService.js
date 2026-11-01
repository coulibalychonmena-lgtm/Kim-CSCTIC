import { sendApiRequest } from './httpClient.js';

const extractData = (responseBody) => responseBody.data;

export const publicService = {
  listRooms: () => sendApiRequest('/rooms').then(extractData),
  listActivities: () => sendApiRequest('/activities').then(extractData),
  listOpeningHours: () => sendApiRequest('/opening-hours').then(extractData),
  listChatSuggestions: () => sendApiRequest('/chat-suggestions').then(extractData),
  listVideos: () => sendApiRequest('/videos').then(extractData),
  listPresentation: (language) => sendApiRequest(`/presentation?lang=${encodeURIComponent(language)}`).then(extractData),
  listEvents: () => sendApiRequest('/events').then(extractData),
  listNews: () => sendApiRequest('/news').then(extractData),
  getRoomAvailability: (roomId, date) =>
    sendApiRequest(`/rooms/${encodeURIComponent(roomId)}/availability?date=${encodeURIComponent(date)}`).then(extractData),
  listCenterInformation: () => sendApiRequest('/center-information').then(extractData),
  listSiteBackgrounds: () => sendApiRequest('/site-backgrounds').then(extractData),
  submitRoomRequest: (roomRequest, token) => sendApiRequest('/rooms/request', { method: 'POST', body: roomRequest, token }).then(extractData),
  submitActivityRegistration: (registration, token) => sendApiRequest('/activities/register', { method: 'POST', body: registration, token }).then(extractData),
  submitPartnershipProposal: (proposal, token) => sendApiRequest('/partnerships', { method: 'POST', body: proposal, token }).then(extractData),
};
