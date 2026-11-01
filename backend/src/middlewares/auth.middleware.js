import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppError } from './error.middleware.js';
import { USER_ROLES } from '../utils/domain-values.js';

export function authenticate(request, _response, next) {
  const authorizationHeader = request.headers.authorization || '';
  const token = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (!token) return next(new AppError(401, 'Authentification requise.'));
  try {
    request.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return next(new AppError(401, 'Session expirée ou invalide.'));
  }
}

/** Identifie le visiteur connecté s'il y en a un ; sans jeton valide, la requête reste anonyme. */
export function optionalAuthenticate(request, _response, next) {
  const authorizationHeader = request.headers.authorization || '';
  const token = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (token) {
    try { request.user = jwt.verify(token, env.jwtSecret); } catch { /* jeton invalide : requête anonyme */ }
  }
  return next();
}

/** Identifiant du compte visiteur à rattacher à une demande (null si anonyme ou administrateur). */
export const visitorIdOf = (request) => (request.user?.role === USER_ROLES.VISITOR ? request.user.sub : null);

export const requireRole = (...allowedRoles) => (request, _response, next) =>
  allowedRoles.includes(request.user?.role) ? next() : next(new AppError(403, 'Accès refusé.'));

/** Espace d'administration : réservé à l'administrateur défini dans l'environnement. */
export const adminOnly = [authenticate, requireRole(USER_ROLES.ADMINISTRATOR)];
