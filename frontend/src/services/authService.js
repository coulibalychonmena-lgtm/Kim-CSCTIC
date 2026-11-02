import { sendApiRequest } from './httpClient.js';

export const authService = {
  login: (email, password) => sendApiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  register: (accountData) => sendApiRequest('/auth/register', { method: 'POST', body: accountData }),
  getProfile: (token) => sendApiRequest('/auth/me', { token }).then((responseBody) => responseBody.user),
  listMyRequests: (token, lang) => sendApiRequest(`/me/requests${lang && lang !== 'fr' ? `?lang=${encodeURIComponent(lang)}` : ''}`, { token }).then((responseBody) => responseBody.data),
};
