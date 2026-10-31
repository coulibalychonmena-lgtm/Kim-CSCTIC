import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import StatusBadge from '../StatusBadge.jsx';
import ReasonDialog from './ReasonDialog.jsx';
import ContactButton from './ContactButton.jsx';
import { useAutoRefreshingData, formatDateTime } from './useAutoRefreshingData.js';

const PENDING_STATUS = 'En attente de validation humaine';
const CONFIRMED_STATUS = 'Confirmée';
const WAITLIST_STATUS = "Liste d'attente";
const REFUSED_STATUS = 'Refusée';
const FILTERABLE_STATUSES = [PENDING_STATUS, CONFIRMED_STATUS, WAITLIST_STATUS, REFUSED_STATUS];

export default function ActivityRegistrationsTab() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null); // { registration, status }
  const registrations = useAutoRefreshingData(() => adminService.listRegistrations(token, statusFilter), [token, statusFilter]);
  const activities = useAutoRefreshingData(() => adminService.listActivities(), []);

  const changeRegistrationStatus = async (registrationId, status, adminComment) => {
    setBusy(true); setActionError('');
    try {
      await adminService.updateRegistration(token, registrationId, { status, admin_comment: adminComment });
      setPendingDecision(null);
      await Promise.all([registrations.reload(), activities.reload()]);
    } catch (error) { setActionError(error.message); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="activity-fill-title">
      <h2 id="activity-fill-title">Remplissage des formations</h2>
      {activities.data && activities.data.length === 0 && (
        <p className="muted">Aucune formation enregistrée : ajoutez-en depuis l'onglet « Formations ».</p>
      )}
      {activities.data && activities.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Formation</th><th>Catégorie</th><th>Places attribuées</th><th>Quota</th><th>Restantes</th></tr></thead>
            <tbody>
              {activities.data.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.title}</td><td>{activity.category}</td><td>{activity.assigned_seats}</td>
                  <td>{activity.total_seats ?? <span className="muted">non défini</span>}</td>
                  <td>{activity.remaining_seats ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="toolbar">
        <h2>Pré-inscriptions</h2>
        <label className="toolbar__filter">Statut
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tous</option>
            {FILTERABLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {(actionError || registrations.error) && <p className="form-error" role="alert">{actionError || registrations.error}</p>}
      {registrations.data && registrations.data.length === 0 && <p className="muted">Aucune pré-inscription.</p>}
      {registrations.data && registrations.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Candidat</th><th>Âge</th><th>Formation</th><th>Niveau et conditions</th><th>Reçue</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {registrations.data.map((registration) => (
                <tr key={registration.id}>
                  <td><strong>{registration.firstname} {registration.lastname}</strong><br /><span className="muted">{registration.email}<br />{registration.phone}</span></td>
                  <td>{registration.age}</td><td>{registration.activity_title}</td><td>
                    {registration.current_level || '—'}
                    {registration.activity_conditions && <><br /><span className="muted">Conditions : {registration.activity_conditions}</span></>}
                  </td>
                  <td>{formatDateTime(registration.submitted_at)}</td>
                  <td><StatusBadge status={registration.status} />{registration.admin_comment && <p className="muted">{registration.admin_comment}</p>}</td>
                  <td className="actions">
                    <button type="button" className="btn btn--small btn--primary" disabled={busy || registration.status === CONFIRMED_STATUS}
                      onClick={() => setPendingDecision({ registration, status: CONFIRMED_STATUS })}>Confirmer</button>
                    <button type="button" className="btn btn--small btn--soft" disabled={busy || registration.status === WAITLIST_STATUS}
                      onClick={() => setPendingDecision({ registration, status: WAITLIST_STATUS })}>Liste d'attente</button>
                    <button type="button" className="btn btn--small btn--danger" disabled={busy || registration.status === REFUSED_STATUS}
                      onClick={() => setPendingDecision({ registration, status: REFUSED_STATUS })}>Refuser</button>
                    <ContactButton email={registration.email} subject={`Votre pré-inscription — ${registration.activity_title}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pendingDecision && (
        <ReasonDialog
          title={`${pendingDecision.status} — pré-inscription`}
          summary={`${pendingDecision.registration.firstname} ${pendingDecision.registration.lastname} — ${pendingDecision.registration.activity_title}.`}
          label={pendingDecision.status === REFUSED_STATUS ? 'Motif du refus (obligatoire)' : 'Message au candidat (facultatif)'}
          required={pendingDecision.status === REFUSED_STATUS} danger={pendingDecision.status === REFUSED_STATUS}
          confirmLabel={pendingDecision.status} busy={busy} error={actionError}
          onConfirm={(message) => changeRegistrationStatus(pendingDecision.registration.id, pendingDecision.status, message)}
          onCancel={() => setPendingDecision(null)}
        />
      )}
    </section>
  );
}
