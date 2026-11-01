import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { generateIdentifier } from '../utils/identifier-generation.js';
import { USER_ROLES } from '../utils/domain-values.js';

const scryptAsync = promisify(scrypt);
const ADMINISTRATOR_ID = 'administrator';
const MINIMUM_PASSWORD_LENGTH = 8;

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

  const [account] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE, PASSWORD_HASH FROM USERS WHERE LOWER(EMAIL) = ?', [normalizedEmail]);
  const passwordMatches = account ? await verifyPassword(password, account.password_hash) : false;
  // Même message pour un e-mail inconnu et un mauvais mot de passe.
  if (!account || !passwordMatches) throw new AppError(401, 'Identifiants incorrects.');
  return openSession({ id: account.id, name: account.full_name, email: account.email, phone: account.phone, role: USER_ROLES.VISITOR });
}

export async function register({ full_name: fullName, email, phone, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new AppError(400, 'Données invalides.', { password: `${MINIMUM_PASSWORD_LENGTH} caractères minimum.` });
  }
  if (isSameSecret(normalizedEmail, env.administrator.email.toLowerCase())) {
    throw new AppError(409, 'Un compte existe déjà avec cette adresse e-mail.', { email: 'Adresse déjà utilisée.' });
  }
  const [existing] = await query('SELECT ID FROM USERS WHERE LOWER(EMAIL) = ?', [normalizedEmail]);
  if (existing) throw new AppError(409, 'Un compte existe déjà avec cette adresse e-mail.', { email: 'Adresse déjà utilisée.' });

  const userId = generateIdentifier();
  await query(
    'INSERT INTO USERS (ID, FULL_NAME, EMAIL, PASSWORD_HASH, ROLE, PHONE) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, fullName, normalizedEmail, await hashPassword(password), USER_ROLES.VISITOR, phone || null],
  );
  return openSession({ id: userId, name: fullName, email: normalizedEmail, phone: phone || null, role: USER_ROLES.VISITOR });
}

/** Profil enrichi (téléphone) pour pré-remplir les formulaires. */
export async function getProfile(userId) {
  const [account] = await query('SELECT ID, FULL_NAME, EMAIL, PHONE FROM USERS WHERE ID = ?', [userId]);
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
