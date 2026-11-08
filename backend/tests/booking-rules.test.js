import test from 'node:test';
import assert from 'node:assert/strict';
import { guardianProblem, slotProblem, isoDayOfWeek } from '../src/utils/booking-rules.js';

test('un mineur doit fournir le nom et l\'accord d\'un parent ou tuteur', () => {
  assert.equal(guardianProblem({ age: 18 }), null);
  assert.equal(guardianProblem({ age: 35 }), null);
  assert.equal(guardianProblem({ age: 9 }).field, 'guardian_name');
  assert.equal(guardianProblem({ age: 9, guardian_name: '  ' }).field, 'guardian_name');
  assert.equal(guardianProblem({ age: 9, guardian_name: 'Mme Koné' }).field, 'guardian_consent');
  assert.equal(guardianProblem({ age: 9, guardian_name: 'Mme Koné', guardian_consent: true }), null);
});

test('créneau : dimanche fermé, 22 h refusé, créneau dans les horaires accepté', () => {
  const weekday = { open_time: '08:00', close_time: '18:00' };
  assert.equal(slotProblem({ openingDay: null, anyHoursConfigured: true, startTime: '10:00', endTime: '11:00' }).field, 'requested_date');
  assert.equal(slotProblem({ openingDay: weekday, anyHoursConfigured: true, startTime: '20:00', endTime: '22:00' }).field, 'start_time');
  assert.equal(slotProblem({ openingDay: weekday, anyHoursConfigured: true, startTime: '07:00', endTime: '09:00' }).field, 'start_time');
  assert.equal(slotProblem({ openingDay: weekday, anyHoursConfigured: true, startTime: '08:00', endTime: '18:00' }), null);
  assert.equal(slotProblem({ openingDay: null, anyHoursConfigured: false, startTime: '10:00', endTime: '11:00' }), null, 'aucun horaire saisi : on n\'affirme rien');
});

test('jour ISO : dimanche = 7', () => {
  assert.equal(isoDayOfWeek('2026-11-08'), 7);
  assert.equal(isoDayOfWeek('2026-11-09'), 1);
});
