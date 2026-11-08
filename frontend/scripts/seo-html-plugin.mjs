// Plugin Vite : injecte l'adresse publique et les vérifications de propriété dans index.html ; retire les balises dont la valeur est inconnue
// (une balise canonique ou Open Graph vide ou fausse est pire qu'aucune balise). Testé dans tests/seo-html-plugin.test.mjs.
export function transformSeoHtml(html, { siteUrl = '', googleVerification = '', bingVerification = '' }) {
  const drop = (source, attribute) => source
    .replace(new RegExp(`<(meta|link)[^>]*${attribute}[^>]*>\\s*`, 'g'), '')
    .replace(new RegExp(`<script[^>]*${attribute}[^>]*>[\\s\\S]*?</script>\\s*`, 'g'), '');
  let result = html;
  result = siteUrl ? result.replace(/__SITE_URL__/g, siteUrl) : drop(result, 'data-needs-site-url');
  result = googleVerification ? result.replace('__GOOGLE_VERIFICATION__', googleVerification) : drop(result, 'data-needs-google-verification');
  result = bingVerification ? result.replace('__BING_VERIFICATION__', bingVerification) : drop(result, 'data-needs-bing-verification');
  return result
    .replace(/ data-needs-site-url/g, '').replace(/ data-needs-google-verification/g, '').replace(/ data-needs-bing-verification/g, '');
}

export const createSeoHtmlPlugin = (options) => ({ name: 'seo-html', transformIndexHtml: (html) => transformSeoHtml(html, options) });
