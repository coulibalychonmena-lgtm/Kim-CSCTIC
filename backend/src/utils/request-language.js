import { TRANSLATION_LANGUAGES } from './domain-values.js';

/** Langue demandée par le visiteur (?lang=) ; le français (langue de saisie de l'administration) par défaut. */
export const requestedLanguage = (request) => (TRANSLATION_LANGUAGES.includes(request.query.lang) ? request.query.lang : 'fr');
