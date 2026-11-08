# KIM — Assistant IA multilingue et plateforme de gestion du CSCTICAO

Centre Sportif, Culturel et des TIC Ivoiro-Coréen Alassane Ouattara (Abidjan).
Kim répond en français, anglais et coréen, recueille les demandes (salles, formations, partenariats) et les soumet à l'administration avec le statut **« En attente de validation humaine »**. Kim ne confirme jamais rien lui-même.

**Seules les données établies par le TDR sont préchargées (migrations 004 et 007)** : horaires, missions, vision, 4 types d'espaces, 5 formations et le mot du Directeur. Les salles, formations, informations du Centre (contacts, missions, vision…) et horaires sont saisis et modifiés par l'administration depuis `/admin`, sans toucher au code. Tant qu'une rubrique est vide, Kim répond qu'il ne possède pas l'information et propose de transmettre la question à un agent.

```
database/migrations/   scripts SQL PostgreSQL / Supabase (structure, plus le catalogue officiel de départ)
backend/               API Node.js / Express (config, controllers, services, middlewares, routes)
frontend/              React + Vite (components, pages, services, context, i18n, styles)
docs/                  livrables et recette
render.yaml            déploiement Render (2 services Web)
```

## 1. Prérequis
Node.js 20+, un projet Supabase gratuit (base PostgreSQL), une clé Google Gemini (Gemini Flash gratuit), un dépôt GitHub public.

## 2. Démarrage local
```bash
# Backend
cd backend
cp .env.example .env                 # renseigner DATABASE_URL (Supabase), Gemini, Cloudinary, JWT_SECRET, ADMIN_*
npm install
npm run migrate                      # crée/met à jour les tables (rejouable sans risque)
npm run dev                          # http://localhost:4000/api/v1/health

# Frontend (autre terminal)
cd frontend
cp .env.example .env                 # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                          # http://localhost:5173  (admin : /admin/login)
```
Variables backend : `DATABASE_URL` (URI « Session pooler » de Supabase), `GEMINI_API_KEY, PORT, JWT_SECRET` + `CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET` (photos) et `ADMIN_EMAIL, ADMIN_PASSWORD` (connexion admin). Optionnelles : `GEMINI_MODEL`, `FRONTEND_URL`, `JWT_EXPIRES_IN`, `ADMIN_FULL_NAME`, `GOOGLE_CLIENT_ID` (connexion Google), `MAIL_API_KEY` + `MAIL_FROM` + `PUBLIC_SITE_URL` (e-mails de compte), `EVAL_API_KEY` (mode évaluation), `RETENTION_CHAT_MONTHS` / `RETENTION_REQUESTS_MONTHS` (purge).

**Connexion administrateur :** elle ne dépend d'aucune table. Elle est définie uniquement par `ADMIN_EMAIL` et `ADMIN_PASSWORD` (10 caractères minimum) dans `.env` (ou dans les variables Render). Changer ces variables et redémarrer suffit à changer l'accès. Le serveur refuse de démarrer si elles manquent.

**Administration invisible pour les visiteurs :** aucun lien ni bouton ne mène à l'administration depuis le site public. L'équipe y accède en saisissant directement l'adresse `/admin/login`. Toutes les routes `/api/v1/admin/*` exigent un jeton JWT valide.

**Photos (Cloudinary) :** créez un compte Cloudinary gratuit, puis copiez *Cloud name*, *API Key* et *API Secret* dans `.env`. Les photos sont envoyées par l'administration depuis les formulaires Salle et Formation ; l'adresse est enregistrée dans Supabase.

### Usage de Supabase (PostgreSQL)
Supabase est la seule base de données : aucune donnée n'est gardée en mémoire ou en dur dans l'application.
- **Catalogue** : `ROOMS`, `ACTIVITIES`, `OPENING_HOURS`, `CENTER_INFORMATION`. Kim les relit à chaque message (disponibilités, places restantes, conditions d'inscription, horaires).
- **Suivi des demandes** : `ROOM_REQUESTS`, `ACTIVITY_REGISTRATIONS`, `PARTNERSHIP_REQUESTS`. Le tableau de bord lit ces tables et se rafraîchit tout seul (15 s).
- **Conversations** : `CHAT_LOGS` (historique, drapeau d'intervention humaine), `CHAT_TAKEOVERS` et `HUMAN_MESSAGES` (reprise en main par un agent).
- **Scripts SQL** : `database/migrations/001` à `016`, exécutés dans l'ordre par `npm run migrate` (rejouables sans risque ; la 008 active la sécurité RLS (la 009 crée `SITE_BACKGROUNDS`, protégée de la même façon) qui bloque l'API publique Supabase, seul le backend accède aux données). Pour la démo : ouvrir *SQL Editor* dans Supabase et lancer `SELECT * FROM ROOM_REQUESTS ORDER BY CREATED_AT DESC;` après une demande faite dans le chat.

## 3. Renseigner les données du Centre (depuis l'interface)
Connectez-vous sur `/connexion` (même page pour tous : l'e-mail et le mot de passe `ADMIN_EMAIL` / `ADMIN_PASSWORD` ouvrent l'administration, un compte visiteur ouvre « Mon espace »), puis :

| Onglet | Ce que l'administration peut faire |
|---|---|
| **Salles et espaces** | ajouter, modifier, supprimer une salle ; photo, capacité, équipements, tarif, statut « Disponible / En maintenance » |
| **Formations** | ajouter, modifier, supprimer une formation ; photo, conditions d'inscription (niveau, adhésion), catégorie, tranche d'âge, nombre de places, horaires, description |
| **Traduction automatique** | tout ce que l'administration saisit en français (salles, formations, informations du Centre, événements, actualités, vidéos, diapositives, suggestions, messages de l'équipe) est traduit par Kim dans la langue du visiteur (anglais, coréen, espagnol, portugais, arabe, chinois, etc.). Les traductions sont gardées en base (`CONTENT_TRANSLATIONS`) : une modification de texte déclenche automatiquement sa nouvelle traduction, préparée en arrière-plan après chaque enregistrement. L'administration reste en français. Une suggestion du chat saisie à la main en anglais ou en coréen est prioritaire |
| **Description automatique** | partout où l'on ajoute une image ou une vidéo (salles, formations, événements, actualités, vidéos, diapositives), Kim analyse l'image (ou la miniature YouTube, ou le titre) et écrit une description dans le champ dès que l'image est ajoutée ; l'administration la modifie puis enregistre. Bouton « Proposer une description avec Kim » pour la refaire. Seules les images du Cloudinary du Centre et les miniatures YouTube sont analysées |
| **Présentation Kim** | voir le texte que Kim rédige pour chaque salle et formation (diaporama d'images avec boutons réserver / s'inscrire / contacter), le **corriger** ou y ajouter un **complément**, choisir le bouton d'action, l'ordre, masquer, ajouter des diapositives personnalisées ; les corrections sont reprises telles quelles par Kim |
| **Suggestions du chat** | boutons proposés à l'ouverture du chat (poser une question, présenter les services, montrer les vidéos, ouvrir un formulaire, contacter un agent), en français, anglais et coréen |
| **Vidéos** | vidéos de présentation ou de récap (lien YouTube, Vimeo ou fichier vidéo) affichées sur l'accueil et montrées par Kim sur demande |
| **Événements** / **Actualités** | ajouter, modifier, masquer (brouillon) ou supprimer ; image, date, lieu ; affichés sur l'accueil et dans « Mon espace », connus de Kim ; un événement terminé disparaît tout seul |
| **Images du site** | remplacer, pour chacune des 3 sections de la page d'accueil (bandeau d'accueil, « Faire une demande », « Parler à Kim »), l'image d'arrière-plan ; « Rétablir l'image par défaut » restaure celle fournie dans `frontend/public/backgrounds/` |
| **Informations et horaires** | contacts, adresse, réseaux sociaux, missions, vision… avec leur source officielle ; horaires d'ouverture jour par jour |

Le **Mot du Directeur Général** (migration 004) s'affiche en bas de la page d'accueil (`/`) ; le chat et les formulaires sont sur `/chat` (`/chat?form=room`, `register` ou `partner` ouvre directement le formulaire) ; il se modifie dans « Informations et horaires » (rubrique `direction`). Si une salle ou une formation a une photo, Kim l'affiche quand le visiteur demande à la voir.

Les changements sont immédiatement visibles des visiteurs et de Kim. Un champ vidé est réellement effacé (par exemple, retirer le nombre de places supprime la limite). Une salle ou une formation déjà liée à des demandes ne peut pas être supprimée : mettez la salle « En maintenance », ou traitez d'abord les pré-inscriptions.

## 4. Déploiement (GitHub + Render)
1. Poussez ce dossier sur GitHub (branche `main`).
2. Site statique créé à la main : *Root Directory* `frontend`, *Build Command* `npm install && npm run build`, *Publish Directory* `dist` (l'outil de build est une dépendance normale : Render n'installe pas les devDependencies). Ou Render → **New → Blueprint** : `render.yaml` crée `kim-api` (service web) et `kim-web` (**site statique**, jamais endormi). La règle `/* → /index.html` est déclarée dans `render.yaml` : rien à ajouter dans « Redirects/Rewrites ». Un `404.html` de repli est aussi généré au build.
3. Renseignez `kim-api` : `DATABASE_URL`, `GEMINI_API_KEY`, `CLOUDINARY_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_URL` (URL de `kim-web`, avec ou sans slash final), puis `kim-web` : `VITE_API_URL` (URL de l'API + `/api/v1`).
4. Exécutez `npm run migrate` (dossier `backend`, même `DATABASE_URL`). Chaque migration n'est jouée qu'une fois ; les données de départ (004, 007) ne sont jamais rejouées : ce que vous modifiez ou supprimez dans l'admin n'est jamais recréé.
5. L'API gratuite s'endort après 15 min d'inactivité : le site la réveille en silence dès l'ouverture. Le chat affiche déjà l'accueil de Kim avec « Kim se charge… Veuillez patienter un instant, s'il vous plaît. » et débloque la saisie dès que l'API répond (`/api/v1/health`). Pour l'éviter, faites pinger cette adresse toutes les 10 min (UptimeRobot, gratuit).
6. PWA : le site s'installe sur mobile et ordinateur (bouton « Installer l'application » dans l'en-tête).

**Photos** : importez des photos propres (sans texte incrusté ni marges blanches) dans l'admin ; une salle sans photo s'affiche simplement sans image. Les photos sont toujours cadrées en 16/9 et ne dépassent jamais l'écran, même sur mobile.

**Si Kim reste sur « se charge… »** : au bout d'environ 75 s, le chat affiche la cause. « Le site n'est pas relié à son serveur » = `VITE_API_URL` manquant ou incorrect sur `kim-web` ; `VITE_API_URL` est intégré au site au moment du build, donc après l'avoir défini il faut relancer un déploiement (*Manual Deploy → Clear build cache & deploy*). L'adresse peut être donnée avec ou sans `/api/v1`. « Le serveur refuse ce site » = ajouter l'adresse du site dans `FRONTEND_URL` de `kim-api` (les sites `*.onrender.com` sont déjà acceptés). Vérification rapide : ouvrir `https://VOTRE-API.onrender.com/api/v1/health` doit afficher `{"status":"ok"}`.

**Si la connexion échoue après un changement d'adresse du frontend** : `FRONTEND_URL` de `kim-api` ne contient pas la nouvelle adresse (l'API journalise `[CORS] origine refusée`).

**Réservations simultanées** : chaque demande de salle est traitée sous verrou (une salle, un jour) puis contrôlée par une contrainte PostgreSQL anti-chevauchement ; une demande en attente ou validée occupe le créneau, une demande refusée le libère. Les inscriptions à une formation sont verrouillées de la même façon (pas de doublon, quota respecté).

**Langue de Kim** : Kim répond dans la langue du dernier message du visiteur, quelle que soit la langue de l'interface, et traduit les données du Centre (diaporama, légendes des photos, sources) dans cette langue. Si la traduction échoue, le texte français s'affiche : le site ne casse jamais.

**Kim et les formulaires** : Kim n'enregistre jamais rien ; elle affiche le formulaire (bordure orange) dans le chat, pré-rempli avec ce que le visiteur a dit. La demande part uniquement quand tous les champs obligatoires sont remplis.

## 5. API (`/api/v1`)
| Méthode | Route | Accès |
|---|---|---|
| POST | `/chat/message` | public |
| POST | `/auth/register` · `/auth/login` | public |
| GET | `/auth/me` · `/me/requests` | compte connecté |
| GET | `/rooms/:id/availability?date=` · `/events` · `/news` · `/videos` · `/chat-suggestions` · `/presentation?lang=` | public |
| POST | `/admin/describe-media` | admin |
| GET/POST/PATCH/DELETE | `/admin/presentations` (+ `POST /:id/regenerate`) · `/admin/videos` · `/admin/chat-suggestions` | admin |
| GET/POST/PATCH/DELETE | `/admin/events` · `/admin/news` | admin |
| GET | `/rooms` · `/activities` · `/opening-hours` · `/center-information` · `/site-backgrounds` | public |
| POST | `/rooms/request` · `/activities/register` · `/partnerships` | public |
| POST | `/auth/login` | public (renvoie le JWT) |
| GET · PATCH | `/admin/rooms/requests` · `/admin/rooms/requests/:id` | admin |
| GET · PATCH | `/admin/activities/registrations` · `/admin/activities/registrations/:id` | admin |
| GET · PATCH | `/admin/partnerships` · `/admin/partnerships/:id` | admin |
| GET | `/admin/chats/flagged` · `/admin/chats/session/:sessionId` · `/admin/stats` | admin |
| PUT | `/admin/site-backgrounds/:slot` (`hero`, `services`, `evenements` ; `image_url` vide = image par défaut) | admin |
| POST · DELETE | `/admin/chats/session/:sessionId/takeover` (reprendre / rendre la main) | admin |
| POST | `/admin/chats/session/:sessionId/reply` (message de l'agent au visiteur) | admin |
| GET | `/chat/session/:sessionId/human-messages` (le chat du visiteur relit les réponses de l'agent) | public |
| POST | `/admin/images` (multipart, champ `image`) | admin |
| POST · PATCH · DELETE | `/admin/rooms` · `/admin/rooms/:id` | admin |
| POST · PATCH · DELETE | `/admin/activities` · `/admin/activities/:id` | admin |
| GET · POST · PATCH · DELETE | `/admin/center-information` · `/admin/center-information/:id` | admin |
| PUT | `/admin/opening-hours` | admin |

Assistance humaine : depuis l'onglet « Assistance humaine », l'agent ouvre une conversation, clique sur « Reprendre la main » (Kim se tait), écrit au visiteur (sa réponse apparaît dans le chat sous 6 s) puis « Rendre la main à Kim ». Chaque pré-inscription et chaque demande se traite avec un message ; le bouton « Contacter » ouvre l'e-mail du demandeur.

Règles métier appliquées côté serveur : date non passée, fin après début, capacité de la salle, créneau déjà validé (409), âge min/max, quota de places (liste d'attente si complet), motif obligatoire pour un refus, avertissement hors horaires d'ouverture (uniquement si des horaires ont été saisis). Les sources citées par Kim sont filtrées sur les adresses saisies par l'administration.

## 6. Limites connues
- Le code n'a pas pu être exécuté contre de vrais Supabase/Gemini : vérifiez d'abord `npm run migrate`, puis la saisie d'une salle dans `/admin`, puis un message de chat.
- Le logo `frontend/public/logo.png` a été découpé dans une capture d'écran du site : remplacez-le par le fichier officiel haute définition.
- Le tableau de bord est en français uniquement (le TDR impose le multilingue côté visiteur).
- Un seul administrateur (variables `ADMIN_*`). La table `USERS` du TDR reste créée mais n'est pas utilisée.
- Une photo remplacée ou retirée reste stockée sur Cloudinary (elle n'est plus référencée) ; supprimez-la depuis la console Cloudinary si besoin.


## Corrections issues du rapport de recommandations (novembre 2026)

Cinq livrables, chacun documenté dans `docs/corrections/` ; le tableau de suivi de chaque recommandation du rapport est dans
`docs/corrections/00-suivi-des-recommandations.md`.

| Livrable | Sujet | Document |
|---|---|---|
| 1 | Évaluer d'abord : golden dataset (90 questions), RAGAS, mode évaluation | `docs/corrections/01-evaluation-golden-dataset-ragas.md`, dossier `evaluation/` |
| 2 | Escalade sur accord, quota anonyme, connexion Google | `docs/corrections/02-escalade-quota-connexion-google.md` |
| 3 | Consentement, politique de confidentialité, comptes, formulaire de salle | `docs/corrections/03-conformite-comptes-formulaires.md` |
| 4 | Base de connaissances, traduction, catalogue, pied de page | `docs/corrections/04-base-connaissances-traduction-contenu.md` |
| 5 | Streaming, historique, Markdown, avis, mobile, images, indicateurs | `docs/corrections/05-performance-et-finitions.md` |

Tests : `cd backend && npm test` · `node --test frontend/tests/*.test.mjs` · `node --test evaluation/tests/behavior-metrics.test.mjs evaluation/tests/runner.test.mjs`.
