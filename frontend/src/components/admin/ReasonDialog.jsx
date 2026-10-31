import { useState } from 'react';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';

/** Décision d'un agent accompagnée d'un message au demandeur (obligatoire ou facultatif selon la décision). */
export default function ReasonDialog({
  title, summary, label, confirmLabel, required, danger, busy, error, onConfirm, onCancel,
}) {
  const [reason, setReason] = useState('');
  const trimmedReason = reason.trim();
  return (
    <ModalDialog title={title} onClose={onCancel}>
      <p>{summary}</p>
      <FormField as="textarea" label={label} required={required} value={reason} onChange={(event) => setReason(event.target.value)} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button
          type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          disabled={busy || (required && !trimmedReason)} onClick={() => onConfirm(trimmedReason)}
        >{confirmLabel}</button>
      </div>
    </ModalDialog>
  );
}
