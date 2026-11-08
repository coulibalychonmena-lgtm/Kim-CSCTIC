import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOpeningHours, formatContacts } from '../src/utils/faq-texts.js';

const hours = [1, 2, 3, 4, 5].map((day) => ({ day_of_week: day, open_time: '08:00', close_time: '18:00' })).concat({ day_of_week: 6, open_time: '09:00', close_time: '13:00' });

test('les horaires affichent le dimanche « fermé » (le tableau du rapport l\'omettait)', () => {
  const french = formatOpeningHours(hours, 'fr');
  assert.match(french, /- Lundi : 08h00–18h00/);
  assert.match(french, /- Samedi : 09h00–13h00/);
  assert.match(french, /- Dimanche : fermé/);
  assert.match(formatOpeningHours(hours, 'en'), /- Sunday : closed/);
  assert.match(formatOpeningHours(hours, 'ko'), /- 일요일 : 휴관/);
});

test('langue inconnue : anglais ; données vides : message honnête, rien d\'inventé', () => {
  assert.match(formatOpeningHours(hours, 'es'), /Monday/);
  assert.match(formatOpeningHours([], 'fr'), /pas encore renseignés/);
  assert.match(formatContacts([], 'en'), /have not been entered/);
  assert.match(formatContacts([{ title: 'Téléphone', content: '+225 00 00' }], 'fr'), /- Téléphone : \+225 00 00/);
});
