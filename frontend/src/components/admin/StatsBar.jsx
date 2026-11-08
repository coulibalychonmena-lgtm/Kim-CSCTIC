import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

const STATISTICS_LABELS = [
  ['pending_room_requests', 'Demandes de salles en attente'],
  ['registrations_this_month', 'Inscriptions du mois'],
  ['new_partnerships', 'Partenariats non traités'],
  ['flagged_chats', 'Conversations à reprendre'],
];

const percent = (rate) => (rate === null || rate === undefined ? '—' : `${Math.round(rate * 100)} %`);
const seconds = (milliseconds) => (milliseconds === null || milliseconds === undefined ? '—' : `${(milliseconds / 1000).toFixed(1)} s`);

export default function StatsBar() {
  const { token } = useAuth();
  const { data: statistics, error } = useAutoRefreshingData(() => adminService.getStatistics(token), [token]);
  if (error) return <p className="form-error" role="alert">{error}</p>;
  return (
    <>
    <dl className="stats">
      {STATISTICS_LABELS.map(([statisticKey, label]) => (
        <div key={statisticKey} className="stats__item">
          <dd>{statistics ? statistics[statisticKey] : '…'}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
    {statistics?.quality && (
      <>
        <h2 className="stats__title">Qualité de Kim — 30 derniers jours ({statistics.quality.questions} questions)</h2>
        <dl className="stats">
          {[
            ['Questions sans réponse', percent(statistics.quality.unanswered_rate)],
            ['Transmises à un agent', percent(statistics.quality.escalation_rate)],
            [`Satisfaction (${statistics.quality.feedback_count} avis)`, percent(statistics.quality.satisfaction)],
            ['Temps de réponse médian', seconds(statistics.quality.latency_p50_ms)],
            ['Temps de réponse p95 (cible < 5 s)', seconds(statistics.quality.latency_p95_ms)],
          ].map(([label, value]) => (
            <div key={label} className="stats__item"><dd>{value}</dd><dt>{label}</dt></div>
          ))}
        </dl>
      </>
    )}
    </>
  );
}
