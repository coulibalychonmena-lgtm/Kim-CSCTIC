const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Client HTTP unique : tous les appels du frontend passent par ici. */
export async function sendApiRequest(path, { method = 'GET', body, token } = {}) {
  const isFileUpload = body instanceof FormData;
  let httpResponse;
  try {
    httpResponse = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body && !isFileUpload ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body && !isFileUpload ? JSON.stringify(body) : body,
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  }
  const responseBody = await httpResponse.json().catch(() => ({}));
  if (!httpResponse.ok) {
    if (httpResponse.status === 401 && token) window.dispatchEvent(new Event('kim:unauthorized'));
    throw new ApiError(
      responseBody?.error?.message || `Erreur ${httpResponse.status}`,
      httpResponse.status,
      responseBody?.error?.details,
    );
  }
  return responseBody;
}
