import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import StatusBadge from '../StatusBadge.jsx';
import ReasonDialog from './ReasonDialog.jsx';
import ContactButton from './ContactButton.jsx';
import { useAutoRefreshingData, formatDateTime } from './useAutoRefreshingData.js';

const PENDING_STATUS = 'En attente de validation humaine';
const APPROVED_STATUS = 'Validée';
const REFUSED_STATUS = 'Refusée';
const FILTERABLE_STATUSES = [PENDING_STATUS, APPROVED_STATUS, REFUSED_STATUS];

export default function RoomRequestsTab() {
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [requestBeingRefused, setRequestBeingRefused] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data: roomRequests, loading, error: loadError, reload } = useAutoRefreshingData(
    () => adminService.listRoomRequests(token, statusFilter),
    [token, statusFilter],
  );

  const changeRequestStatus = async (requestId, status, adminComment) => {
    setBusy(true); setActionError('');
    try {
      await adminService.updateRoomRequest(token, requestId, { status, admin_comment: adminComment });
      setRequestBeingRefused(null);
      await reload();
    } catch (error) { setActionError(error.message); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="room-requests-title">
      <div className="toolbar">
        <h2 id="room-requests-title">Réservations de salles</h2>
        <label className="toolbar__filter">Statut
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tous</option>
            {FILTERABLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      {(actionError || loadError) && <p className="form-error" role="alert">{actionError || loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {roomRequests && roomRequests.length === 0 && <p className="muted">Aucune demande.</p>}
      {roomRequests && roomRequests.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Demandeur</th><th>Salle</th><th>Créneau</th><th>Personnes</th><th>Motif</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {roomRequests.map((roomRequest) => (
                <tr key={roomRequest.id}>
                  <td>
                    <strong>{roomRequest.requester_firstname} {roomRequest.requester_lastname}</strong><br />
                    <span className="muted">{roomRequest.email}<br />{roomRequest.phone}</span>
                  </td>
                  <td>
                    {roomRequest.room_name}
                    {roomRequest.extra_equipment.length > 0 && <><br /><span className="muted">+ {roomRequest.extra_equipment.join(', ')}</span></>}
                  </td>
                  <td>
                    {roomRequest.requested_date}<br />{roomRequest.start_time} – {roomRequest.end_time}<br />
                    <span className="muted">reçue {formatDateTime(roomRequest.created_at)}</span>
                  </td>
                  <td>{roomRequest.attendees}</td>
                  <td>{roomRequest.purpose}</td>
                  <td><StatusBadge status={roomRequest.status} />{roomRequest.admin_comment && <p className="muted">{roomRequest.admin_comment}</p>}</td>
                  <td className="actions">
                    <button type="button" className="btn btn--small btn--primary" disabled={busy || roomRequest.status === APPROVED_STATUS}
                      onClick={() => changeRequestStatus(roomRequest.id, APPROVED_STATUS)}>Valider</button>
                    <button type="button" className="btn btn--small btn--danger" disabled={busy || roomRequest.status === REFUSED_STATUS}
                      onClick={() => { setRequestBeingRefused(roomRequest); setActionError(''); }}>Refuser</button>
                    <ContactButton email={roomRequest.email} subject={`Votre demande de salle — ${roomRequest.room_name}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {requestBeingRefused && (
        <ReasonDialog
          title="Refuser la demande" required danger busy={busy} error={actionError}
          summary={`Demande de ${requestBeingRefused.requester_firstname} ${requestBeingRefused.requester_lastname} — ${requestBeingRefused.room_name}, le ${requestBeingRefused.requested_date}.`}
          label="Motif du refus (transmis au demandeur)" confirmLabel="Confirmer le refus"
          onConfirm={(reason) => changeRequestStatus(requestBeingRefused.id, REFUSED_STATUS, reason)}
          onCancel={() => setRequestBeingRefused(null)}
        />
      )}
    </section>
  );
}
