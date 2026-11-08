# Livrable 2 — Escalade sur accord, quota anonyme, connexion Google

**Recommandations du rapport :** P1 « Escalade vers un agent déclenchée sans accord, même sur une attaque » ; P1 « Limiter l'usage anonyme, puis demander la connexion » ; P2 « Compte utilisateur — Connexion avec Google ».
**Statut : livré. Logique pure testée (22 tests backend) ; le passage réel contre Supabase, Gemini et Google reste à faire avec vos clés.**

## 2.1 Escalade uniquement sur accord explicite

**Cause du défaut.** Le prompt demandait `needs_human = true` dès que Kim ne savait pas répondre, et le serveur enregistrait tout de suite l'alerte (`CHAT_LOGS.NEEDS_HUMAN`) pendant que Kim *demandait* l'accord dans le même message : l'agent était prévenu avant que le visiteur ait répondu, y compris sur une injection de prompt.

| Élément | Fichier(s) | Détail |
|---|---|---|
| Nouveau contrat du modèle | `backend/src/prompts/kim.prompt.js` | `agent_offer` (Kim propose), `user_requests_agent` (demande ou acceptation), `request_category` (`on_topic`, `out_of_base`, `off_topic`, `malicious`). `needs_human` est supprimé |
| Politique d'escalade (pure, testée) | `backend/src/utils/escalation-policy.js`, `consent-language.js` | Escalade seulement sur : clic « Parler à un agent » (`intent: 'agent_request'`), demande écrite (FR/EN/KO/ES/PT), « oui » à la proposition de Kim, ou drapeau du modèle sur un message légitime. **Jamais** pour `off_topic` / `malicious`. Un « oui » long, négatif ou sans proposition préalable n'est pas un accord |
| Une seule escalade active par session | `chat.service.js` | Une escalade dans les 12 h bloque la suivante ; Kim répond « un agent a déjà été prévenu » |
| Quota journalier | `chat.service.js` | 3 escalades par session et 6 par réseau par 24 h, message dans la langue du visiteur |
| Panne technique | `chat.service.js` | N'alerte plus le personnel (avant : fausse promesse « transmis à un agent ») |
| Journalisation | migration `013` | `AGENT_OFFERED`, `ESCALATION_REASON`, `REQUEST_CATEGORY` |
| Interface | `ChatContext.jsx`, `MessageBubble.jsx` | Le badge « Un agent du Centre a été prévenu » n'apparaît que si le serveur a réellement escaladé. Quand Kim propose un agent, un bouton « Oui, transmettre à un agent » donne l'accord par clic. Le polling des messages d'agent ne démarre qu'après une vraie escalade |

Les 4 messages de test du rapport (question hors base, tarif inconnu, injection de prompt, question en coréen) donnent **0 escalade** : voir `backend/tests/escalation-policy.test.js`.

## 2.2 Quota anonyme, plafond par réseau, 429

| Élément | Détail |
|---|---|
| 5 questions anonymes | Comptées **côté serveur** par session **et** par appareil (24 h) : un nouvel onglet ne remet plus à zéro. L'identifiant d'appareil (`kim_device_id`) n'identifie que ; le compte est tenu en base |
| Plafond par IP | 30 questions/heure par réseau. Seuil large exprès : les opérateurs mobiles ivoiriens partagent des IP. La combinaison session + appareil + IP + compte est plus juste ; l'IP n'est jamais stockée, seulement une empreinte salée |
| Comptes connectés | Plus de quota anonyme ; plafond de 60 questions/heure par compte ; administrateur sans plafond |
| Réponse HTTP | `429` avec `error.code` (`LOGIN_REQUIRED`, `CLIENT_CAP`, `ACCOUNT_CAP`), `Retry-After` pour les plafonds horaires, message dans la langue du visiteur |
| Interface | Message + bouton « Continuer avec Google » + liens Se connecter / Créer un compte ; indicateur « Questions restantes avant connexion : n » quand il en reste 2 ou moins |
| Boutons rapides hors quota | Nouveaux types de suggestions `faq_hours` et `faq_contact` : réponse construite depuis la base, **sans modèle**, hors quota (`GET /api/v1/chat/faq/:topic`). Ils s'ajoutent dans l'administration (Suggestions du chat). La suggestion de départ « Quels sont vos horaires ? » est migrée vers `faq_hours` si elle n'a jamais été modifiée. Le dimanche s'y affiche « fermé » |
| Fichiers | `utils/anonymous-quota-policy.js`, `utils/chat-notices.js`, `utils/faq-texts.js`, `services/faq.service.js`, `chat.service.js`, `chat.controller.js`, migration `013` |

Les seuils (5, 30, 60, 3, 6) sont des constantes de `DEFAULT_QUOTA_LIMITS` et de `escalation-policy.js` : à ajuster après observation.

## 2.3 Connexion avec Google

| Point d'attention du rapport | Mise en œuvre |
|---|---|
| Garder l'inscription par e-mail | Inchangée ; le bouton Google s'ajoute au-dessus du formulaire |
| Vérifier le jeton côté serveur (signature, audience, émetteur, expiration) | `backend/src/services/google-identity.js` : signature RS256 avec les clés publiques de Google (mises en cache), `iss`, `aud` = `GOOGLE_CLIENT_ID`, `exp`, `iat`, e-mail vérifié |
| `state` et `nonce` | Le serveur émet un nonce et un `state` signé (HMAC, valable 10 min) ; le jeton Google doit contenir ce nonce. Jamais de confiance dans ce que transmet le navigateur |
| Autorisations `openid`, `email`, `profile` | Flux « jeton d'identité » de Google Identity Services : seules ces informations sont reçues |
| Rattacher au compte existant si l'e-mail vérifié est déjà inscrit | `auth.service.js` : rattachement par `GOOGLE_SUB`, sinon par e-mail vérifié ; sinon création sans mot de passe |
| Administrateur | Jamais connecté par Google (e-mail réservé) |
| Citer Google dans la politique de confidentialité | Prévu au livrable 3 |
| Kakao (public coréen) | Non fait : « dans un second temps » dans le rapport |

Fichiers : `google-identity.js`, `auth.service.js`, `auth.controller.js`, routes `GET /auth/google/challenge` et `POST /auth/google`, `frontend/src/components/GoogleSignInButton.jsx`, `AuthContext.jsx`, `AccountPage.jsx`. Migration `013` : mot de passe facultatif, `GOOGLE_SUB`, `EMAIL_VERIFIED`.
Tests : 7 tests dans `backend/tests/google-identity.test.js` (signature falsifiée, mauvais algorithme, mauvaise audience, jeton expiré, e-mail non vérifié, nonce rejoué, state falsifié ou expiré).

## Ce que vous devez faire

1. Exécuter `npm run migrate` (migration `013`).
2. Créer un ID client OAuth « Application Web » dans Google Cloud, y déclarer l'adresse de `kim-web` comme origine JavaScript autorisée, puis renseigner `GOOGLE_CLIENT_ID` sur `kim-api`. Sans cette variable, le bouton est masqué.
3. Dans l'administration, ajouter si souhaité les boutons « Horaires » (`faq_hours`) et « Coordonnées » (`faq_contact`).
4. Relancer l'évaluation : `aucune_escalade_a_tort` doit passer à 100 %.

## Limites

- Le nonce/state est sans état côté serveur : un jeton volé reste rejouable pendant sa courte durée de vie (10 min).
- Le quota anonyme repose sur l'identifiant d'appareil stocké dans le navigateur : quelqu'un de déterminé peut le vider, mais le plafond par réseau et le coût limité d'une session suffisent pour le but visé.
