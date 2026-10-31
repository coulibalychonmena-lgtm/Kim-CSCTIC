import { sendApiRequest } from './httpClient.js';

const extractData = (responseBody) => responseBody.data;

export const publicService = {
  listRooms: () => sendApiRequest('/rooms').then(extractData),
  listActivities: () => sendApiRequest('/activities').then(extractData),
  listCenterInformation: () => sendApiRequest('/center-information').then(extractData),
  listSiteBackgrounds: () => sendApiRequest('/site-backgrounds').then(extractData),
  submitRoomRequest: (roomRequest) => sendApiRequest('/rooms/request', { method: 'POST', body: roomRequest }).then(extractData),
  submitActivityRegistration: (registration) => sendApiRequest('/activities/register', { method: 'POST', body: registration }).then(extractData),
  submitPartnershipProposal: (proposal) => sendApiRequest('/partnerships', { method: 'POST', body: proposal }).then(extractData),
};
