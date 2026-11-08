/**
 * Référencement (SEO) : fonctions pures, testées dans tests/seo.test.mjs. Utilisées par le composant <Seo /> (balises dynamiques),
 * par scripts/generate-seo-files.mjs (robots.txt, sitemap.xml, llms.txt) et par le contenu JSON-LD de l'accueil.
 */
export const SEO_LANGUAGES = ['fr', 'en', 'ko'];
export const DEFAULT_SEO_LANGUAGE = 'fr';
const OG_LOCALES = { fr: 'fr_CI', en: 'en_US', ko: 'ko_KR' };

/** Pages publiques à indexer ; tout le reste (chat, compte, administration) est en noindex. */
export const INDEXABLE_PATHS = ['/', '/mentions-legales', '/confidentialite'];

const stripSlash = (url) => String(url || '').replace(/\/+$/, '');

/** Adresse canonique : le français est la version par défaut (sans paramètre), les autres langues utilisent ?lang=. */
export function canonicalUrl(siteUrl, path, language = DEFAULT_SEO_LANGUAGE) {
  const base = `${stripSlash(siteUrl)}${path === '/' ? '/' : path}`;
  return language === DEFAULT_SEO_LANGUAGE ? base : `${base}?lang=${language}`;
}

/** Liens hreflang (une entrée par langue + x-default = français). */
export function hreflangLinks(siteUrl, path) {
  return [
    ...SEO_LANGUAGES.map((language) => ({ hreflang: language, href: canonicalUrl(siteUrl, path, language) })),
    { hreflang: 'x-default', href: canonicalUrl(siteUrl, path, DEFAULT_SEO_LANGUAGE) },
  ];
}

/** Balises <meta> / <link> d'une page. `noindex` : pages privées ou utilitaires. */
export function buildHeadTags({ siteUrl, path, language, title, description, noindex = false, imagePath = '/og-image.jpg', siteName = 'CSCTICAO' }) {
  const robots = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1';
  const tags = {
    title,
    meta: [
      { name: 'description', content: description },
      { name: 'robots', content: robots },
    ],
    links: [],
  };
  if (noindex) return tags;
  const url = canonicalUrl(siteUrl, path, language);
  const image = `${stripSlash(siteUrl)}${imagePath}`;
  tags.meta.push(
    { property: 'og:type', content: 'website' }, { property: 'og:site_name', content: siteName },
    { property: 'og:title', content: title }, { property: 'og:description', content: description },
    { property: 'og:url', content: url }, { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' }, { property: 'og:image:height', content: '630' },
    { property: 'og:locale', content: OG_LOCALES[language] ?? OG_LOCALES.fr },
    ...SEO_LANGUAGES.filter((other) => other !== language).map((other) => ({ property: 'og:locale:alternate', content: OG_LOCALES[other] })),
    { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description }, { name: 'twitter:image', content: image },
  );
  tags.links.push({ rel: 'canonical', href: url }, ...hreflangLinks(siteUrl, path).map((link) => ({ rel: 'alternate', ...link })));
  return tags;
}

// --- JSON-LD (données structurées) : uniquement ce que le Centre a saisi dans l'administration, rien d'inventé ---
const SCHEMA_DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const isContact = (entry) => /contact/i.test(entry.category);
const isSocial = (entry) => /r[ée]seau|social/i.test(entry.category);
const firstUrl = (entry) => [entry.source_url, entry.content].find((value) => /^https?:\/\//i.test(String(value || '').trim()))?.trim();
const matching = (entries, titlePattern) => entries.find((entry) => titlePattern.test(entry.title));

export function buildJsonLd({ siteUrl, name, alternateName = 'CSCTICAO', description, information = [], openingHours = [], events = [], logoPath = '/logo.png', imagePath = '/og-image.jpg' }) {
  const base = stripSlash(siteUrl);
  const contacts = information.filter(isContact);
  const address = matching(contacts, /adresse|address|주소|localisation|location/i);
  const phone = matching(contacts, /t[ée]l|phone|전화/i);
  const email = matching(contacts, /e-?mail|courriel|이메일/i);
  const sameAs = information.filter(isSocial).map(firstUrl).filter(Boolean);

  const place = {
    '@type': 'SportsActivityLocation',
    '@id': `${base}/#centre`,
    name, alternateName, description, url: `${base}/`,
    logo: `${base}${logoPath}`, image: `${base}${imagePath}`,
    ...(address ? { address: { '@type': 'PostalAddress', streetAddress: address.content, addressCountry: 'CI' } } : { address: { '@type': 'PostalAddress', addressCountry: 'CI' } }),
    ...(phone ? { telephone: phone.content } : {}),
    ...(email ? { email: email.content } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(openingHours.length ? {
      openingHoursSpecification: openingHours.map((day) => ({
        '@type': 'OpeningHoursSpecification', dayOfWeek: SCHEMA_DAYS[Number(day.day_of_week)],
        opens: String(day.open_time).slice(0, 5), closes: String(day.close_time).slice(0, 5),
      })),
    } : {}),
  };
  // Événements à venir publiés par le Centre (éligibles aux résultats enrichis seulement avec date et lieu : les autres sont ignorés).
  const eventNodes = events.filter((event) => event.title && event.starts_at && event.location).slice(0, 10).map((event) => ({
    '@type': 'Event', name: event.title, startDate: event.starts_at,
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: event.location, address: { '@type': 'PostalAddress', addressCountry: 'CI' } },
    ...(event.description ? { description: event.description } : {}),
    ...(/^https?:\/\//.test(event.image_url || '') ? { image: event.image_url } : {}),
    organizer: { '@id': `${base}/#centre` },
  }));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      place,
      ...eventNodes,
      { '@type': 'WebSite', '@id': `${base}/#site`, url: `${base}/`, name: alternateName, inLanguage: SEO_LANGUAGES, publisher: { '@id': `${base}/#centre` } },
    ],
  };
}

// --- Fichiers générés au build ---
const today = () => new Date().toISOString().slice(0, 10);

export function buildSitemap(siteUrl, date = today()) {
  const urls = INDEXABLE_PATHS.map((path) => {
    const alternates = hreflangLinks(siteUrl, path).map((link) => `    <xhtml:link rel="alternate" hreflang="${link.hreflang}" href="${link.href}"/>`).join('\n');
    return `  <url>\n    <loc>${canonicalUrl(siteUrl, path, DEFAULT_SEO_LANGUAGE)}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>${path === '/' ? 'weekly' : 'yearly'}</changefreq>\n    <priority>${path === '/' ? '1.0' : '0.3'}</priority>\n${alternates}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobots(siteUrl) {
  const lines = [
    // /chat, /connexion et les pages de mot de passe restent explorables : Google doit pouvoir lire leur balise « noindex ».
    // Seules les zones sans aucun lien public (administration, espace personnel) sont interdites.
    'User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /mon-espace', '',
  ];
  if (siteUrl) lines.push(`Sitemap: ${stripSlash(siteUrl)}/sitemap.xml`, '');
  return lines.join('\n');
}

/** llms.txt : résumé lisible par les assistants IA (convention émergente, sans effet négatif sur Google). */
export function buildLlmsTxt(siteUrl) {
  const base = stripSlash(siteUrl);
  return [
    '# CSCTICAO — Centre Sportif, Culturel et des TIC Ivoiro-Coréen Alassane Ouattara', '',
    "> Centre de coopération entre la Côte d'Ivoire et la République de Corée : sport (Taekwondo), culture coréenne et ivoirienne, technologies de l'information et de la communication (ICT).", '',
    '## Pages', '',
    `- [Accueil : salles à louer, formations, horaires, contact](${base}/)`,
    `- [Mentions légales](${base}/mentions-legales)`,
    `- [Politique de confidentialité](${base}/confidentialite)`, '',
    '## Services', '',
    '- Location de salles et d’espaces (gymnase, salles de formation, bibliothèque…)',
    '- Formations : Taekwondo, informatique, développement web, langue et culture coréennes',
    '- Partenariats techniques, financiers, événementiels et pédagogiques',
    '- Assistante virtuelle « Kim » (français, anglais, coréen) qui répond à partir des données officielles du Centre', '',
  ].join('\n');
}
