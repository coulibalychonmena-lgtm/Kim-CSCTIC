import cors from 'cors';
import { env } from '../config/environment.js';

const rejectedOrigins = new Set();
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const RENDER_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

/**
 * Origines autorisées : FRONTEND_URL (séparées par des virgules, slash final ignoré), « * », les sites *.onrender.com
 * et le poste local. L'API n'utilise ni cookie ni session navigateur (jeton envoyé dans l'en-tête Authorization) :
 * ouvrir l'accès aux sites Render ne donne accès à aucune donnée protégée.
 */
export const corsMiddleware = cors({
  origin(requestOrigin, callback) {
    const origin = requestOrigin ? requestOrigin.replace(/\/+$/, '') : '';
    const isAllowed = !origin
      || env.frontendUrls.includes('*')
      || env.frontendUrls.includes(origin)
      || RENDER_ORIGIN_PATTERN.test(origin)
      || LOCAL_ORIGIN_PATTERN.test(origin);
    if (!isAllowed && !rejectedOrigins.has(origin)) {
      rejectedOrigins.add(origin);
      console.warn(`[CORS] origine refusée : ${origin} — ajoutez-la à FRONTEND_URL.`);
    }
    return callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
