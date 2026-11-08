# Suivi des recommandations — Rapport « Kim, assistant virtuel du CSCTICAO » (test du 6 novembre 2026)

Légende : **Fait** = corrigé dans le code et testé hors ligne · **Fait + action** = corrigé dans le code, une action de votre part est nécessaire (clé, donnée, déploiement) · **Centre** = relève du contenu ou de l'administratif, pas du code.

## Tableau des priorités du rapport

| Prio | Recommandation | Statut | Livrable | Où |
|---|---|---|---|---|
| P1 | Évaluer d'abord : golden dataset ~90 questions FR/EN/KO, puis RAGAS | **Fait + action** (références à valider par le Centre, clé du juge) | 1 | `evaluation/`, `POST /eval/chat` |
| P1 | N'escalader vers un agent qu'après accord explicite | **Fait** | 2 | `utils/escalation-policy.js`, `consent-language.js`, prompt |
| P1 | Limiter les questions anonymes (5), connexion, « Continuer avec Google », plafond par IP | **Fait + action** (`GOOGLE_CLIENT_ID`) | 2 | `anonymous-quota-policy.js`, `google-identity.js` |
| P1 | Compléter la base : tarifs, horaires, public, capacités | **Fait + action / Centre** (champs, modèles, tableau de bord ; les valeurs viennent du Centre) | 4 | migration `015`, `docs/corrections/modeles/` |
| P1 | Consentement, politique de confidentialité, mentions légales | **Fait + action** (relecture juridique, ARTCI) | 3 | `LegalPage.jsx`, `ConsentField.jsx` |
| P2 | Streaming ; polling agent seulement après escalade | **Fait** | 5 | `/chat/stream`, `ChatContext.jsx` |
| P2 | Localiser formulaires et messages système selon la langue de la conversation | **Fait** | 4 | `LanguageOverride` |
| P2 | Contrôles du formulaire de salle ; mot de passe oublié | **Fait** | 3 | `booking-rules.js`, `PasswordPages.jsx` |
| P2 | Photos et fiches des espaces harmonisées ; pied de page avec contact et plan | **Fait + Centre** (photos propres à fournir) | 4 | `SiteFooter.jsx`, `catalog-quality.js` |
| P3 | Rendu Markdown, coquilles, images optimisées, retours utilisateurs | **Fait** | 4, 5 | `Markdown.jsx`, migration `015`/`016` |

## Constats détaillés

### Section 4 — Évaluation
| Point | Statut |
|---|---|
| 4.1 Golden dataset (8 catégories, 90 questions, format d'une ligne, versionné, 20 % de holdout) | Fait. Références `a_valider` à écrire par le Centre (jamais par un LLM) |
| 4.2 Mode évaluation (réponse + passages) | Fait |
| 4.2 Six métriques RAGAS + seuils | Fait (`ragas_eval.py`, `thresholds.json`) ; à lancer avec vos clés |
| 4.2 Contrôles de comportement (langue 100 %, 0 escalade à tort, bon formulaire, refus, p95 < 5 s) | Fait, testés |
| 4.3 Juge différent, température 0 ; calibrer ; lire par catégorie/langue ; bloquer le déploiement ; conserver les résultats | Fait (CI `.github/workflows/evaluation.yml`) ; calibration du juge = action humaine |

### Section 5 — Assistant IA
| Constat | Priorité | Statut | Livrable |
|---|---|---|---|
| Escalade sans accord, même sur une attaque (4/4) | P1 | Fait | 2 |
| Usage anonyme sans limite ; session dans `sessionStorage` | P1 | Fait (compteur serveur par session + appareil + IP) | 2 |
| Base de connaissances incomplète | P1 | Fait + Centre | 4 |
| Latence ; polling toutes les 6 s | P2 | Fait (le plan d'hébergement reste à décider) | 5 |
| Langue de la conversation non respectée | P2 | Fait | 4 |
| Conversation perdue au rechargement | P2 | Fait | 5 |
| Qualité et suivi (Markdown, pouces, indicateurs) | P3 | Fait | 5 |

### Section 6 — Formulaires et données personnelles
| Constat | Priorité | Statut | Livrable |
|---|---|---|---|
| Données collectées sans consentement ; mineurs ; ARTCI | P1 | Fait (consentement + accord parental + politique) ; déclaration ARTCI = **Centre** | 3 |
| Formulaire de salle peu contrôlé (date, capacité, horaires, fin > début, serveur) | P2 | Fait (navigateur + serveur) | 3 |
| Compte : mot de passe oublié, 8 caractères serveur, vérification e-mail, navigation | P2 | Fait | 3 |
| Connexion avec Google (jeton vérifié côté serveur, state/nonce, openid/email/profile, rattachement, citation dans la politique) | P2 | Fait + action ; **Kakao : non fait** (« second temps » dans le rapport) | 2, 3 |

### Section 7 — Contenu et site
| Constat | Priorité | Statut | Livrable |
|---|---|---|---|
| Photos : texte incrusté, photo erronée, photos partagées | P2 | Texte incrusté = captures d'écran que vous avez téléversées : **à remplacer** ; code : consigne dans l'admin + détection des photos partagées | 4 |
| Catalogue incohérent (fiches, parking « sport », doublons, hauteurs de cartes) | P2 | Fait (fiche à lignes fixes, cartes de même hauteur, contrôle qualité) ; corrections de données = **Centre** | 4 |
| Pas de pied de page ni de contact ; deux bandeaux d'inscription | P2 | Fait | 4 |
| Chat sur mobile | P2 | Fait (à contrôler sur appareil réel) | 5 |
| Coquilles | P3 | Fait (migration `015`, texte exact) | 4 |
| « TIC Center » au lieu de « ICT Centre » | P3 | Fait (glossaire + purge du cache de traduction) | 4 |
| Dimanche absent du tableau des horaires | P3 | Fait | 2, 4 |
| Images : 2,4 Mo pour 8 photos | P3 | Fait (Cloudinary `f_auto`, `srcset`, fonds WebP) | 5 |

### Section 8 — Prochaines étapes proposées
1. Semaine 1, évaluer d'abord → livrable 1 (code prêt ; à lancer après validation des références).
2. En parallèle : escalade sur accord, quota + plafond IP avec Google, politique et consentement → livrables 2 et 3.
3. Semaines 2 et 3 : fiches, formulaires localisés, streaming, rejouer l'évaluation → livrables 4 et 5.
4. Ensuite : évaluation à chaque déploiement, indicateurs de production, photos, pied de page → CI + tableau de bord + livrable 4.

## Ajout demandé : référencement (hors rapport)
Code livré (balises par page et langue, hreflang, JSON-LD, sitemap, robots, aperçu de partage, noindex des pages privées, API exclue) : voir `docs/corrections/06-referencement-seo.md`. **Action : définir `VITE_SITE_URL`, déclarer le site dans Search Console / Bing, créer la fiche Google Business Profile.**

## À faire de votre côté (récapitulatif)
1. `cd backend && npm run migrate` (migrations 013 à 016).
2. Variables Render : `GOOGLE_CLIENT_ID`, `MAIL_API_KEY`, `MAIL_FROM`, `PUBLIC_SITE_URL`, `EVAL_API_KEY` ; secrets GitHub pour l'évaluation et le keep-alive.
3. Remplir les modèles `docs/corrections/modeles/*.csv`, puis saisir les données dans l'administration ; remplacer les captures par de vraies photos.
4. Faire valider les références du golden dataset par le Centre ; lancer la ligne de base puis rejouer.
5. Définir `VITE_SITE_URL` (nom de domaine définitif) puis suivre le guide de référencement.
6. Faire relire la politique de confidentialité et les mentions légales ; vérifier l'obligation ARTCI.
7. Tester dans un navigateur réel (streaming, mobile, Google, e-mails) : ces parcours n'ont pas pu être exécutés dans l'environnement de travail.

## Vérifications effectuées dans l'environnement de travail
- Backend : 40 tests (escalade, quota, Google, FAQ, jetons, règles de réservation, qualité du catalogue, flux JSON, indicateurs) ; syntaxe de tous les fichiers vérifiée.
- Frontend : 8 tests (SSE, Markdown, images) ; syntaxe de tous les fichiers JSX/JS vérifiée avec esbuild.
- Évaluation : 9 tests Node (dont le runner contre un faux serveur) + 4 tests Python.
- **Non exécuté** : la base Supabase, Gemini, Google, Resend, Cloudinary et le navigateur (pas d'accès réseau ni d'`npm install`).
