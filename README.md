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
Variables backend : `DATABASE_URL` (URI « Session pooler » de Supabase), `GEMINI_API_KEY, PORT, JWT_SECRET` + `CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET` (photos) et `ADMIN_EMAIL, ADMIN_PASSWORD` (connexion admin). Optionnelles : `GEMINI_MODEL`, `FRONTEND_URL`, `JWT_EXPIRES_IN`, `ADMIN_FULL_NAME`.

**Connexion administrateur :** elle ne dépend d'aucune table. Elle est définie uniquement par `ADMIN_EMAIL` et `ADMIN_PASSWORD` (10 caractères minimum) dans `.env` (ou dans les variables Render). Changer ces variables et redémarrer suffit à changer l'accès. Le serveur refuse de démarrer si elles manquent.

**Administration invisible pour les visiteurs :** aucun lien ni bouton ne mène à l'administration depuis le site public. L'équipe y accède en saisissant directement l'adresse `/admin/login`. Toutes les routes `/api/v1/admin/*` exigent un jeton JWT valide.

**Photos (Cloudinary) :** créez un compte Cloudinary gratuit, puis copiez *Cloud name*, *API Key* et *API Secret* dans `.env`. Les photos sont envoyées par l'administration depuis les formulaires Salle et Formation ; l'adresse est enregistrée dans Supabase.

### Usage de Supabase (PostgreSQL)
Supabase est la seule base de données : aucune donnée n'est gardée en mémoire ou en dur dans l'application.
- **Catalogue** : `ROOMS`, `ACTIVITIES`, `OPENING_HOURS`, `CENTER_INFORMATION`. Kim les relit à chaque message (disponibilités, places restantes, conditions d'inscription, horaires).
- **Suivi des demandes** : `ROOM_REQUESTS`, `ACTIVITY_REGISTRATIONS`, `PARTNERSHIP_REQUESTS`. Le tableau de bord lit ces tables et se rafraîchit tout seul (15 s).
- **Conversations** : `CHAT_LOGS` (historique, drapeau d'intervention humaine), `CHAT_TAKEOVERS` et `HUMAN_MESSAGES` (reprise en main par un agent).
- **Scripts SQL** : `database/migrations/001` à `009`, exécutés dans l'ordre par `npm run migrate` (rejouables sans risque ; la 008 active la sécurité RLS (la 009 crée `SITE_BACKGROUNDS`, protégée de la même façon) qui bloque l'API publique Supabase, seul le backend accède aux données). Pour la démo : ouvrir *SQL Editor* dans Supabase et lancer `SELECT * FROM ROOM_REQUESTS ORDER BY CREATED_AT DESC;` après une demande faite dans le chat.

## 3. Renseigner les données du Centre (depuis l'interface)
Connectez-vous sur `/admin/login`, puis :

| Onglet | Ce que l'administration peut faire |
|---|---|
| **Salles et espaces** | ajouter, modifier, supprimer une salle ; photo, capacité, équipements, tarif, statut « Disponible / En maintenance » |
| **Formations** | ajouter, modifier, supprimer une formation ; photo, conditions d'inscription (niveau, adhésion), catégorie, tranche d'âge, nombre de places, horaires, description |
| **Images du site** | remplacer, pour chacune des 3 sections de la page d'accueil (bandeau d'accueil, « Faire une demande », « Parler à Kim »), l'image d'arrière-plan ; « Rétablir l'image par défaut » restaure celle fournie dans `frontend/public/backgrounds/` |
| **Informations et horaires** | contacts, adresse, réseaux sociaux, missions, vision… avec leur source officielle ; horaires d'ouverture jour par jour |

Le **Mot du Directeur Général** (migration 004) s'affiche en bas de la page d'accueil (`/`) ; le chat et les formulaires sont sur `/chat` (`/chat?form=room`, `register` ou `partner` ouvre directement le formulaire) ; il se modifie dans « Informations et horaires » (rubrique `direction`). Si une salle ou une formation a une photo, Kim l'affiche quand le visiteur demande à la voir.

Les changements sont immédiatement visibles des visiteurs et de Kim. Un champ vidé est réellement effacé (par exemple, retirer le nombre de places supprime la limite). Une salle ou une formation déjà liée à des demandes ne peut pas être supprimée : mettez la salle « En maintenance », ou traitez d'abord les pré-inscriptions.

## 4. Déploiement (GitHub + Render)
1. Poussez ce dossier sur un dépôt GitHub public (branche `main`).
2. Render → **New → Blueprint** → choisissez le dépôt : `render.yaml` crée `kim-api` et `kim-web`.
3. Renseignez les variables (`sync: false`) de `kim-api`, puis `VITE_API_URL` de `kim-web` (URL de l'API + `/api/v1`) et `FRONTEND_URL` de `kim-api` (URL du frontend).
4. Renseignez aussi `CLOUDINARY_*`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` sur `kim-api`, puis exécutez `npm run migrate` avec la même `DATABASE_URL` (depuis votre poste ou le Shell Render).
5. Chaque `git push` sur `main` réinstalle les dépendances et redéploie.

## 5. API (`/api/v1`)
| Méthode | Route | Accès |
|---|---|---|
| POST | `/chat/message` | public |
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
