import { createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto';

/**
 * Connexion avec Google (Google Identity Services, flux « jeton d'identité »).
 * Le jeton reçu du navigateur n'est JAMAIS cru sur parole : on vérifie côté serveur
 *   - la signature (RS256) avec les clés publiques de Google (JWKS),
 *   - l'émetteur (iss), l'audience (aud = notre identifiant client), l'expiration (exp),
 *   - l'adresse e-mail vérifiée par Google (email_verified),
 *   - le nonce, lié à un « state » signé par notre serveur (anti-rejeu / anti-CSRF).
 * Autorisations demandées : openid, email, profile (et rien d'autre).
 */
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const STATE_LIFETIME_SECONDS = 600;
const CLOCK_SKEW_SECONDS = 60;
const DEFAULT_JWKS_TTL_MILLISECONDS = 3_600_000;

export class GoogleTokenError extends Error {}

const decodePart = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

let cachedKeys = null; // { keys, expiresAt }

/** Clés publiques de Google, mises en cache selon l'en-tête Cache-Control (1 h au plus par défaut). */
export async function fetchGoogleKeys(fetchImplementation = fetch, now = Date.now()) {
  if (cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.keys;
  const httpResponse = await fetchImplementation(GOOGLE_JWKS_URL);
  if (!httpResponse.ok) throw new GoogleTokenError('Clés publiques de Google indisponibles.');
  const { keys } = await httpResponse.json();
  const maxAge = Number(/max-age=(\d+)/.exec(httpResponse.headers?.get?.('cache-control') || '')?.[1]);
  cachedKeys = { keys, expiresAt: now + (Number.isFinite(maxAge) ? maxAge * 1000 : DEFAULT_JWKS_TTL_MILLISECONDS) };
  return keys;
}
export const resetGoogleKeyCache = () => { cachedKeys = null; };

/**
 * Vérifie un jeton d'identité Google et renvoie le profil.
 * @param idToken     jeton (JWT) reçu du navigateur
 * @param options     { clientId, expectedNonce, getKeys?, now? }
 */
export async function verifyGoogleIdToken(idToken, { clientId, expectedNonce, getKeys = fetchGoogleKeys, now = Date.now() }) {
  if (!clientId) throw new GoogleTokenError('Connexion Google non configurée.');
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new GoogleTokenError('Jeton Google invalide.');

  let header; let claims;
  try { header = decodePart(parts[0]); claims = decodePart(parts[1]); } catch { throw new GoogleTokenError('Jeton Google invalide.'); }
  if (header.alg !== 'RS256') throw new GoogleTokenError('Algorithme de signature refusé.');

  const keys = await getKeys();
  const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) throw new GoogleTokenError('Clé de signature inconnue.');
  const signatureIsValid = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
  if (!signatureIsValid) throw new GoogleTokenError('Signature du jeton Google invalide.');

  const nowSeconds = Math.floor(now / 1000);
  if (!GOOGLE_ISSUERS.includes(claims.iss)) throw new GoogleTokenError('Émetteur du jeton refusé.');
  if (claims.aud !== clientId) throw new GoogleTokenError('Jeton destiné à une autre application.');
  if (!Number.isFinite(claims.exp) || claims.exp + CLOCK_SKEW_SECONDS < nowSeconds) throw new GoogleTokenError('Jeton Google expiré.');
  if (Number.isFinite(claims.iat) && claims.iat - CLOCK_SKEW_SECONDS > nowSeconds) throw new GoogleTokenError('Jeton Google invalide (date).');
  if (!claims.sub || !claims.email) throw new GoogleTokenError('Profil Google incomplet.');
  if (claims.email_verified !== true && claims.email_verified !== 'true') throw new GoogleTokenError("L'adresse e-mail Google n'est pas vérifiée.");
  if (!expectedNonce || claims.nonce !== expectedNonce) throw new GoogleTokenError('Nonce invalide : connexion refusée.');

  return { sub: String(claims.sub), email: String(claims.email).toLowerCase(), name: claims.name || claims.email, picture: claims.picture || null };
}

const signState = (body, secret) => createHmac('sha256', secret).update(body).digest('base64url');

/** Nonce aléatoire + « state » : le nonce signé (HMAC) par notre serveur, valable 10 minutes. Le navigateur renvoie le state avec le jeton. */
export function createGoogleChallenge(secret, now = Date.now()) {
  const nonce = randomBytes(16).toString('hex');
  const body = Buffer.from(JSON.stringify({ purpose: 'google-login', nonce, exp: Math.floor(now / 1000) + STATE_LIFETIME_SECONDS })).toString('base64url');
  return { nonce, state: `${body}.${signState(body, secret)}` };
}

export function readGoogleState(state, secret, now = Date.now()) {
  const [body, signature] = String(state || '').split('.');
  try {
    const expected = Buffer.from(signState(body, secret));
    const provided = Buffer.from(String(signature));
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new Error('signature');
    const payload = decodePart(body);
    if (payload.purpose !== 'google-login' || !payload.nonce || payload.exp < Math.floor(now / 1000)) throw new Error('contenu');
    return payload.nonce;
  } catch {
    throw new GoogleTokenError('Session de connexion Google expirée : réessayez.');
  }
}
