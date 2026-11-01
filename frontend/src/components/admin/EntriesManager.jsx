import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';
import { useFormState } from '../forms/useFormState.js';
import ImageUploadField from './ImageUploadField.jsx';
import DeletionConfirmationDialog from './DeletionConfirmationDialog.jsx';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';
import { formatDateTime, toDateTimeInputValue } from '../../utils/format.js';

const initialValueOf = (field) => (field.type === 'checkbox' ? true : '');
const toFormValue = (field, entry) => {
  if (field.type === 'datetime') return toDateTimeInputValue(entry[field.name]);
  if (field.type === 'checkbox') return Boolean(entry[field.name]);
  return entry[field.name] ?? '';
};

function EntryForm({ fields, entry, service, onSaved, onCancel }) {
  const { token } = useAuth();
  const formState = useFormState(
    Object.fromEntries(fields.map((field) => [field.name, entry ? toFormValue(field, entry) : initialValueOf(field)])),
    { required: fields.filter((field) => field.required).map((field) => field.name) },
  );
  const onSubmit = formState.handleSubmit(async (values) => {
    if (entry) await service.update(token, entry.id, values);
    else await service.create(token, values);
    onSaved();
  });
  return (
    <form onSubmit={onSubmit} noValidate className="form">
      {fields.map((field) => {
        const error = formState.fieldErrors[field.name];
        if (field.type === 'image') {
          return <ImageUploadField key={field.name} label={field.label} imageUrl={formState.values[field.name]} onChange={(url) => formState.setFieldValue(field.name, url)} />;
        }
        if (field.type === 'checkbox') {
          return (
            <label key={field.name} className="check">
              <input type="checkbox" checked={Boolean(formState.values[field.name])} onChange={(event) => formState.setFieldValue(field.name, event.target.checked)} />
              {field.label}
            </label>
          );
        }
        return (
          <FormField
            key={field.name} label={field.label} required={field.required} error={error}
            as={field.type === 'textarea' ? 'textarea' : 'input'} type={field.type === 'datetime' ? 'datetime-local' : 'text'}
            {...formState.bindField(field.name)}
          />
        );
      })}
      {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={formState.submitting}>{formState.submitting ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </form>
  );
}

/** Gestion complète (ajout, modification, suppression, publication) d'une rubrique éditoriale. */
export default function EntriesManager({ title, intro, addLabel, emptyLabel, service, fields, dateField }) {
  const { token } = useAuth();
  const { data: entries, loading, error: loadError, reload } = useAutoRefreshingData(() => service.list(token), [token]);
  const [editedEntry, setEditedEntry] = useState(undefined); // undefined = fermé, null = création, objet = modification
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deletionError, setDeletionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const closeEditor = () => setEditedEntry(undefined);
  const saveAndReload = async () => { closeEditor(); await reload(); };
  const confirmDeletion = async () => {
    setDeleting(true); setDeletionError('');
    try { await service.remove(token, entryToDelete.id); setEntryToDelete(null); await reload(); }
    catch (error) { setDeletionError(error.message); } finally { setDeleting(false); }
  };

  return (
    <section aria-label={title}>
      <div className="toolbar">
        <h2>{title}</h2>
        <button type="button" className="btn btn--primary" onClick={() => setEditedEntry(null)}>{addLabel}</button>
      </div>
      <p className="muted">{intro}</p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {entries && entries.length === 0 && <p className="muted">{emptyLabel}</p>}
      <div className="cards">
        {entries?.map((entry) => (
          <article key={entry.id} className="card">
            {entry.image_url && <img className="table-photo table-photo--wide" src={entry.image_url} alt="" loading="lazy" />}
            <header className="card__head"><h3>{entry.title}</h3></header>
            <p className="muted">{formatDateTime(entry[dateField])} · {entry.is_published ? 'Publié' : 'Brouillon (masqué)'}</p>
            <div className="actions">
              <button type="button" className="btn btn--small btn--soft" onClick={() => setEditedEntry(entry)}>Modifier</button>
              <button type="button" className="btn btn--small btn--danger" onClick={() => { setEntryToDelete(entry); setDeletionError(''); }}>Supprimer</button>
            </div>
          </article>
        ))}
      </div>
      {editedEntry !== undefined && (
        <ModalDialog title={editedEntry ? 'Modifier' : addLabel} wide onClose={closeEditor}>
          <EntryForm fields={fields} entry={editedEntry} service={service} onSaved={saveAndReload} onCancel={closeEditor} />
        </ModalDialog>
      )}
      {entryToDelete && (
        <DeletionConfirmationDialog
          title="Supprimer" message={`Supprimer « ${entryToDelete.title} » ? Il disparaît du site et de Kim.`}
          busy={deleting} error={deletionError} onConfirm={confirmDeletion} onCancel={() => setEntryToDelete(null)}
        />
      )}
    </section>
  );
}
