# Livrable 7 — Cartes de taille fixe, fiche complète, chat toujours visible, historique des conversations

Demandes faites après le test (captures de l'accueil et de la page de chat).

## 7.1 Cartes des espaces et formations : même taille, « Voir plus »

| Constat | Correction |
|---|---|
| Les cartes s'allongeaient selon la quantité d'équipements et de texte (un Gymnase de 12 lignes, une salle de 25 lignes) | Chaque carte a maintenant le **même gabarit** : photo 16/10, titre sur 2 lignes maximum, type sur 1 ligne, description sur 3 lignes maximum, une ligne de résumé (capacité · surface pour une salle ; public · horaires pour une formation) et les boutons alignés en bas |
| Pas de moyen de lire le reste | Bouton **« Voir plus »** : ouvre la **fiche complète** dans une fenêtre modale (`ItemDetailDialog.jsx`, élément `<dialog>` natif : focus géré, touche Échap, clic à l'extérieur pour fermer) avec grande photo, description entière, et toutes les rubriques **renseignées** |
| Contenu de la fiche d'une salle | Type, capacité, surface, équipements (en liste à puces), tarif, conditions d'utilisation, bouton Réserver |
| Contenu de la fiche d'une formation | Catégorie, public/âge, jours et horaires, durée, prix, prérequis, conditions d'inscription, places restantes, bouton S'inscrire |
| Rubriques non saisies | Elles **n'apparaissent pas** (plus de « — » partout) ; une fiche vide affiche un message neutre |
| Colonne « Salles et espaces » de la page de chat | Lignes compactes (miniature 64 × 48 px, nom, capacité) au lieu de grandes photos ; un clic ouvre la même fiche, et son bouton ouvre directement le formulaire dans le chat, pré-rempli |

Fichiers : `components/ItemDetailDialog.jsx`, `utils/detail-rows.js` (3 tests), `pages/LandingPage.jsx`, `components/Catalog.jsx`, styles `application-styles.css`.

## 7.2 Chat toujours visible

Sur écran large (à partir de 861 px), le chat et ses boutons rapides (Demande de salle, Inscription, Partenariat) **restent fixés en haut de l'écran** pendant que la colonne des espaces et des formations défile. Sur téléphone, le chat garde son affichage plein écran du livrable 5, avec le catalogue dessous.

## 7.3 Historique des conversations, avec suppression

| Fonction | Détail |
|---|---|
| Bouton **« Historique »** dans le chat | Liste des 30 dernières conversations de l'appareil (et du compte si le visiteur est connecté) : titre = première question, date, nombre d'échanges, mention « en cours » |
| Reprendre une conversation | Un clic l'ouvre et on peut continuer (le contexte est relu côté serveur) |
| **Supprimer une conversation** / **Tout supprimer** | Avec confirmation. Le contenu est **effacé définitivement** (messages, réponses, sources). Si la conversation supprimée est celle en cours, une nouvelle commence |
| Pourquoi la ligne technique est conservée | Le quota de 5 questions anonymes et le plafond par réseau (livrable 2) sont comptés sur ces lignes : si supprimer l'historique les effaçait, il suffirait de supprimer pour remettre le compteur à zéro. Seules restent des données techniques **anonymisées** (date, compteurs). La politique de confidentialité l'indique |
| Sécurité | Une conversation n'est listée ou supprimée que si elle appartient à l'identifiant d'appareil de l'appelant ou à son compte |

API : `GET /api/v1/chat/sessions`, `DELETE /api/v1/chat/session/:sessionId`, `DELETE /api/v1/chat/sessions` (paramètre `deviceId`). Migration `017` (`CHAT_LOGS.DELETED_AT`). Fichiers : `chat.service.js`, `chat.controller.js`, `HistoryPanel.jsx`, `ChatContext.jsx`, `ChatWindow.jsx`.

## À faire

1. `cd backend && npm run migrate` (migration `017`).
2. Vérifier à l'œil : cartes de même hauteur sur l'accueil, fenêtre « Voir plus », chat fixe pendant le défilement (écran large), historique (ouvrir, supprimer).

## Limites

- Ces écrans n'ont pas pu être lancés dans un navigateur ici (pas d'`npm install`) : la syntaxe et les tests passent, le rendu visuel est à contrôler.
- L'historique est lié à l'appareil (ou au compte) : changer de navigateur ou vider ses données sans compte fait perdre l'accès aux anciennes conversations. Se connecter les rattache au compte.
- Les messages échangés avec un agent du Centre (relais humain) ne sont pas effacés par la suppression de l'historique : ils font partie du suivi de la demande par le Centre.
