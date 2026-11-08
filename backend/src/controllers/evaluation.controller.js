import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { SUPPORTED_LANGUAGES } from '../utils/domain-values.js';
import { runKimTurn } from '../services/kim-turn.service.js';
import { buildContextPassages, passagesForSources } from '../services/knowledge.service.js';
import { decideEscalation } from '../utils/escalation-policy.js';

/**
 * POST /api/v1/eval/chat : une question, la réponse de Kim et les passages utilisés (format RAGAS).
 * Aucune écriture : pas de CHAT_LOGS, pas d'escalade réelle, pas de quota.
 * Corps : { message, language?, history?: [{ user_message, kim_response }], contexts_mode?: 'cited' | 'all' }
 */
export const evaluateMessage = wrapAsyncRoute(async (request, response) => {
  const { message, language, history = [], intent = null, contexts_mode: contextsMode = 'cited' } = request.body;
  const preferredLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'fr';
  const startedAt = Date.now();
  const result = await runKimTurn({ message, history, preferredLanguage });
  const latencyMilliseconds = Date.now() - startedAt;
  const passages = buildContextPassages(result.knowledge);
  const { escalate } = decideEscalation({ modelFlags: result.modelFlags, intent, userMessage: message, previousOfferPending: Boolean(history.at(-1)?.agent_offered) });

  response.json({
    response: result.reply,
    language: result.language,
    sources: result.sources.map((source) => ({ label: source.label, url: source.url })),
    retrieved_contexts: contextsMode === 'all' ? passages.map((passage) => passage.text) : passagesForSources(passages, result.citedSourceKeys),
    form: result.form ? { type: result.form.type, prefill: result.form.prefill } : null,
    presentation_shown: Boolean(result.presentation),
    videos_shown: Boolean(result.videos),
    escalated: escalate,
    model_flags: result.modelFlags,
    agent_offer: result.modelFlags.agentOffer,
    latency_ms: latencyMilliseconds,
  });
});
