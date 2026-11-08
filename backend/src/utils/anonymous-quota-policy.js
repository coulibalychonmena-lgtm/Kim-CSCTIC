/**
 * Quota d'usage du chat (fonction pure, testée dans tests/anonymous-quota-policy.test.js).
 *
 * - Visiteur anonyme : `anonymousQuestions` questions (5 par défaut) comptées côté serveur par session ET par appareil
 *   (identifiant stocké dans le navigateur, mais compté par le serveur), puis connexion obligatoire.
 * - Plafond par réseau (IP), plus large : 30 par heure par défaut. En Côte d'Ivoire, les opérateurs mobiles font partager une
 *   même IP publique à beaucoup d'abonnés : un seuil IP trop bas bloquerait des visiteurs légitimes ; la combinaison
 *   session + appareil + IP + compte est plus juste.
 * - Visiteur connecté : plafond horaire par compte. Administrateur : aucun plafond.
 */
export const DEFAULT_QUOTA_LIMITS = {
  anonymousQuestions: 5,       // par session et par appareil sur la fenêtre ci-dessous
  anonymousWindowHours: 24,
  clientPerHour: 30,           // par réseau (IP), tous visiteurs confondus
  accountPerHour: 60,          // par compte connecté
};

/**
 * @param usage { sessionCount, deviceCount, clientCountLastHour, accountCountLastHour }
 * @returns { allowed, reason: 'ok' | 'login_required' | 'client_cap' | 'account_cap', remaining, retryAfterSeconds }
 */
export function evaluateQuota({ isAdministrator = false, isAuthenticated = false, usage, limits = DEFAULT_QUOTA_LIMITS }) {
  if (isAdministrator) return { allowed: true, reason: 'ok', remaining: null, retryAfterSeconds: 0 };
  if (isAuthenticated) {
    if (usage.accountCountLastHour >= limits.accountPerHour) return { allowed: false, reason: 'account_cap', remaining: 0, retryAfterSeconds: 3600 };
    return { allowed: true, reason: 'ok', remaining: null, retryAfterSeconds: 0 };
  }
  // Le plus élevé des deux compteurs compte : ouvrir un nouvel onglet (nouvelle session) ne remet pas le compteur à zéro.
  const used = Math.max(usage.sessionCount, usage.deviceCount);
  if (used >= limits.anonymousQuestions) return { allowed: false, reason: 'login_required', remaining: 0, retryAfterSeconds: 0 };
  if (usage.clientCountLastHour >= limits.clientPerHour) return { allowed: false, reason: 'client_cap', remaining: 0, retryAfterSeconds: 3600 };
  return { allowed: true, reason: 'ok', remaining: limits.anonymousQuestions - used - 1, retryAfterSeconds: 0 };
}
