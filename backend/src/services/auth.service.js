import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { USER_ROLES } from '../utils/domain-values.js';
import { createAccountToken, hashToken, isTokenUsable, passwordProblem } from '../utils/account-tokens.js';
import { buildAccountEmail } from '../utils/mail-templates.js';
import { sendMail } from './mail.service.js';
import {
  createGoogleChallenge, readGoogleState, verifyGoogleIdToken, GoogleTokenError,
} from './google-identity.js';

const scryptAsync = promisify(scrypt);
const ADMINISTRATOR_ID = 'administrator';

const digest = (value) => createHash('sha256').update(String(value)).digest();
/** Comparaison en temps constant : ne révèle ni la longueur ni le contenu du secret. */
const isSameSecret = (provided, expected) => timingSafeEqual(digest(provided), digest(expected));

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

function openSession(user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
  return { token, user };
}

/**
 * Connexion unique : l'administrateur (ADMIN_EMAIL / ADMIN_PASSWORD) ou un visiteur inscrit.
 * Le rôle d'un compte en base est toujours « Visiteur » : aucun accès admin par la base.
 */
export async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const { fullName, email: adminEmail, password: adminPassword } = env.administrator;

  if (isSameSecret(normalizedEmail, adminEmail.toLowerCase())) {
    if (!isSameSecret(password, adminPassword)) throw new AppError(401, 'Identifiants incorrects.');
    return openSession({ id: ADMINISTRATOR_ID, name: fullName, email: adminEmail, role: USER_ROLES.ADMINISTRATOR });
  }

  const [account] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE, PASSWORD_HASH, EMAIL_VERIFIED FROM USERS WHERE LOWER(EMAIL) = ?', [normalizedEmail]);
  const passwordMatches = account ? await verifyPassword(password, account.password_hash) : false;
  // Même message pour un e-mail inconnu et un mauvais mot de passe.
  if (!account || !passwordMatches) throw new AppError(401, 'Identifiants incorrects.');
  return openSession({ id: account.id, name: account.full_name, email: account.email, phone: account.phone, role: USER_ROLES.VISITOR, email_verified: account.email_verified });
}

export async function register({ full_name: fullName, email, phone, password, language = 'fr' }) {
  const normalizedEmail = email.trim().toLowerCase();
  const problem = passwordProblem(password, normalizedEmail);
  if (problem) throw new AppError(400, 'Données invalides.', { password: problem });
  if (isSameSecret(normalizedEmail, env.administrator.email.toLowerCase())) {
    throw new AppError(409, 'Un compte existe déjà avec cette adresse e-mail.', { email: 'Adresse déjà utilisée.' });
  }
  const [existing] = await query('SELECT ID FROM USERS WHERE LOWER(EMAIL) = ?', [normalizedEmail]);
  if (existing) throw new AppError(409, 'Un compte existe déjà avec cette adresse e-mail.', { email: 'Adresse déjà utilisée.' });

  const userId = generateIdentifier();
  await query(
    'INSERT INTO USERS (ID, FULL_NAME, EMAIL, PASSWORD_HASH, ROLE, PHONE, CONSENT_AT) VALUES (?, ?, ?, ?, ?, ?, NOW())',
    [userId, fullName, normalizedEmail, await hashPassword(password), USER_ROLES.VISITOR, phone || null],
  );
  // La vérification de l'adresse part en arrière-plan : une panne d'e-mail ne bloque jamais l'inscription.
  sendAccountToken(userId, normalizedEmail, 'verify_email', language).catch((error) => console.error('[MAIL] vérification :', error.message));
  return openSession({ id: userId, name: fullName, email: normalizedEmail, phone: phone || null, role: USER_ROLES.VISITOR, email_verified: false });
}

// ---------------------------------------------------------------------------
// Jetons de compte : vérification de l'e-mail, réinitialisation du mot de passe
// ---------------------------------------------------------------------------

/** Crée un jeton à usage unique (invalide les précédents du même type), puis l'envoie par e-mail. */
async function sendAccountToken(userId, email, purpose, language) {
  const { token, tokenHash, expiresAt } = createAccountToken(purpose);
  await query('DELETE FROM ACCOUNT_TOKENS WHERE USER_ID = ? AND PURPOSE = ? AND USED_AT IS NULL', [userId, purpose]);
  await query('INSERT INTO ACCOUNT_TOKENS (ID, USER_ID, PURPOSE, TOKEN_HASH, EXPIRES_AT) VALUES (?, ?, ?, ?, ?)', [generateIdentifier(), userId, purpose, tokenHash, expiresAt]);
  const path = purpose === 'reset_password' ? 'reinitialiser-mot-de-passe' : 'verification-email';
  await sendMail({ to: email, ...buildAccountEmail(purpose, language, `${env.mail.siteUrl}/${path}?token=${encodeURIComponent(token)}`) });
}

/** Réponse identique que l'adresse existe ou non : on ne révèle pas quels comptes existent. */
export async function requestPasswordReset({ email, language = 'fr' }) {
  const [account] = await query('SELECT ID, EMAIL FROM USERS WHERE LOWER(EMAIL) = ? AND PASSWORD_HASH IS NOT NULL', [email.trim().toLowerCase()]);
  if (account) await sendAccountToken(account.id, account.email, 'reset_password', language).catch((error) => console.error('[MAIL] réinitialisation :', error.message));
  return { sent: true };
}

async function consumeToken(token, purpose) {
  const [row] = await query('SELECT ID, USER_ID, EXPIRES_AT, USED_AT FROM ACCOUNT_TOKENS WHERE TOKEN_HASH = ? AND PURPOSE = ?', [hashToken(token), purpose]);
  if (!isTokenUsable(row)) throw new AppError(400, 'Lien invalide ou expiré. Demandez-en un nouveau.');
  // Marquage atomique : deux clics simultanés ne consomment pas le jeton deux fois.
  const claimed = await query('UPDATE ACCOUNT_TOKENS SET USED_AT = NOW() WHERE ID = ? AND USED_AT IS NULL RETURNING ID', [row.id]);
  if (!claimed.length) throw new AppError(400, 'Lien invalide ou expiré. Demandez-en un nouveau.');
  return row.user_id;
}

export async function resetPassword({ token, password }) {
  const [candidate] = await query(
    'SELECT account.EMAIL FROM ACCOUNT_TOKENS token JOIN USERS account ON account.ID = token.USER_ID WHERE token.TOKEN_HASH = ? AND token.PURPOSE = ?',
    [hashToken(token), 'reset_password'],
  );
  const problem = passwordProblem(password, candidate?.email);
  if (problem) throw new AppError(400, 'Données invalides.', { password: problem });
  const userId = await consumeToken(token, 'reset_password');
  await query('UPDATE USERS SET PASSWORD_HASH = ?, EMAIL_VERIFIED = TRUE WHERE ID = ?', [await hashPassword(password), userId]); // le lien reçu par e-mail prouve l'adresse
  return { reset: true };
}

export async function verifyEmail({ token }) {
  const userId = await consumeToken(token, 'verify_email');
  await query('UPDATE USERS SET EMAIL_VERIFIED = TRUE WHERE ID = ?', [userId]);
  return { verified: true };
}

export async function resendVerification(userId, language = 'fr') {
  const [account] = await query('SELECT ID, EMAIL, EMAIL_VERIFIED FROM USERS WHERE ID = ?', [userId]);
  if (!account) throw new AppError(404, 'Compte introuvable.');
  if (account.email_verified) return { already_verified: true };
  await sendAccountToken(account.id, account.email, 'verify_email', language);
  return { sent: true };
}

// ---------------------------------------------------------------------------
// Droits de la personne : accès (export) et suppression
// ---------------------------------------------------------------------------

/** Toutes les données conservées pour ce compte (droit d'accès). */
export async function exportAccountData(userId) {
  const [account] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE, EMAIL_VERIFIED, CONSENT_AT, CREATED_AT FROM USERS WHERE ID = ?', [userId]);
  if (!account) throw new AppError(404, 'Compte introuvable.');
  const requests = await listMyRequests(userId);
  return { exported_at: new Date().toISOString(), account, ...requests };
}

/** Supprime le compte (droit à l'effacement). Les demandes déjà déposées restent au Centre, détachées du compte (USER_ID → NULL). */
export async function deleteAccount(userId) {
  const [account] = await query('SELECT ID FROM USERS WHERE ID = ?', [userId]);
  if (!account) throw new AppError(404, 'Compte introuvable.');
  await query('UPDATE CHAT_LOGS SET USER_ID = NULL WHERE USER_ID = ?', [userId]); // plus de lien entre l'historique du chat et la personne
  await query('DELETE FROM USERS WHERE ID = ?', [userId]);
  return { deleted: true };
}

/** Profil enrichi (téléphone) pour pré-remplir les formulaires. */
export async function getProfile(userId) {
  const [account] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE, EMAIL_VERIFIED FROM USERS WHERE ID = ?', [userId]);
  return account || null;
}

/** Historique et suivi de toutes les demandes du compte (réservations, inscriptions, partenariats). */
export async function listMyRequests(userId) {
  const [roomRequests, registrations, partnerships] = await Promise.all([
    query(
      `SELECT request.ID, room.NAME AS ROOM_NAME, TO_CHAR(request.REQUESTED_DATE, 'YYYY-MM-DD') AS REQUESTED_DATE,
              TO_CHAR(request.START_TIME, 'HH24:MI') AS START_TIME, TO_CHAR(request.END_TIME, 'HH24:MI') AS END_TIME,
              request.ATTENDEES, request.PURPOSE, request.STATUS, request.ADMIN_COMMENT, request.CREATED_AT, request.UPDATED_AT
       FROM ROOM_REQUESTS request JOIN ROOMS room ON room.ID = request.ROOM_ID
       WHERE request.USER_ID = ? ORDER BY request.CREATED_AT DESC`, [userId]),
    query(
      `SELECT registration.ID, activity.TITLE AS ACTIVITY_TITLE, registration.FIRSTNAME, registration.LASTNAME,
              registration.CURRENT_LEVEL, registration.STATUS, registration.ADMIN_COMMENT,
              registration.SUBMITTED_AT AS CREATED_AT, registration.UPDATED_AT
       FROM ACTIVITY_REGISTRATIONS registration JOIN ACTIVITIES activity ON activity.ID = registration.ACTIVITY_ID
       WHERE registration.USER_ID = ? ORDER BY registration.SUBMITTED_AT DESC`, [userId]),
    query(
      `SELECT ID, ORGANIZATION, PARTNERSHIP_TYPE, STATUS, RECEIVED_AT AS CREATED_AT, UPDATED_AT
       FROM PARTNERSHIP_REQUESTS WHERE USER_ID = ? ORDER BY RECEIVED_AT DESC`, [userId]),
  ]);
  return { room_requests: roomRequests, registrations, partnerships };
}

// ---------------------------------------------------------------------------
// Connexion avec Google
// ---------------------------------------------------------------------------

/** Nonce + state pour le bouton Google ; `enabled` = false tant que GOOGLE_CLIENT_ID n'est pas défini. */
export function getGoogleChallenge() {
  if (!env.google.clientId) return { enabled: false };
  return { enabled: true, client_id: env.google.clientId, ...createGoogleChallenge(env.jwtSecret) };
}

/**
 * Connexion ou inscription en un clic. Le jeton est vérifié côté serveur (signature, audience, émetteur, expiration, nonce).
 * Si l'adresse e-mail vérifiée par Google correspond déjà à un compte, on rattache Google à ce compte au lieu d'en créer un autre.
 */
export async function loginWithGoogle({ credential, state }) {
  let profile;
  try {
    profile = await verifyGoogleIdToken(credential, { clientId: env.google.clientId, expectedNonce: readGoogleState(state, env.jwtSecret) });
  } catch (error) {
    if (error instanceof GoogleTokenError) throw new AppError(401, error.message);
    throw error;
  }
  // Le compte administrateur ne s'ouvre jamais par Google : uniquement ADMIN_EMAIL / ADMIN_PASSWORD.
  if (isSameSecret(profile.email, env.administrator.email.toLowerCase())) throw new AppError(403, 'Cette adresse est réservée à la connexion administrateur.');

  const [bySubject] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE FROM USERS WHERE GOOGLE_SUB = ?', [profile.sub]);
  let account = bySubject;
  if (!account) {
    const [byEmail] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE FROM USERS WHERE LOWER(EMAIL) = ?', [profile.email]);
    if (byEmail) {
      await query('UPDATE USERS SET GOOGLE_SUB = ?, EMAIL_VERIFIED = TRUE WHERE ID = ?', [profile.sub, byEmail.id]);
      account = byEmail;
    } else {
      const userId = generateIdentifier();
      await query(
        'INSERT INTO USERS (ID, FULL_NAME, EMAIL, PASSWORD_HASH, ROLE, GOOGLE_SUB, EMAIL_VERIFIED) VALUES (?, ?, ?, NULL, ?, ?, TRUE)',
        [userId, profile.name, profile.email, USER_ROLES.VISITOR, profile.sub],
      );
      account = { id: userId, full_name: profile.name, email: profile.email, phone: null };
    }
  }
  return openSession({ id: account.id, name: account.full_name, email: account.email, phone: account.phone ?? null, role: USER_ROLES.VISITOR, email_verified: true });
}
