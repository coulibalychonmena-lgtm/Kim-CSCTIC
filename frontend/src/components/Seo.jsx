import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { buildHeadTags, buildJsonLd } from '../utils/seo.js';

const SITE_URL = (import.meta.env.VITE_SITE_URL || '').trim();

function upsert(selector, create, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) { element = document.createElement(create); element.setAttribute('data-seo', 'true'); document.head.appendChild(element); }
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
}

/**
 * Titre, description, robots, canonique, hreflang, Open Graph, Twitter et JSON-LD d'une page, dans la langue de l'interface.
 * `page` désigne les textes seo_<page>_title / seo_<page>_desc. `noindex` : pages privées ou utilitaires (chat, compte, admin, 404).
 * `jsonLd` : données structurées facultatives (accueil : coordonnées et horaires saisis par le Centre).
 */
export default function Seo({ page, path, noindex = false, structuredData = null }) {
  const { lang, translate } = useLanguage();
  const title = translate(`seo_${page}_title`);
  const description = translate(`seo_${page}_desc`);

  useEffect(() => {
    const siteUrl = SITE_URL || window.location.origin;
    const tags = buildHeadTags({ siteUrl, path, language: lang, title, description, noindex });
    document.title = tags.title;
    document.documentElement.lang = lang;
    // Les balises de la page précédente (canonique, hreflang, Open Graph…) sont retirées avant d'écrire les nouvelles.
    document.head.querySelectorAll('[data-seo-dynamic]').forEach((element) => element.remove());
    upsert('meta[name="description"]', 'meta', { name: 'description', content: description });
    tags.meta.forEach((entry) => {
      const key = entry.name ? `name="${entry.name}"` : `property="${entry.property}"`;
      const isMultiple = entry.property === 'og:locale:alternate';
      if (isMultiple) {
        const element = document.createElement('meta');
        element.setAttribute('data-seo-dynamic', 'true');
        Object.entries(entry).forEach(([name, value]) => element.setAttribute(name, value));
        document.head.appendChild(element);
      } else upsert(`meta[${key}]`, 'meta', entry);
    });
    tags.links.forEach((link) => {
      const element = document.createElement('link');
      element.setAttribute('data-seo-dynamic', 'true');
      Object.entries(link).forEach(([name, value]) => element.setAttribute(name, value));
      document.head.appendChild(element);
    });
    // Sur une page non indexable, on retire les balises sociales laissées par une page précédente.
    if (noindex) document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((element) => element.remove());

    document.head.querySelector('script[data-seo-jsonld]')?.remove();
    if (structuredData && !noindex) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo-jsonld', 'true');
      script.textContent = JSON.stringify(buildJsonLd({ siteUrl, name: translate('brand_full'), description, ...structuredData }));
      document.head.appendChild(script);
    }
  }, [lang, title, description, path, noindex, structuredData, translate]);

  return null;
}
