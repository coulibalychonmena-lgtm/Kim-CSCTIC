import cors from 'cors';
import { env } from '../config/environment.js';

const rejectedOrigins = new Set();

/** Origines autorisées : FRONTEND_URL (séparées par des virgules, slash final ignoré) ou « * ». */
export const corsMiddleware = cors({
  origin(requestOrigin, callback) {
    const isAllowed = !requestOrigin
      || env.frontendUrls.includes('*')
      || env.frontendUrls.includes(requestOrigin.replace(/\/+$/, ''));
    if (!isAllowed && !rejectedOrigins.has(requestOrigin)) {
      rejectedOrigins.add(requestOrigin);
      console.warn(`[CORS] origine refusée : ${requestOrigin} — ajoutez-la à FRONTEND_URL.`);
    }
    return callback(null, isAllowed);
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
