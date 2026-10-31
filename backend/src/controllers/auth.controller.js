import * as authService from '../services/auth.service.js';

export const login = (request, response) => {
  response.json(authService.login(request.body.email, request.body.password));
};

export const getCurrentUser = (request, response) => response.json({ user: request.user });
