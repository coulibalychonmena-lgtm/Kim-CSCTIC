export class AppError extends Error {
  constructor(status, message, details = undefined, { code, headers } = {}) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code;       // code lisible par l'interface (ex. LOGIN_REQUIRED)
    this.headers = headers; // ex. { 'Retry-After': '3600' }
  }
}

export const notFound = (request, _response, next) =>
  next(new AppError(404, `Route introuvable : ${request.method} ${request.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _request, response, _next) {
  if (error instanceof AppError) {
    if (error.headers) response.set(error.headers);
    return response.status(error.status).json({ error: { message: error.message, details: error.details, code: error.code } });
  }
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: { message: 'Corps de requête JSON invalide.' } });
  }
  if (error?.code === '23P01') {
    return response.status(409).json({ error: { message: 'Ce créneau vient d\'être pris par une autre demande. Choisissez un autre horaire.' } });
  }
  if (error?.code === '23505') {
    return response.status(409).json({ error: { message: 'Cette valeur existe déjà.' } });
  }
  console.error('[ERREUR]', error);
  return response.status(500).json({ error: { message: 'Erreur interne du serveur.' } });
}
