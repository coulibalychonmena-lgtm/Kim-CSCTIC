import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCatalogQuality, questionKey } from '../src/utils/catalog-quality.js';

const room = (overrides) => ({ name: 'Salle', space_type: 'Formation', max_capacity: 30, surface_m2: 40, equipment: ['TV'], description: 'x', pricing: 'p', conditions: 'c', image_url: 'https://img/a.jpg', ...overrides });
const kinds = (issues) => issues.map((issue) => issue.kind);

test('repère les photos partagées (cas du rapport : classe/TIC, conférence/polyvalente)', () => {
  const issues = analyzeCatalogQuality([room({ name: 'Salle de Classe', image_url: 'https://img/1.jpg' }), room({ name: 'Salles de Formation TIC', image_url: 'https://img/1.jpg' }), room({ name: 'Bibliothèque', image_url: 'https://img/2.jpg' })], []);
  const shared = issues.filter((issue) => issue.kind === 'photo_partagee');
  assert.equal(shared.length, 1);
  assert.match(shared[0].subject, /Salle de Classe.*Salles de Formation TIC/);
});

test('fiches incomplètes : seul ce qui manque est listé, rien n\'est inventé', () => {
  const issues = analyzeCatalogQuality([room({ name: 'Salle de Conférence', max_capacity: null, pricing: '' })], [{ title: 'Taekwondo', description: 'd', age_range_label: 'Tous', schedule: null, duration: null, price: null, prerequisites: null, image_url: 'https://img/t.jpg' }]);
  const roomIssue = issues.find((issue) => issue.subject.includes('Salle de Conférence'));
  assert.match(roomIssue.message, /capacité/);
  assert.match(roomIssue.message, /tarif indicatif/);
  assert.doesNotMatch(roomIssue.message, /équipements/);
  assert.match(issues.find((issue) => issue.subject.includes('Taekwondo')).message, /jours et horaires, durée, prix, prérequis/);
});

test('doublons probables malgré articles, accents et pluriels', () => {
  const issues = analyzeCatalogQuality([room({ name: 'Salle Polyvalente', image_url: 'https://img/1' }), room({ name: 'Les salles polyvalentes', image_url: 'https://img/2' }), room({ name: 'Gymnase', image_url: 'https://img/3' })], []);
  assert.ok(kinds(issues).includes('doublon_probable'));
});

test('les types utilisés sont listés pour détecter un parking classé « Sport »', () => {
  const issues = analyzeCatalogQuality([room({ name: 'Espace parking', space_type: 'Sport et grands événements' }), room({ name: 'Gymnase', space_type: 'Sport et grands événements', image_url: 'https://img/9' })], []);
  assert.match(issues.find((issue) => issue.kind === 'types_utilises').message, /Sport et grands événements \(2\)/);
});

test('rappel sur le texte incrusté dans les photos, et clé de regroupement des questions', () => {
  assert.ok(kinds(analyzeCatalogQuality([room({})], [])).includes('texte_dans_les_photos'));
  assert.equal(questionKey('Quel est le TARIF de la salle de conférence ?'), questionKey('quel est le tarif de la salle de conference'));
});
