import { timingSafeEqual, createHash } from 'node:crypto';
import { env } from '../config/environment.js';
import { AppError } from './error.middleware.js';

const digest = (value) => createHash('sha256').update(String(value)).digest();

/**
 * Protège le mode évaluation : sans EVAL_API_KEY dans l'environnement, la route n'existe pas (404).
 * Avec la variable, l'appelant doit envoyer l'en-tête « x-eval-key ».
 */
export function evaluationOnly(request, _response, next) {
  if (!env.evaluation.apiKey) return next(new AppError(404, 'Introuvable.'));
  const provided = request.get('x-eval-key') || '';
  if (!timingSafeEqual(digest(provided), digest(env.evaluation.apiKey))) return next(new AppError(401, 'Clé d\'évaluation invalide.'));
  return next();
}
