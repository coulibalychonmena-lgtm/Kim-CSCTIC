import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeadTags, buildJsonLd, buildLlmsTxt, buildRobots, buildSitemap, canonicalUrl, hreflangLinks } from '../src/utils/seo.js';

const SITE = 'https://kim.cscticao.ci/';

test('canonique : français sans paramètre, autres langues avec ?lang=, slash final ignoré', () => {
  assert.equal(canonicalUrl(SITE, '/', 'fr'), 'https://kim.cscticao.ci/');
  assert.equal(canonicalUrl(SITE, '/', 'ko'), 'https://kim.cscticao.ci/?lang=ko');
  assert.equal(canonicalUrl(SITE, '/confidentialite', 'en'), 'https://kim.cscticao.ci/confidentialite?lang=en');
});

test('hreflang : trois langues + x-default vers le français', () => {
  const links = hreflangLinks(SITE, '/');
  assert.deepEqual(links.map((link) => link.hreflang), ['fr', 'en', 'ko', 'x-default']);
  assert.equal(links.at(-1).href, 'https://kim.cscticao.ci/');
});

test('page publique : indexable, canonique, Open Graph, Twitter', () => {
  const tags = buildHeadTags({ siteUrl: SITE, path: '/', language: 'en', title: 'T', description: 'D' });
  const meta = (key) => tags.meta.find((entry) => entry.name === key || entry.property === key)?.content;
  assert.match(meta('robots'), /^index, follow/);
  assert.equal(meta('og:url'), 'https://kim.cscticao.ci/?lang=en');
  assert.equal(meta('og:image'), 'https://kim.cscticao.ci/og-image.jpg');
  assert.equal(meta('og:locale'), 'en_US');
  assert.equal(meta('twitter:card'), 'summary_large_image');
  assert.equal(tags.links.find((link) => link.rel === 'canonical').href, 'https://kim.cscticao.ci/?lang=en');
});

test('page privée : noindex, sans canonique ni Open Graph', () => {
  const tags = buildHeadTags({ siteUrl: SITE, path: '/mon-espace', language: 'fr', title: 'T', description: 'D', noindex: true });
  assert.equal(tags.meta.find((entry) => entry.name === 'robots').content, 'noindex, nofollow');
  assert.equal(tags.links.length, 0);
  assert.equal(tags.meta.some((entry) => entry.property), false);
});

test('JSON-LD : seulement les données saisies par le Centre', () => {
  const empty = buildJsonLd({ siteUrl: SITE, name: 'Centre', description: 'd' });
  const place = empty['@graph'][0];
  assert.equal(place.telephone, undefined);
  assert.equal(place.openingHoursSpecification, undefined);
  assert.deepEqual(place.address, { '@type': 'PostalAddress', addressCountry: 'CI' });

  const full = buildJsonLd({
    siteUrl: SITE, name: 'Centre', description: 'd',
    information: [
      { category: 'contact', title: 'Adresse', content: 'Cocody, Abidjan' }, { category: 'contact', title: 'Téléphone', content: '+225 00 00 00 00' },
      { category: 'contact', title: 'E-mail', content: 'info@exemple.ci' }, { category: 'réseaux sociaux', title: 'Facebook', content: '', source_url: 'https://facebook.com/x' },
    ],
    openingHours: [{ day_of_week: 1, open_time: '08:00:00', close_time: '18:00:00' }, { day_of_week: 6, open_time: '09:00', close_time: '13:00' }],
  })['@graph'][0];
  assert.equal(full.address.streetAddress, 'Cocody, Abidjan');
  assert.equal(full.telephone, '+225 00 00 00 00');
  assert.deepEqual(full.sameAs, ['https://facebook.com/x']);
  assert.deepEqual(full.openingHoursSpecification.map((day) => [day.dayOfWeek, day.opens, day.closes]), [['Monday', '08:00', '18:00'], ['Saturday', '09:00', '13:00']]);
});

test('sitemap : 3 pages, 4 alternates chacune ; robots : privé interdit, sitemap annoncé seulement si l\'adresse est connue', () => {
  const sitemap = buildSitemap(SITE, '2026-11-08');
  assert.equal((sitemap.match(/<url>/g) || []).length, 3);
  assert.equal((sitemap.match(/hreflang=/g) || []).length, 12);
  assert.match(sitemap, /<loc>https:\/\/kim\.cscticao\.ci\/mentions-legales<\/loc>/);
  assert.match(sitemap, /<lastmod>2026-11-08<\/lastmod>/);
  const robots = buildRobots(SITE);
  for (const path of ['/admin', '/mon-espace']) assert.match(robots, new RegExp(`Disallow: ${path}\\n`));
  assert.doesNotMatch(robots, /Disallow: \/chat/, 'les pages en noindex restent lisibles par Google');
  assert.match(robots, /Sitemap: https:\/\/kim\.cscticao\.ci\/sitemap\.xml/);
  assert.doesNotMatch(buildRobots(''), /Sitemap/);
  assert.match(buildLlmsTxt(SITE), /\]\(https:\/\/kim\.cscticao\.ci\/confidentialite\)/);
});

test('JSON-LD : événements publiés avec date et lieu seulement', () => {
  const graph = buildJsonLd({ siteUrl: SITE, name: 'Centre', description: 'd', events: [
    { title: 'Tournoi de Taekwondo', starts_at: '2026-12-12T09:00:00Z', location: 'Gymnase', description: 'Finale', image_url: 'https://res.cloudinary.com/x/a.jpg' },
    { title: 'Sans lieu', starts_at: '2026-12-13T09:00:00Z', location: '' },
  ] })['@graph'];
  const events = graph.filter((node) => node['@type'] === 'Event');
  assert.equal(events.length, 1);
  assert.equal(events[0].location.name, 'Gymnase');
  assert.equal(events[0].organizer['@id'], 'https://kim.cscticao.ci/#centre');
});
