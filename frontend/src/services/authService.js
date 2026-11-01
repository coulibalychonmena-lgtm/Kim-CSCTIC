import { sendApiRequest } from './httpClient.js';

export const authService = {
  login: (email, password) => sendApiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  register: (accountData) => sendApiRequest('/auth/register', { method: 'POST', body: accountData }),
  getProfile: (token) => sendApiRequest('/auth/me', { token }).then((responseBody) => responseBody.user),
  listMyRequests: (token) => sendApiRequest('/me/requests', { token }).then((responseBody) => responseBody.data),
};
