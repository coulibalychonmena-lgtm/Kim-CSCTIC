import { TRANSLATION_LANGUAGES } from '../utils/domain-values.js';
import { buildSystemPrompt } from '../prompts/kim.prompt.js';
import {
  loadKnowledge, allowedSources, resolveRequestedImages, resolveRequestedForm,
} from './knowledge.service.js';
import { generateKimTurn } from './gemini.service.js';
import { listPresentation } from './presentation.service.js';
import { translateRows } from './translation.service.js';
import { videosService } from './entries.service.js';

/**
 * Un tour de Kim, SANS effet de bord : aucune écriture en base, aucune escalade.
 * Partagé par le chat (chat.service.js) et par le mode évaluation (eval.controller.js),
 * pour que l'évaluation mesure exactement ce que voient les visiteurs.
 *
 * `history` : échanges précédents [{ user_message, kim_response }].
 */
export async function runKimTurn({ message, history = [], preferredLanguage = 'fr', knowledge = null, onReplyDelta = undefined }) {
  const loadedKnowledge = knowledge ?? await loadKnowledge();
  const turn = await generateKimTurn({ systemInstruction: buildSystemPrompt(loadedKnowledge), history, message, onReplyDelta });

  const reply = String(turn.reply || '').trim();
  if (!reply) throw new Error('Réponse vide de Gemini');
  // Kim répond dans la langue de la question (quelle que soit la langue de l'interface).
  const language = TRANSLATION_LANGUAGES.includes(turn.language) ? turn.language : preferredLanguage;

  const allowedSourceLabels = allowedSources(loadedKnowledge);
  const citedSources = (Array.isArray(turn.sources) ? turn.sources : [])
    .filter((source) => source && allowedSourceLabels.has(source.url))
    .map((source) => ({ label: allowedSourceLabels.get(source.url), url: source.url }));
  const sources = await translateRows(citedSources, ['label'], language);
  const images = await translateRows(resolveRequestedImages(loadedKnowledge, turn.images), ['title'], language);
  const form = resolveRequestedForm(loadedKnowledge, turn.form);

  // Diaporama et vidéos demandés par Kim : une panne de ces rubriques ne doit pas faire échouer la réponse.
  const presentation = turn.present_services === true ? await listPresentation(language).catch(() => null) : null;
  const videos = turn.show_videos === true && loadedKnowledge.videos.length
    ? await videosService.listPublished().catch(() => null)
    : null;

  return {
    reply,
    language,
    sources,
    citedSourceKeys: citedSources.map((source) => source.url),
    images,
    form,
    presentation: presentation?.length ? presentation : null,
    videos: videos?.length ? videos : null,
    // Indicateurs bruts du modèle : la politique d'escalade (escalation-policy.js) en tire la décision.
    modelFlags: {
      needsHuman: Boolean(turn.needs_human),
      agentOffer: Boolean(turn.agent_offer),
      userRequestsAgent: Boolean(turn.user_requests_agent),
      category: typeof turn.request_category === 'string' ? turn.request_category : null,
    },
    knowledge: loadedKnowledge,
  };
}
