// Génère robots.txt, sitemap.xml et llms.txt dans public/ avant le build (adresse publique : VITE_SITE_URL).
// Sans VITE_SITE_URL : robots.txt sans ligne « Sitemap », pas de sitemap ni de llms.txt (rien d'inventé).
import { writeFile, rm } from 'node:fs/promises';
import { buildLlmsTxt, buildRobots, buildSitemap } from '../src/utils/seo.js';

const siteUrl = (process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
await writeFile('public/robots.txt', buildRobots(siteUrl));
if (siteUrl) {
  await writeFile('public/sitemap.xml', buildSitemap(siteUrl));
  await writeFile('public/llms.txt', buildLlmsTxt(siteUrl));
  console.log(`[SEO] robots.txt, sitemap.xml et llms.txt générés pour ${siteUrl}`);
} else {
  await Promise.all([rm('public/sitemap.xml', { force: true }), rm('public/llms.txt', { force: true })]);
  console.warn('[SEO] VITE_SITE_URL absent : robots.txt généré sans sitemap. Définissez-le (ex. https://kim-web.onrender.com) pour être indexé correctement.');
}
