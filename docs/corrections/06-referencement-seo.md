# Livrable 6 — Référencement (Google, Bing et autres moteurs)

**Objectif :** que le site du CSCTICAO soit exploré, indexé et bien présenté dans les moteurs de recherche et dans les aperçus de partage (WhatsApp, Facebook, LinkedIn…).
**Statut : code livré et testé (18 tests frontend, 41 backend). L'indexation elle-même dépend de votre adresse publique, de la déclaration à Google et du temps : voir « À faire ».**

## Ce qui a été ajouté dans le projet

| Élément | Fichier(s) | Effet |
|---|---|---|
| Titre, description, `robots`, **canonique**, **hreflang** (fr/en/ko + x-default), **Open Graph**, **Twitter**, par page et par langue | `frontend/src/components/Seo.jsx`, `utils/seo.js`, textes `seo_*` dans `i18n/extra-translations.js` | Chaque page a son titre/description dans la langue choisie ; les versions `?lang=en` et `?lang=ko` sont déclarées à Google comme traductions |
| **Langue dans l'adresse** `?lang=en` / `?lang=ko` | `LanguageContext.jsx` | Chaque langue a une adresse partageable et indexable |
| **Données structurées JSON-LD** | `utils/seo.js` (`buildJsonLd`), accueil | `SportsActivityLocation` + `WebSite` + `Event`, construits **uniquement** avec ce que le Centre a saisi (adresse, téléphone, e-mail, réseaux sociaux, horaires d'ouverture, événements publiés avec date et lieu). Rien d'inventé |
| Contenu lisible **sans JavaScript** | `frontend/index.html` | Titre, h1, services et liens dans le HTML de départ (les robots et les aperçus de partage n'attendent pas React) ; React le remplace au chargement |
| `robots.txt`, `sitemap.xml` (3 pages × 4 variantes de langue, `lastmod`), `llms.txt` (résumé pour assistants IA) | `scripts/generate-seo-files.mjs`, lancé par `npm run build` | Générés avec l'adresse publique ; **sans `VITE_SITE_URL`, aucun sitemap n'est produit** (rien de faux) |
| Balises dépendant de l'adresse publique, **vérifications de propriété** Google/Bing | `scripts/seo-html-plugin.mjs` (3 tests) | Injectées au build, retirées si la valeur est inconnue |
| **Image de partage** 1200×630 | `frontend/public/og-image.jpg` | Aperçu propre sur WhatsApp, Facebook, LinkedIn |
| Pages privées en `noindex` | `Seo noindex` sur chat, connexion, mot de passe, Mon espace, admin ; `robots.txt` interdit `/admin` et `/mon-espace` | Elles n'apparaissent pas dans Google. `/chat` et `/connexion` restent explorables pour que Google lise leur `noindex` |
| Vraie page **404** en `noindex` | `NotFoundPage.jsx` | Plus de redirection silencieuse vers l'accueil (mauvais signal) |
| **L'API est exclue** des moteurs | `backend/src/middlewares/robots.middleware.js` | `X-Robots-Tag: noindex` sur toutes les réponses et `robots.txt` « Disallow: / » |
| Le service worker ne masque plus `sitemap.xml`, `robots.txt`, `llms.txt` | `vite.config.js` (`navigateFallbackDenylist`) | Un visiteur déjà venu ne reçoit plus l'application à la place de ces fichiers |
| Vitesse (critère de classement) | `render.yaml` : cache longue durée des fichiers (`/assets/*`, images), en-têtes de sécurité ; `preconnect` Cloudinary ; images WebP/`srcset` (livrable 5) | Meilleurs scores Core Web Vitals |

## À faire, dans l'ordre

1. **Choisir l'adresse définitive.** L'idéal est un nom de domaine propre (par exemple `cscticao.ci`), plus crédible et durable qu'une adresse `.onrender.com`. Dans Render : `kim-web` → *Settings* → *Custom Domains*, puis suivre les enregistrements DNS demandés. **Changer d'adresse plus tard fait perdre le classement acquis : décidez avant de demander l'indexation.**
2. **Renseigner `VITE_SITE_URL`** sur `kim-web` (par exemple `https://cscticao.ci`, sans slash final) et redéployer. Vérifiez ensuite `https://votre-site/robots.txt`, `/sitemap.xml` et `/og-image.jpg`. Sur `kim-api`, vérifiez aussi `FRONTEND_URL` et `PUBLIC_SITE_URL`.
3. **Google Search Console** (search.google.com/search-console) :
   - ajouter la propriété « Préfixe d'URL » avec votre adresse ;
   - choisir la validation par **balise HTML** : copier la valeur de `content="…"` dans `VITE_GOOGLE_SITE_VERIFICATION` sur `kim-web`, redéployer, puis cliquer sur *Valider* ;
   - *Sitemaps* → envoyer `sitemap.xml` ;
   - *Inspection de l'URL* → coller l'accueil → *Demander une indexation*.
4. **Bing Webmaster Tools** (bing.com/webmasters) : importer la propriété depuis Search Console (ou utiliser `VITE_BING_SITE_VERIFICATION`), envoyer le sitemap. Bing alimente aussi DuckDuckGo, Ecosia et Yahoo.
5. **Google Business Profile** (business.google.com) : créer la fiche du Centre avec adresse, téléphone, horaires, catégorie (centre sportif / centre culturel), photos et l'adresse du site. C'est le levier le plus fort pour les recherches du type « centre sportif + ville » et pour Google Maps.
6. **Saisir les informations de contact** dans l'administration (rubrique « contact » : adresse, téléphone, e-mail ; rubrique « réseaux sociaux » avec le lien dans « URL de la source »). Elles alimentent le pied de page, la fiche structurée et les moteurs. Sans elles, le JSON-LD reste minimal.
7. **Tester** : [Test des résultats enrichis](https://search.google.com/test/rich-results) sur l'accueil (données structurées), [PageSpeed Insights](https://pagespeed.web.dev/) (vitesse mobile), et coller l'adresse dans WhatsApp pour voir l'aperçu.
8. **Obtenir des liens** vers le site : pages officielles (ministères, ambassade, partenaires coréens), réseaux sociaux du Centre, annuaires locaux. C'est ce qui fait la différence après la mise en place technique.
9. **Patience et suivi** : l'indexation prend de quelques jours à quelques semaines. Search Console (*Pages*, *Performances*) dit ce qui est indexé et pour quelles recherches.

## Limites et points de vigilance

- **Site en React** : Google exécute le JavaScript, mais les salles et formations viennent de l'API. Si l'API (offre Render gratuite) dort au moment du passage du robot, ces blocs peuvent manquer. Le contenu de départ de `index.html` garantit un minimum lisible ; la vraie solution est une **offre Render payante** (ou le keep-alive du livrable 5). Un pré-rendu complet des pages n'a pas été ajouté : il demanderait un outil supplémentaire et un test dans un vrai environnement.
- **Pages indexables : trois seulement** (accueil, mentions légales, confidentialité). Le reste est un outil (chat, compte), sans valeur pour un moteur. Pour gagner en visibilité, le levier est d'ajouter du **contenu public réel** : pages par formation et par salle, actualités, FAQ. Je peux les ajouter si vous le souhaitez.
- Les textes `seo_*` ne mentionnent aucune ville, car l'adresse du Centre n'est pas dans le projet : ajoutez-la dans les textes une fois connue pour mieux cibler les recherches locales.
- Aucune garantie de classement : ces mesures rendent le site **indexable et bien décrit**, elles ne décident pas de sa position.
