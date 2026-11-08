import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplyExtractor } from '../src/utils/json-reply-stream.js';

const feed = (json, size) => {
  const extractor = createReplyExtractor();
  let text = '';
  for (let start = 0; start < json.length; start += size) text += extractor.push(json.slice(start, start + size));
  return text;
};

test('reconstitue la réponse quel que soit le découpage du flux', () => {
  const json = JSON.stringify({ reply: 'Bonjour !\nLe Centre ouvre à 08h00. Dites « oui » ou "non".', language: 'fr', sources: [] });
  for (const size of [1, 2, 3, 5, 7, 16, 1000]) assert.equal(feed(json, size), 'Bonjour !\nLe Centre ouvre à 08h00. Dites « oui » ou "non".', `taille ${size}`);
});

test('gère les séquences \\u et le coréen', () => {
  const json = '{"reply":"\\uAC00\\uB098 센터는 일요일에 휴관입니다.","language":"ko"}';
  for (const size of [1, 4, 100]) assert.equal(feed(json, size), '가나 센터는 일요일에 휴관입니다.');
});

test('ne renvoie rien avant "reply" et s\'arrête à la fin de la valeur', () => {
  const extractor = createReplyExtractor();
  assert.equal(extractor.push('{"lang'), '');
  assert.equal(extractor.push('uage":"fr","reply":"Salut'), 'Salut');
  assert.equal(extractor.push(' tout le monde","sources":["x"]}'), ' tout le monde');
  assert.equal(extractor.done, true);
  assert.equal(extractor.push('encore'), '');
});

test('une réponse vide ou absente ne produit rien', () => {
  assert.equal(feed('{"reply":"","language":"fr"}', 3), '');
  assert.equal(feed('{"language":"fr"}', 3), '');
});
