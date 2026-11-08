import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformSeoHtml } from '../scripts/seo-html-plugin.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('avec l\'adresse publique : canonique, Open Graph et JSON-LD renseignés, aucun marqueur restant', () => {
  const result = transformSeoHtml(html, { siteUrl: 'https://kim.exemple.ci', googleVerification: 'abc123', bingVerification: 'xyz789' });
  assert.match(result, /<link rel="canonical" href="https:\/\/kim\.exemple\.ci\/"/);
  assert.match(result, /og:image" content="https:\/\/kim\.exemple\.ci\/og-image\.jpg"/);
  assert.match(result, /"@id":"https:\/\/kim\.exemple\.ci\/#centre"/);
  assert.match(result, /google-site-verification" content="abc123"/);
  assert.match(result, /msvalidate\.01" content="xyz789"/);
  assert.doesNotMatch(result, /__SITE_URL__|__GOOGLE_VERIFICATION__|__BING_VERIFICATION__|data-needs/);
});

test('sans adresse : les balises qui en dépendent sont retirées, le reste (titre, description, contenu) est conservé', () => {
  const result = transformSeoHtml(html, {});
  assert.doesNotMatch(result, /canonical|og:|twitter:|ld\+json|google-site-verification|msvalidate|__|data-needs/);
  assert.match(result, /<title>CSCTICAO/);
  assert.match(result, /name="description"/);
  assert.match(result, /<h1>Centre Sportif/);
  assert.match(result, /<script type="module" src="\/src\/main\.jsx">/);
});

test('le JSON-LD statique reste un JSON valide une fois l\'adresse injectée', () => {
  const result = transformSeoHtml(html, { siteUrl: 'https://kim.exemple.ci' });
  const json = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(result)[1];
  assert.equal(JSON.parse(json)['@graph'].length, 2);
});
