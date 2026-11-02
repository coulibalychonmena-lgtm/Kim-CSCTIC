import { sendApiRequest } from './httpClient.js';

const extractData = (responseBody) => responseBody.data;

/** Ajoute ?lang= : le contenu saisi par l'administration (en français) est traduit automatiquement par le serveur. */
const withLanguage = (path, lang) => (lang && lang !== 'fr' ? `${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang)}` : path);

export const publicService = {
  listRooms: (lang) => sendApiRequest(withLanguage('/rooms', lang)).then(extractData),
  listActivities: (lang) => sendApiRequest(withLanguage('/activities', lang)).then(extractData),
  listOpeningHours: () => sendApiRequest('/opening-hours').then(extractData),
  listChatSuggestions: (lang) => sendApiRequest(withLanguage('/chat-suggestions', lang)).then(extractData),
  listVideos: (lang) => sendApiRequest(withLanguage('/videos', lang)).then(extractData),
  listPresentation: (language) => sendApiRequest(`/presentation?lang=${encodeURIComponent(language)}`).then(extractData),
  listEvents: (lang) => sendApiRequest(withLanguage('/events', lang)).then(extractData),
  listNews: (lang) => sendApiRequest(withLanguage('/news', lang)).then(extractData),
  getRoomAvailability: (roomId, date) =>
    sendApiRequest(`/rooms/${encodeURIComponent(roomId)}/availability?date=${encodeURIComponent(date)}`).then(extractData),
  listCenterInformation: (lang) => sendApiRequest(withLanguage('/center-information', lang)).then(extractData),
  listSiteBackgrounds: () => sendApiRequest('/site-backgrounds').then(extractData),
  submitRoomRequest: (roomRequest, token) => sendApiRequest('/rooms/request', { method: 'POST', body: roomRequest, token }).then(extractData),
  submitActivityRegistration: (registration, token) => sendApiRequest('/activities/register', { method: 'POST', body: registration, token }).then(extractData),
  submitPartnershipProposal: (proposal, token) => sendApiRequest('/partnerships', { method: 'POST', body: proposal, token }).then(extractData),
};
