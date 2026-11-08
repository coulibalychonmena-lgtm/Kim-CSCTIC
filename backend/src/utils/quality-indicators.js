// Calcul des indicateurs de qualité de Kim à partir des compteurs SQL (fonction pure, testée).
const ratio = (numerator, denominator) => (denominator > 0 ? numerator / denominator : null);

export function computeQualityIndicators(row) {
  const questions = Number(row.questions);
  const up = Number(row.thumbs_up);
  const down = Number(row.thumbs_down);
  return {
    questions,
    unanswered_rate: ratio(Number(row.unanswered), questions),      // part des questions restées sans réponse
    escalation_rate: ratio(Number(row.escalations), questions),     // part des questions transmises à un agent
    satisfaction: ratio(up, up + down),                             // part de pouces hauts (null sans avis)
    feedback_count: up + down,
    latency_p50_ms: row.latency_p50 === null || row.latency_p50 === undefined ? null : Math.round(Number(row.latency_p50)),
    latency_p95_ms: row.latency_p95 === null || row.latency_p95 === undefined ? null : Math.round(Number(row.latency_p95)),
  };
}
