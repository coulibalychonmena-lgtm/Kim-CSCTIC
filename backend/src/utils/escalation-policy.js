import { asksForAgent, isAffirmative } from './consent-language.js';

/**
 * Politique d'escalade vers un agent du Centre (fonction pure, testée dans tests/escalation-policy.test.js).
 *
 * RÈGLE (rapport de recommandations, P1) : on n'escalade QUE sur accord explicite de l'utilisateur :
 *   - clic sur « Parler à un agent » (intent = 'agent_request', envoyé par l'interface) ;
 *   - demande écrite d'un agent (« je veux parler à un agent », « talk to a human », « 상담원과 대화 »…) ;
 *   - « oui » à la proposition de Kim « Voulez-vous que je transmette votre question ? » (previousOfferPending) ;
 *   - le modèle déclare `user_requests_agent` ET classe le message « on_topic » (utile pour les autres langues).
 * Jamais d'escalade pour un message classé « off_topic » ou « malicious », ni une injection de prompt.
 * Garde-fous : une seule escalade active par session, plafond journalier par session et par appareil/réseau.
 *
 * Renvoie { escalate, reason, notice } ; `notice` ('already_escalated' | 'quota_exceeded') est ajouté à la réponse de Kim.
 */
export const BLOCKED_CATEGORIES = ['off_topic', 'malicious'];

export function decideEscalation({
  modelFlags = {}, intent = null, userMessage = '', previousOfferPending = false,
  activeEscalationInSession = false, escalationsTodayInSession = 0, escalationsTodayForClient = 0,
  limits = { perSessionPerDay: 3, perClientPerDay: 6 },
}) {
  const category = modelFlags.category || 'on_topic';
  if (BLOCKED_CATEGORIES.includes(category)) return { escalate: false, reason: 'blocked_category', notice: null };

  const consentGiven = intent === 'agent_request'
    || asksForAgent(userMessage)
    || (previousOfferPending && isAffirmative(userMessage))
    || (modelFlags.userRequestsAgent === true && category === 'on_topic');
  if (!consentGiven) return { escalate: false, reason: 'no_consent', notice: null };

  if (activeEscalationInSession) return { escalate: false, reason: 'already_escalated', notice: 'already_escalated' };
  if (escalationsTodayInSession >= limits.perSessionPerDay || escalationsTodayForClient >= limits.perClientPerDay) {
    return { escalate: false, reason: 'quota_exceeded', notice: 'quota_exceeded' };
  }
  const reason = intent === 'agent_request' ? 'button'
    : asksForAgent(userMessage) ? 'explicit_request'
      : (previousOfferPending && isAffirmative(userMessage)) ? 'accepted_offer' : 'model_flag';
  return { escalate: true, reason, notice: null };
}
