import ModalDialog from '../ModalDialog.jsx';

/** Demande une confirmation explicite avant toute suppression définitive. */
export default function DeletionConfirmationDialog({ title, message, busy, error, onConfirm, onCancel }) {
  return (
    <ModalDialog title={title} onClose={onCancel}>
      <p>{message}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="button" className="btn btn--danger" disabled={busy} onClick={onConfirm}>Supprimer définitivement</button>
      </div>
    </ModalDialog>
  );
}
