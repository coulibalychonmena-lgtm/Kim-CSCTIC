import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as authService from '../services/auth.service.js';
import { USER_ROLES } from '../utils/domain-values.js';

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
  response.json({ data: await authService.listMyRequests(request.user.sub) });
});
