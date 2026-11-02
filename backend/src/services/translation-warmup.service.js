import { publicLoaders } from './public-content.service.js';

const WARM_UP_LANGUAGES = ['en', 'ko'];
const DEBOUNCE_MILLISECONDS = 8000;
let timer = null;

/** Traduit à l'avance (en, ko) tout le contenu public : le premier visiteur d'une langue n'attend donc pas la traduction. */
export async function warmUpTranslations() {
  for (const language of WARM_UP_LANGUAGES) {
    for (const loadPublicContent of publicLoaders) {
      try { await loadPublicContent(language); } catch (error) { console.error('[TRADUCTION] préchauffage :', error.message); }
    }
  }
}

/** À appeler après chaque modification de l'administration ; regroupe les enregistrements rapprochés. */
export function scheduleTranslationWarmUp(delayMilliseconds = DEBOUNCE_MILLISECONDS) {
  clearTimeout(timer);
  timer = setTimeout(() => { warmUpTranslations().catch(() => {}); }, delayMilliseconds);
  timer.unref?.();
}
