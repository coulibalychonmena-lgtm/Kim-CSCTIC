# Livrables et recette — Projet Kim / CSCTICAO

Coché = livré et vérifié statiquement (syntaxe, import des modules, validation des données, build du frontend).
Les tests contre de vrais services (Snowflake, Gemini, Render) restent à faire avec vos clés.

## Livrables
- [x] **Structure Snowflake** : `database/migrations/001_create_operational_tables.sql` (7 tables du TDR §4) et `002_create_center_information_tables.sql` (informations du Centre, horaires). Aucune donnée n'est insérée.
- [x] **Backend Express (MVC / services)** : configuration, contrôleurs, services, middlewares (JWT, validation, erreurs, CORS), routes du TDR §5.2.
- [x] **Gestion des données par l'administration** : création, modification et suppression des salles, formations, informations du Centre et horaires, depuis l'interface `/admin`, sans modifier le code.
- [x] **Assistant Kim** : service Gemini, prompt système (TDR §7.1), sorties JSON structurées, création de demandes sans jamais les confirmer.
- [x] **Frontend visiteur** : chat, 3 langues, sources, badge orange, raccourcis, 3 formulaires, catalogue lu en direct.
- [x] **Tableau de bord admin** : métriques, 4 onglets de traitement des demandes, 3 onglets de gestion des données.
- [x] **Photos Cloudinary** : envoi par l'admin, affichage sur le site et par Kim à la demande du visiteur.
- [x] **Connexion admin par variables d'environnement** ; aucun lien vers l'administration sur le site public.
- [x] **Assistance humaine** : reprise en main d'une conversation, réponse de l'agent dans le chat du visiteur, restitution à Kim.
- [x] **Déploiement** : `render.yaml`, variables d'environnement, README.

## Recette finale (TDR §8.2) — à cocher après déploiement
- [ ] Application en ligne via une URL Render
- [ ] Kim répond en français, anglais et coréen
- [ ] Après saisie de 5 formations et des salles par l'administration, Kim s'appuie dessus
- [ ] Une demande de salle affiche « En attente de validation humaine »
- [ ] La demande apparaît dans le tableau de bord (actualisation sous 15 s)
- [ ] L'administrateur change le statut dans Snowflake et consulte l'historique
- [ ] Aucune donnée codée en dur : tout passe par Node.js et Snowflake
