const LOCAL_ADDRESS_PATTERN = /localhost|127\.0\.0\.1/;

/** VITE_API_URL tolérée avec ou sans « /api/v1 », avec ou sans slash final ; http:// converti en https:// sur un site https. */
function resolveApiBaseUrl() {
  let address = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!address) return import.meta.env.PROD ? '' : 'http://localhost:4000/api/v1';
  if (!/\/api\/v\d+$/.test(address)) address += '/api/v1';
  if (typeof location !== 'undefined' && location.protocol === 'https:' && address.startsWith('http://') && !LOCAL_ADDRESS_PATTERN.test(address)) {
    address = address.replace('http://', 'https://');
  }
  return address;
}

export const API_BASE_URL = resolveApiBaseUrl();
/** Le site déployé n'est pas relié à son serveur : VITE_API_URL absent, ou resté sur l'adresse locale. */
export const API_CONFIGURATION_PROBLEM = import.meta.env.PROD && (!API_BASE_URL || LOCAL_ADDRESS_PATTERN.test(API_BASE_URL))
  ? 'config' : null;

export class ApiError extends Error {
  constructor(message, status, details, code) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code; // ex. LOGIN_REQUIRED (quota anonyme atteint)
  }
}

/** Client HTTP unique : tous les appels du frontend passent par ici. */
export async function sendApiRequest(path, { method = 'GET', body, token } = {}) {
  if (API_CONFIGURATION_PROBLEM) throw new ApiError("Le site n'est pas relié à son serveur (VITE_API_URL manquant ou incorrect).", 0);
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
      responseBody?.error?.code,
    );
  }
  return responseBody;
}
