import test from 'node:test';
import assert from 'node:assert/strict';
import { detailRows } from '../src/utils/detail-rows.js';

const translate = (key) => key;

test('fiche d\'une salle : seulement les lignes renseignées, équipements en liste', () => {
  const rows = detailRows('room', { space_type: 'Formation TIC', max_capacity: 30, surface_m2: null, equipment: ['30 ordinateurs', '3 écrans'], pricing: '', conditions: 'Caution demandée' }, translate);
  assert.deepEqual(rows.map(([label]) => label), ['lbl_type', 'capacity', 'lbl_equipment', 'lbl_conditions']);
  assert.deepEqual(rows.find(([label]) => label === 'lbl_equipment')[1], ['30 ordinateurs', '3 écrans']);
});

test('fiche d\'une formation : public, horaires, durée, prix, prérequis, places', () => {
  const rows = detailRows('activity', { category: 'Sport', age_range_label: null, age_min: 6, age_max: null, schedule: 'Samedi 9h-11h', duration: '3 mois', price: null, prerequisites: null, enrollment_conditions: 'Certificat médical', remaining_seats: 12 }, translate);
  assert.deepEqual(rows.map(([label]) => label), ['lbl_category', 'lbl_audience', 'lbl_schedule', 'lbl_duration', 'lbl_enrollment', 'lbl_seats']);
  assert.equal(rows.find(([label]) => label === 'lbl_audience')[1], '6–?');
});

test('une fiche vide ne produit aucune ligne', () => {
  assert.deepEqual(detailRows('room', { space_type: '', max_capacity: null, equipment: [] }, translate), []);
});
