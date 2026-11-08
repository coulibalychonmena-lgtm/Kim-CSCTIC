import { createHash, randomBytes } from 'node:crypto';

// Jetons de réinitialisation de mot de passe et de vérification d'e-mail (fonctions pures, testées).
export const TOKEN_LIFETIMES_MINUTES = { reset_password: 60, verify_email: 60 * 24 };

/** Jeton aléatoire de 256 bits (envoyé par e-mail) et son empreinte (seule valeur stockée en base). */
export function createAccountToken(purpose, now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token), expiresAt: new Date(now + TOKEN_LIFETIMES_MINUTES[purpose] * 60_000) };
}

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex');

/** Un jeton est utilisable s'il existe, n'a pas servi et n'a pas expiré. */
export const isTokenUsable = (row, now = Date.now()) => Boolean(row) && !row.used_at && new Date(row.expires_at).getTime() > now;

export const MINIMUM_PASSWORD_LENGTH = 8;
/** Règle du mot de passe, appliquée côté serveur (le navigateur ne fait qu'aider). Renvoie un message ou null. */
export function passwordProblem(password, email = '') {
  if (typeof password !== 'string' || password.length < MINIMUM_PASSWORD_LENGTH) return `${MINIMUM_PASSWORD_LENGTH} caractères minimum.`;
  if (password.length > 200) return '200 caractères maximum.';
  if (email && password.toLowerCase() === String(email).toLowerCase()) return "Le mot de passe ne doit pas être l'adresse e-mail.";
  return null;
}
