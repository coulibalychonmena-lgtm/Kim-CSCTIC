import { sendApiRequest } from './httpClient.js';

export const authService = {
  login: (email, password) => sendApiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  googleChallenge: () => sendApiRequest('/auth/google/challenge'),
  loginWithGoogle: (credential, state) => sendApiRequest('/auth/google', { method: 'POST', body: { credential, state } }),
  register: (accountData) => sendApiRequest('/auth/register', { method: 'POST', body: accountData }),
  forgotPassword: (email, language) => sendApiRequest('/auth/forgot-password', { method: 'POST', body: { email, language } }),
  resetPassword: (token, password) => sendApiRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),
  verifyEmail: (token) => sendApiRequest('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (token, lang) => sendApiRequest(`/auth/resend-verification?lang=${encodeURIComponent(lang)}`, { method: 'POST', token }),
  exportMyData: (token) => sendApiRequest('/me/export', { token }),
  deleteMyAccount: (token) => sendApiRequest('/me', { method: 'DELETE', token }),
  getProfile: (token) => sendApiRequest('/auth/me', { token }).then((responseBody) => responseBody.user),
  listMyRequests: (token, lang) => sendApiRequest(`/me/requests${lang && lang !== 'fr' ? `?lang=${encodeURIComponent(lang)}` : ''}`, { token }).then((responseBody) => responseBody.data),
};
