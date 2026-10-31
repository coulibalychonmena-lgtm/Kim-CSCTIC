import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

const STATISTICS_LABELS = [
  ['pending_room_requests', 'Demandes de salles en attente'],
  ['registrations_this_month', 'Inscriptions du mois'],
  ['new_partnerships', 'Partenariats non traités'],
  ['flagged_chats', 'Conversations à reprendre'],
];

export default function StatsBar() {
  const { token } = useAuth();
  const { data: statistics, error } = useAutoRefreshingData(() => adminService.getStatistics(token), [token]);
  if (error) return <p className="form-error" role="alert">{error}</p>;
  return (
    <dl className="stats">
      {STATISTICS_LABELS.map(([statisticKey, label]) => (
        <div key={statisticKey} className="stats__item">
          <dd>{statistics ? statistics[statisticKey] : '…'}</dd>
          <dt>{label}</dt>
        </div>
      ))}
    </dl>
  );
}
