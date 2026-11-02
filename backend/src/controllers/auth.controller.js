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
  response.json({ user: { ...request.user, phone: profile?.phone ?? null } });
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
