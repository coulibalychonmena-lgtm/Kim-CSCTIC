import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import StatusBadge from '../StatusBadge.jsx';
import ContactButton from './ContactButton.jsx';
import { useAutoRefreshingData, formatDateTime } from './useAutoRefreshingData.js';

const ARCHIVED_STATUS = 'Archivé';
const PARTNERSHIP_STATUSES = ['Nouveau', "En cours d'étude", 'Traité', ARCHIVED_STATUS];

export default function PartnershipRequestsTab() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const { data: partnerships, loading, error: loadError, reload } = useAutoRefreshingData(
    () => adminService.listPartnerships(token, statusFilter),
    [token, statusFilter],
  );

  const changePartnershipStatus = async (partnershipId, status) => {
    setActionError('');
    try { await adminService.updatePartnership(token, partnershipId, status); await reload(); } catch (error) { setActionError(error.message); }
  };

  return (
    <section aria-labelledby="partnership-requests-title">
      <div className="toolbar">
        <h2 id="partnership-requests-title">Propositions de partenariat</h2>
        <label className="toolbar__filter">Statut
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tous</option>
            {PARTNERSHIP_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {(actionError || loadError) && <p className="form-error" role="alert">{actionError || loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {partnerships && partnerships.length === 0 && <p className="muted">Aucune proposition.</p>}
      <div className="cards">
        {partnerships?.map((partnership) => (
          <article key={partnership.id} className="card">
            <header className="card__head">
              <h3>{partnership.organization}</h3><StatusBadge status={partnership.status} />
            </header>
            <p className="muted">{partnership.partnership_type} · reçue {formatDateTime(partnership.received_at)}</p>
            <p>{partnership.description}</p>
            <p className="muted">{partnership.contact_name} — {partnership.email}{partnership.phone ? ` — ${partnership.phone}` : ''}</p>
            <div className="actions">
              <ContactButton email={partnership.email} subject={`Votre proposition de partenariat — ${partnership.organization}`} label="Répondre" />
              <button type="button" className="btn btn--small btn--soft" disabled={partnership.status === ARCHIVED_STATUS}
                onClick={() => changePartnershipStatus(partnership.id, ARCHIVED_STATUS)}>Archiver</button>
            </div>
            <label className="toolbar__filter">Mettre à jour le statut
              <select value={partnership.status} onChange={(event) => changePartnershipStatus(partnership.id, event.target.value)}>
                {PARTNERSHIP_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}
