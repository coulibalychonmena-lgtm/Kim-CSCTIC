import test from 'node:test';
import assert from 'node:assert/strict';
import { createSseParser } from '../src/utils/sse.js';
import { parseInline, parseMarkdown } from '../src/utils/markdown.js';

test('SSE : événements complets, événement coupé entre deux morceaux, \\r\\n', () => {
  const parser = createSseParser();
  assert.deepEqual(parser.push('event: delta\ndata: {"text":"Bon'), []);
  assert.deepEqual(parser.push('jour"}\n\nevent: done\r\ndata: {"reply":"Bonjour"}\r\n\r\n'), [
    { event: 'delta', data: { text: 'Bonjour' } }, { event: 'done', data: { reply: 'Bonjour' } },
  ]);
  assert.deepEqual(parser.push('event: delta\ndata: pas du json\n\n'), []);
});

test('Markdown : la liste « -Du lundi… » du rapport devient une vraie liste', () => {
  const blocks = parseMarkdown('Nos horaires :\n-Du lundi au vendredi : 08h00 à 18h00\n-Le samedi : 09h00 à 13h00\nLe Centre est fermé le dimanche.');
  assert.deepEqual(blocks.map((block) => block.type), ['paragraph', 'ul', 'paragraph']);
  assert.equal(blocks[1].items.length, 2);
});

test('Markdown : numérotées, gras, italique, code, liens https', () => {
  assert.equal(parseMarkdown('1. un\n2. deux')[0].type, 'ol');
  assert.deepEqual(parseInline('a **gras** b *it* `c`').map((segment) => segment.type), ['text', 'strong', 'text', 'em', 'text', 'code']);
  assert.deepEqual(parseInline('[site](https://cscticao.ci)')[0], { type: 'link', text: 'site', href: 'https://cscticao.ci' });
});

test('Markdown : aucun HTML ni lien dangereux n\'est interprété', () => {
  const segments = parseInline('<img src=x onerror=alert(1)> [clic](javascript:alert(1)) [ok](data:text/html,x)');
  assert.ok(segments.every((segment) => segment.type === 'text'), 'tout reste du texte brut');
  assert.equal(parseMarkdown('<script>alert(1)</script>')[0].type, 'paragraph');
});

test('Markdown : un titre en gras en début de ligne n\'est pas pris pour une puce', () => {
  assert.equal(parseMarkdown('**Horaires** : lundi')[0].type, 'paragraph');
});
