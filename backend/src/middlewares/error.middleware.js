export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (request, _response, next) =>
  next(new AppError(404, `Route introuvable : ${request.method} ${request.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _request, response, _next) {
  if (error instanceof AppError) {
    return response.status(error.status).json({ error: { message: error.message, details: error.details } });
  }
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: { message: 'Corps de requête JSON invalide.' } });
  }
  console.error('[ERREUR]', error);
  return response.status(500).json({ error: { message: 'Erreur interne du serveur.' } });
}
