# Livrable 5 — Performance, expérience et finitions

**Recommandations du rapport :** P2 « Latence et appels réseau » ; P2 « Conversation perdue au rechargement » ; P2 « Chat sur mobile » ; P3 « Qualité et suivi dans le temps » (Markdown, pouce haut/bas, indicateurs de production) ; P3 « Finitions » (images).
**Statut : livré. Tests : 40 backend, 8 frontend (SSE, Markdown, images), 9 évaluation. La syntaxe de tout le frontend est vérifiée avec esbuild ; l'interface n'a pas pu être lancée dans un navigateur ici (pas de `npm install`) : à contrôler visuellement.**

## 5.1 Latence et appels réseau

| Constat | Correction |
|---|---|
| Réponses d'un bloc en 2,7 à 8,4 s, sans affichage progressif | **Streaming SSE** : `POST /api/v1/chat/stream`. La réponse s'affiche mot à mot (curseur clignotant), puis le texte final du serveur la remplace (mention d'agent, avis…). Le modèle est appelé en flux (`generateContentStream`) et un extracteur incrémental (`utils/json-reply-stream.js`, 4 tests : découpage arbitraire, `\uXXXX`, coréen) isole le champ `reply` du JSON. Les refus avant génération (quota 429) restent de vraies erreurs HTTP. `POST /chat/message` est conservé |
| `/human-messages` interrogé toutes les 6 s dès l'ouverture, même sans escalade (19 appels en 2 min) | Le sondage ne démarre **qu'après une escalade réelle** (la cause principale, la fausse escalade, a disparu au livrable 2). Il se **ralentit** (6 s → 30 s) tant qu'il n'y a rien de nouveau et se **suspend quand l'onglet est masqué** |
| Serveur Render gratuit endormi (30 s ou plus) | `.github/workflows/keepalive.yml` (ping toutes les 10 min de 5 h à 21 h, variable de dépôt `KIM_API_HEALTH_URL` = `…/api/v1/health`) ; commentaire dans `render.yaml`. **Vraie solution avant l'ouverture au public : une offre Render payante** |
| Latence non mesurée | `CHAT_LOGS.RESPONSE_MS` (migration `016`) ; médiane et p95 sur 30 jours dans le tableau de bord ; cible p95 < 5 s reprise dans l'évaluation |

## 5.2 Conversation et interface

| Constat | Correction |
|---|---|
| Conversation perdue après navigation/rechargement alors que le serveur garde le contexte | `GET /chat/session/:id/history` + relecture à l'ouverture (`ChatContext.jsx`). Bouton **« Nouvelle conversation »** (nouvelle session, fil vide) |
| Markdown non rendu (« -Du lundi… ») | `utils/markdown.js` + `Markdown.jsx` : paragraphes, listes à puces et numérotées, gras, italique, code, liens https. **Aucun HTML brut** n'est interprété et les liens `javascript:`/`data:` restent du texte (5 tests, dont la liste du rapport). Pas de `dangerouslySetInnerHTML` |
| Chat sur mobile : en-tête de 180 px, cadre de 440 px | Sous 640 px : en-tête compact (logo réduit, sous-titre masqué), chat à `100dvh − 9,5 rem`, marges réduites |
| Pas de retour utilisateur | **Pouce haut / bas** sous chaque réponse (`CHAT_FEEDBACK`, un avis par réponse et par session, modifiable), accessible (boutons à `aria-pressed`) |

## 5.3 Suivi de la qualité en production

Tableau de bord administrateur, bloc « Qualité de Kim — 30 derniers jours » : taux de « je ne sais pas », taux d'escalade, satisfaction (part de pouces hauts), temps de réponse médian et p95 (`utils/quality-indicators.js`, 2 tests). Ils complètent l'évaluation RAGAS du livrable 1.

## 5.4 Finitions : images

| Constat | Correction |
|---|---|
| 8 photos JPEG de 220 à 330 Ko en 1080 px affichées à ~340 px ; 2,4 Mo au total | `utils/image-optimization.js` (3 tests) : pour les photos Cloudinary, transformation `f_auto,q_auto,c_limit,w_…` (WebP/AVIF automatique) et `srcset` 360/540/760 px sur toutes les cartes, le chat, le carrousel et les fonds de section ; `loading="lazy"` et `decoding="async"` |
| Fonds par défaut | `hero`, `services`, `evenements` convertis en WebP 1600 px : **460 Ko → 167 Ko** |

## Ce que vous devez faire

1. `npm run migrate` (migration `016`).
2. Déployer, puis vérifier à l'œil : réponse en flux, bouton « Nouvelle conversation », listes bien rendues, avis, chat sur un vrai téléphone (le rapport n'avait pas testé d'appareil mobile réel).
3. Définir la variable de dépôt GitHub `KIM_API_HEALTH_URL`, ou passer l'API sur une offre payante.

## Limites

- Derrière certains proxys, le flux peut être mis en mémoire tampon (l'en-tête `X-Accel-Buffering: no` est envoyé) : la réponse s'affiche alors d'un bloc, sans perte.
- La relecture de l'historique restitue le texte des 30 derniers échanges, pas les formulaires, photos ou diaporamas déjà affichés.
- Les images hébergées hors Cloudinary ne sont pas transformées.
