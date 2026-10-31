import cors from 'cors';
import { env } from '../config/environment.js';

export const corsMiddleware = cors({
  origin(requestOrigin, callback) {
    if (!requestOrigin || env.frontendUrls.includes(requestOrigin)) return callback(null, true);
    return callback(new Error(`Origine non autorisée par CORS : ${requestOrigin}`));
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
