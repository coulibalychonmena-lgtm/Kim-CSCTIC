# Livrable 3 — Conformité, comptes et formulaires

**Recommandations du rapport :** P1 « Données personnelles collectées sans consentement » ; P2 « Formulaire de réservation de salle peu contrôlé » ; P2 « Compte utilisateur » (mot de passe oublié, 8 caractères imposés côté serveur, vérification de l'e-mail, navigation identique) ; part « politique de confidentialité » du P1 (Google cité).
**Statut : livré. 29 tests backend passent ; la syntaxe de tout le frontend est vérifiée. Les envois d'e-mails réels et la base Supabase restent à tester avec vos clés.**

## 3.1 Consentement et politique de confidentialité

| Élément | Fichier(s) | Détail |
|---|---|---|
| Case de consentement obligatoire | `frontend/src/components/forms/ConsentField.jsx`, formulaires salle / inscription / partenariat, `AccountPage.jsx` | Lien vers la politique de confidentialité. Bloque l'envoi tant que la case n'est pas cochée |
| Consentement imposé côté serveur | `request-body-schemas.js` (`consent`, règle `mustBeTrue`), `validate.middleware.js` | Un appel direct à l'API sans `consent: true` est refusé |
| Date du consentement conservée | migration `014` (`CONSENT_AT` sur salle, inscription, partenariat, comptes) | Preuve de consentement |
| Accord parental pour les mineurs | `RegistrationForm.jsx`, `utils/booking-rules.js`, `activities.service.js`, migration `014` (`GUARDIAN_NAME`, `GUARDIAN_CONSENT`) | Moins de 18 ans : nom et accord du parent ou tuteur obligatoires, côté navigateur **et** serveur. Visibles dans la liste d'administration des pré-inscriptions |
| Politique de confidentialité (FR/EN/KO) | `frontend/src/pages/LegalPage.jsx`, `i18n/legal-content.js`, route `/confidentialite` | Finalités, base légale, mineurs, prestataires (Supabase, Render, Google/Gemini, Cloudinary, Resend), durées, droits, ARTCI, loi n° 2013-450. **Google est cité comme fournisseur d'identité** |
| Mentions légales (FR/EN/KO) | même page, route `/mentions-legales` | Éditeur, directeur de la publication, hébergeurs, avertissement sur l'assistant IA |
| Coordonnées | `SiteFooter.jsx`, `LegalPage.jsx` | Lues dans l'administration (Informations du Centre, catégorie « contact ») : rien n'est inventé |
| Durées de conservation appliquées | `backend/scripts/purge-expired-data.js`, `npm run purge` | Conversations 12 mois ; demandes traitées 24 mois ; jetons expirés. `--dry-run` pour compter. Valeurs modifiables : `RETENTION_CHAT_MONTHS`, `RETENTION_REQUESTS_MONTHS` |
| Droits d'accès et d'effacement | `GET /api/v1/me/export`, `DELETE /api/v1/me`, panneau « Mes données » de Mon espace | Export JSON ; suppression du compte (demandes détachées, historique du chat détaché) |

## 3.2 Formulaire de réservation de salle

| Contrôle du rapport | Navigateur | Serveur |
|---|---|---|
| Date minimum = aujourd'hui | `min` + message | déjà en place |
| Participants ≤ capacité de la salle | `max` + message | déjà en place |
| Créneaux limités aux horaires d'ouverture | bornes `min`/`max` des heures, message « fermé ce jour-là » | **nouveau : refus 422** (avant : simple avertissement) ; sans horaires saisis, rien n'est refusé |
| Fin après début | message | déjà en place |

`booking-rules.js` (testé : dimanche fermé, 22 h refusé, 8 h–18 h accepté) ; `getRoomAvailability` renvoie maintenant `closed` pour qu'un dimanche soit signalé dès le choix de la date.

## 3.3 Comptes

| Point du rapport | Mise en œuvre |
|---|---|
| Lien « mot de passe oublié » | Pages `/mot-de-passe-oublie` et `/reinitialiser-mot-de-passe` ; jetons à usage unique, valables 1 h, **seule l'empreinte est stockée** (`ACCOUNT_TOKENS`) ; réponse identique que l'adresse existe ou non |
| Vérification de l'e-mail | E-mail envoyé à l'inscription (24 h), page `/verification-email`, bandeau et bouton « Renvoyer » dans Mon espace. Les comptes Google sont vérifiés d'office |
| 8 caractères | Attribut `minLength` + message côté navigateur ; **imposé côté serveur** (`account-tokens.js`, testé) également à la réinitialisation |
| Même navigation partout | Le lien « Connexion » est désormais dans l'en-tête de l'accueil aussi ; le pied de page est partagé |
| E-mails | `mail.service.js` (API Resend, sans dépendance), modèles FR/EN/KO. Sans `MAIL_API_KEY`, le lien est écrit dans les journaux du serveur |

Tests : `account-tokens.test.js` (4), `booking-rules.test.js` (3).

## Ce que vous devez faire

1. `npm run migrate` (migration `014`).
2. Créer un compte Resend, vérifier votre domaine d'envoi, renseigner `MAIL_API_KEY`, `MAIL_FROM`, `PUBLIC_SITE_URL` sur `kim-api`.
3. Dans l'administration, saisir les informations de contact (catégorie « contact » : adresse, téléphone, e-mail) et, si souhaité, une catégorie « réseaux sociaux » (lien dans « URL de la source »).
4. Planifier `npm run purge` chaque semaine (Cron Job Render).
5. **Faire relire la politique et les mentions par le Centre** (et un juriste), puis vérifier l'obligation de déclaration auprès de l'ARTCI (loi n° 2013-450) : ce point est administratif et ne peut pas être réglé par du code. Les durées (12 et 24 mois) sont des valeurs par défaut proposées.

## Limites

- Les mentions légales n'indiquent ni numéro d'immatriculation ni adresse : à ajouter par le Centre dans les informations de contact si nécessaire.
- La vérification de l'e-mail n'empêche pas d'utiliser le compte (choix volontaire : ne pas bloquer les visiteurs).
