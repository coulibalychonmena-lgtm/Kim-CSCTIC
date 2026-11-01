const LOCALE_BY_LANGUAGE = { fr: 'fr-FR', en: 'en-GB', ko: 'ko-KR' };
// Le Centre est à Abidjan (GMT, sans heure d'été) : toutes les dates affichées suivent ce fuseau.
const CENTER_TIME_ZONE = 'Africa/Abidjan';

export const formatDateTime = (isoDate, lang = 'fr') =>
  (isoDate ? new Date(isoDate).toLocaleString(LOCALE_BY_LANGUAGE[lang] || 'fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: CENTER_TIME_ZONE }) : '');

export const formatDay = (isoDate, lang = 'fr') =>
  (isoDate ? new Date(isoDate).toLocaleDateString(LOCALE_BY_LANGUAGE[lang] || 'fr-FR', { dateStyle: 'long', timeZone: CENTER_TIME_ZONE }) : '');

/** Valeur d'un champ « datetime-local » (heure d'Abidjan = UTC) à partir d'une date ISO. */
export const toDateTimeInputValue = (isoDate) => (isoDate ? String(isoDate).slice(0, 16) : '');
