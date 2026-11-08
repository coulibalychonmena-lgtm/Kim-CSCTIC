import test from 'node:test';
import assert from 'node:assert/strict';
import { computeQualityIndicators } from '../src/utils/quality-indicators.js';

test('taux, satisfaction et latence', () => {
  const indicators = computeQualityIndicators({ questions: '200', unanswered: '30', escalations: '4', thumbs_up: '45', thumbs_down: '5', latency_p50: '2100.4', latency_p95: '4890.7' });
  assert.deepEqual(indicators, { questions: 200, unanswered_rate: 0.15, escalation_rate: 0.02, satisfaction: 0.9, feedback_count: 50, latency_p50_ms: 2100, latency_p95_ms: 4891 });
});

test('sans données : null, jamais NaN ni division par zéro', () => {
  const indicators = computeQualityIndicators({ questions: '0', unanswered: '0', escalations: '0', thumbs_up: '0', thumbs_down: '0', latency_p50: null, latency_p95: null });
  assert.equal(indicators.unanswered_rate, null);
  assert.equal(indicators.satisfaction, null);
  assert.equal(indicators.latency_p95_ms, null);
});
