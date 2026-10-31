import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppError } from '../middlewares/error.middleware.js';
import { USER_ROLES } from '../utils/domain-values.js';

const ADMINISTRATOR_ID = 'administrator';

const digest = (value) => createHash('sha256').update(String(value)).digest();

/** Comparaison en temps constant : ne révèle ni la longueur ni le contenu du secret. */
const isSameSecret = (provided, expected) => timingSafeEqual(digest(provided), digest(expected));

/** L'administrateur est défini uniquement par ADMIN_EMAIL et ADMIN_PASSWORD (variables d'environnement). */
export function login(email, password) {
  const { fullName, email: adminEmail, password: adminPassword } = env.administrator;
  const emailMatches = isSameSecret(email.toLowerCase(), adminEmail.toLowerCase());
  const passwordMatches = isSameSecret(password, adminPassword);
  // Même message pour un e-mail inconnu et un mauvais mot de passe.
  if (!emailMatches || !passwordMatches) throw new AppError(401, 'Identifiants incorrects.');

  const user = { id: ADMINISTRATOR_ID, name: fullName, email: adminEmail, role: USER_ROLES.ADMINISTRATOR };
  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
  return { token, user };
}
