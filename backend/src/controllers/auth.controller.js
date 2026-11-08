import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as authService from '../services/auth.service.js';
import { USER_ROLES } from '../utils/domain-values.js';
import { requestedLanguage } from '../utils/request-language.js';
import { translateRows } from '../services/translation.service.js';

export const login = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.login(request.body.email, request.body.password));
});

export const register = wrapAsyncRoute(async (request, response) => {
  response.status(201).json(await authService.register(request.body));
});

export const getCurrentUser = wrapAsyncRoute(async (request, response) => {
  const profile = request.user.role === USER_ROLES.VISITOR ? await authService.getProfile(request.user.sub) : null;
  response.json({ user: { ...request.user, phone: profile?.phone ?? null, email_verified: profile?.email_verified ?? null } });
});

export const listMyRequests = wrapAsyncRoute(async (request, response) => {
  const language = requestedLanguage(request);
  const requests = await authService.listMyRequests(request.user.sub);
  response.json({
    data: {
      room_requests: await translateRows(requests.room_requests, ['room_name', 'admin_comment'], language),
      registrations: await translateRows(requests.registrations, ['activity_title', 'admin_comment'], language),
      partnerships: requests.partnerships,
    },
  });
});

export const getGoogleChallenge = wrapAsyncRoute(async (_request, response) => {
  response.set('Cache-Control', 'no-store').json(authService.getGoogleChallenge());
});

export const loginWithGoogle = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.loginWithGoogle(request.body));
});

export const requestPasswordReset = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.requestPasswordReset(request.body));
});
export const resetPassword = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.resetPassword(request.body));
});
export const verifyEmail = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.verifyEmail(request.body));
});
export const resendVerification = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.resendVerification(request.user.sub, requestedLanguage(request)));
});
export const exportMyData = wrapAsyncRoute(async (request, response) => {
  response.set('Content-Disposition', 'attachment; filename="mes-donnees-cscticao.json"').json(await authService.exportAccountData(request.user.sub));
});
export const deleteMyAccount = wrapAsyncRoute(async (request, response) => {
  response.json(await authService.deleteAccount(request.user.sub));
});
