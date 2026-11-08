# Livrable 4 — Base de connaissances, traduction et contenu du site

**Recommandations du rapport :** P1 « Base de connaissances incomplète » ; P2 « Langue de la conversation non respectée par l'interface » ; P2 « Photos des espaces » ; P2 « Catalogue des espaces incohérent » ; P2 « Pas de pied de page ni de contact » ; P3 finitions (coquilles, « TIC Center », dimanche absent du tableau des horaires).
**Statut : livré côté code. Les *données* (tarifs, capacités, horaires de cours, photos) ne peuvent venir que du Centre : le code fournit les champs, les modèles à remplir et un tableau de bord qui dit quoi compléter. 34 tests backend passent.**

> **À propos du texte dans les photos.** Vous l'avez précisé : ce texte est déjà dans les captures d'écran que vous avez téléversées comme photos, ce n'est pas du code. Un programme ne peut pas retirer proprement un texte incrusté dans les pixels : il faut remplacer ces fichiers par de vraies photos. Ce qui a été fait côté code : (1) le formulaire de photo de l'administration le dit explicitement (« vraie photo, sans texte ni capture d'écran, une photo différente par espace ») ; (2) le contrôle qualité signale les photos réutilisées par plusieurs fiches (cas « Salle de Classe » / « Salles de Formation TIC », « Salle de Conférence » / « Salles Polyvalentes ») ; (3) le site n'ajoute aucun texte par-dessus les photos : le titre de la carte est affiché sous l'image.

## 4.1 Base de connaissances complète (P1)

| Élément | Détail |
|---|---|
| Fiche standard d'une salle | Capacité, **surface**, équipements, tarif indicatif, **conditions d'utilisation** (migration `015`, `ROOMS.SURFACE_M2`, `ROOMS.CONDITIONS`) |
| Fiche standard d'une formation | Public/âge, jours et horaires, **durée, prix, prérequis**, conditions d'inscription (`ACTIVITIES.DURATION`, `PRICE`, `PREREQUISITES`) |
| FAQ pratique | Rubrique « contact » des Informations du Centre (adresse, accès, parking, téléphone, e-mail) : lue par Kim, par la FAQ gratuite, par le pied de page et par la politique de confidentialité |
| Administration | Formulaires Salles et Formations étendus ; ces champs sont traduits automatiquement en EN/KO |
| Kim | Les nouvelles rubriques entrent dans son prompt ; un champ vide reste « non renseigné » (Kim n'invente rien) |
| **Journal des questions sans réponse** | Table `UNANSWERED_QUESTIONS` : à chaque « non renseigné », la question est notée (doublons regroupés et comptés, hors attaques et hors-sujet). Onglet admin « Questions sans réponse et qualité » : liste triée par fréquence, « Marquer traité », export CSV. C'est la liste de contenus à compléter chaque semaine |
| Modèles à remplir | `docs/corrections/modeles/fiches-salles.csv`, `fiches-formations.csv`, `faq-pratique.csv` : à faire remplir par le personnel, puis à saisir dans l'administration |

## 4.2 Contrôle qualité du catalogue (P2 « catalogue incohérent »)

`backend/src/utils/catalog-quality.js` (5 tests) + `GET /api/v1/admin/catalog-quality` + onglet admin. Il signale : fiches incomplètes (champ par champ), **photos partagées** par plusieurs fiches, **doublons probables** (noms identiques à l'article, au pluriel et à l'ordre des mots près), la liste des **types d'espace utilisés** (pour repérer le parking classé « Sport et grands événements »), et le rappel sur le texte dans les photos.
Côté site public : même fiche à lignes fixes pour tous les espaces et formations (« — » si non renseigné), cartes de même hauteur, bouton aligné en bas, description limitée à 4 lignes.

**Corrections de données à faire dans l'administration** (constats du rapport, non automatisables) :
- « Salle de Conférence principale » illustrée par la photo titrée « La salle polyvalente » : changer la photo.
- Salle de Classe / Salles de Formation TIC et Salle de Conférence / Salles Polyvalentes partagent une photo : une photo chacune, ou regrouper si ce sont les mêmes espaces.
- « Espace parking » classé « Sport et grands événements » : corriger le type.

## 4.3 Langue de la conversation (P2)

| Constat du rapport | Correction |
|---|---|
| Formulaire de pré-inscription (« Âge du candidat », « Envoyer la demande ») resté en français après une question en anglais | Chaque message de Kim mémorise sa langue ; `LanguageOverride` (`LanguageContext.jsx`) affiche ses formulaires, boutons et mentions dans **cette** langue, indépendamment du sélecteur du site. Les listes de salles/formations des formulaires sont aussi chargées dans cette langue |
| « Un agent du Centre a été prévenu » toujours en français | Même mécanisme : la mention suit la langue du message (FR/EN/KO) |
| Messages système (quota, escalade, panne, FAQ) | Déjà localisés par le serveur (livrable 2) |
| « TIC Center » au lieu de « ICT Centre » | Glossaire ajouté à l'instruction de traduction (TIC → ICT ; « Centre » à l'anglaise) et à celle de Kim. La migration `015` supprime les traductions anglaises déjà en cache qui contiennent « TIC Center » : elles sont retraduites à la prochaine visite |

Hors couverture : une conversation dans une langue sans traduction d'interface (espagnol, par ex.) garde la langue du sélecteur pour les formulaires.

## 4.4 Pied de page, horaires, finitions (P2/P3)

| Constat | Correction |
|---|---|
| Aucun pied de page, ni adresse, ni plan, ni téléphone, ni e-mail, ni réseaux sociaux, ni mentions légales | `SiteFooter.jsx` sur l'accueil, Mon espace et les pages légales : coordonnées (rubrique « contact »), lien **Plan d'accès** (Google Maps) sur l'adresse, liens sociaux (rubrique « réseaux sociaux », lien dans « URL de la source »), mentions légales et confidentialité |
| Deux bandeaux « Créez votre compte » | Un seul bandeau conservé (celui du milieu de page) |
| Horaires sans le dimanche | Le tableau affiche les 7 jours, dimanche « Fermé » (FR/EN/KO) ; la FAQ et Kim disent aussi « dimanche : fermé » |
| « équipements nécessaire sur chaque box » ; phrase « pour la recherche, formation, ... Avec » | Migration `015` : corrections ciblées sur le texte exact (sans effet s'il a déjà été modifié) |

## Ce que vous devez faire

1. `npm run migrate` (migration `015`).
2. Faire remplir les trois modèles CSV par le personnel, puis saisir les valeurs dans l'administration (Salles, Formations, Informations).
3. Remplacer les captures d'écran par de vraies photos, une par espace ; corriger les trois points de données listés en 4.2.
4. Consulter chaque semaine l'onglet « Questions sans réponse et qualité ».

## Limites

- Aucune donnée métier n'est inventée : tant que le Centre n'a pas saisi les tarifs, capacités et horaires, Kim répondra « non renseigné » (c'est voulu).
- Le contrôle qualité ne détecte pas le texte incrusté dans une image.
