import { AppError } from './error.middleware.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{6,25}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEB_ADDRESS_PATTERN = /^https?:\/\/\S+$/i;

/**
 * Valide `data` selon `schema` : { champ: { type, required, nullable, max, min, oneOf } }.
 * Types : string, email, phone, url, int, date, time, stringArray.
 * Un champ `nullable` envoyé vide ou à null est conservé comme null : c'est ainsi que
 * l'administration efface une valeur (les champs absents, eux, restent inchangés).
 */
export function validateAgainstSchema(schema, data = {}) {
  const errors = {};
  const validatedData = {};
  for (const [fieldName, rule] of Object.entries(schema)) {
    let value = data[fieldName];
    if (typeof value === 'string') value = value.trim();
    const isEmpty = value === undefined || value === null || value === '';
    if (isEmpty) {
      if (rule.required) errors[fieldName] = 'Champ obligatoire.';
      else if (rule.nullable && fieldName in data) validatedData[fieldName] = null;
      continue;
    }
    let errorMessage = null;
    switch (rule.type) {
      case 'email': if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) errorMessage = 'Adresse e-mail invalide.'; break;
      case 'phone': if (typeof value !== 'string' || !PHONE_PATTERN.test(value)) errorMessage = 'Numéro de téléphone invalide.'; break;
      case 'url': if (typeof value !== 'string' || !WEB_ADDRESS_PATTERN.test(value)) errorMessage = 'Adresse web invalide (http:// ou https://).'; break;
      case 'date':
        if (typeof value !== 'string' || !DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) errorMessage = 'Date invalide (AAAA-MM-JJ).';
        break;
      case 'time': if (typeof value !== 'string' || !TIME_PATTERN.test(value)) errorMessage = 'Heure invalide (HH:MM).'; break;
      case 'int':
        value = Number(value);
        if (!Number.isInteger(value) || value < (rule.min ?? -Infinity) || value > (rule.max ?? Infinity)) {
          errorMessage = `Nombre entier attendu${rule.min !== undefined ? ` (min ${rule.min})` : ''}.`;
        }
        break;
      case 'stringArray':
        if (!Array.isArray(value) || !value.every((item) => typeof item === 'string' && item.length <= 100)) errorMessage = 'Liste de textes attendue.';
        break;
      default:
        if (typeof value !== 'string') errorMessage = 'Texte attendu.';
        else if (rule.max && value.length > rule.max) errorMessage = `${rule.max} caractères maximum.`;
    }
    if (!errorMessage && rule.oneOf && !rule.oneOf.includes(value)) errorMessage = `Valeur autorisée : ${rule.oneOf.join(', ')}.`;
    if (errorMessage) errors[fieldName] = errorMessage; else validatedData[fieldName] = value;
  }
  return { validatedData, errors };
}

export const validateBody = (schema) => (request, _response, next) => {
  const { validatedData, errors } = validateAgainstSchema(schema, request.body);
  if (Object.keys(errors).length) return next(new AppError(400, 'Données invalides.', errors));
  request.body = validatedData;
  return next();
};

/** Même validation, pour les données issues d'une action déclenchée par Kim (lève une AppError). */
export function validateData(schema, data) {
  const { validatedData, errors } = validateAgainstSchema(schema, data);
  if (Object.keys(errors).length) throw new AppError(400, 'Données invalides.', errors);
  return validatedData;
}
