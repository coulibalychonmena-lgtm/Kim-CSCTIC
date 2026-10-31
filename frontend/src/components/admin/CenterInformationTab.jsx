import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';
import { useFormState } from '../forms/useFormState.js';
import DeletionConfirmationDialog from './DeletionConfirmationDialog.jsx';
import OpeningHoursEditor from './OpeningHoursEditor.jsx';
import { useAutoRefreshingData, formatDateTime } from './useAutoRefreshingData.js';

const emptyInformationValues = { category: '', title: '', content: '', source_label: '', source_url: '' };

const toFormValues = (information) => ({
  category: information.category, title: information.title, content: information.content,
  source_label: information.source_label ?? '', source_url: information.source_url ?? '',
});

function CenterInformationForm({ information, onSaved, onCancel }) {
  const { token } = useAuth();
  const formState = useFormState(information ? toFormValues(information) : emptyInformationValues);

  const onSubmit = formState.handleSubmit(async (values) => {
    if (information) await adminService.updateCenterInformation(token, information.id, values);
    else await adminService.createCenterInformation(token, values);
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <div className="form__row">
        <FormField label="Titre" required error={formState.fieldErrors.title} {...formState.bindField('title')} />
        <FormField label="Rubrique (ex. : contact, institution)" required error={formState.fieldErrors.category} {...formState.bindField('category')} />
      </div>
      <FormField as="textarea" label="Contenu transmis à Kim et aux visiteurs" required error={formState.fieldErrors.content} {...formState.bindField('content')} />
      <div className="form__row">
        <FormField label="Nom de la source officielle" error={formState.fieldErrors.source_label} {...formState.bindField('source_label')} />
        <FormField label="Adresse web de la source (https://…)" type="url" error={formState.fieldErrors.source_url} {...formState.bindField('source_url')} />
      </div>
      <p className="muted">Kim ne cite comme source que les adresses saisies ici.</p>
      {formState.formError && <p className="form-error" role="alert">{formState.formError}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="btn btn--primary" disabled={formState.submitting}>
          {formState.submitting ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

export default function CenterInformationTab() {
  const { token } = useAuth();
  const { data: informationEntries, loading, error: loadError, reload } = useAutoRefreshingData(
    () => adminService.listCenterInformation(token),
    [token],
  );
  const [editedInformation, setEditedInformation] = useState(undefined); // undefined = fermé, null = création, objet = modification
  const [informationToDelete, setInformationToDelete] = useState(null);
  const [deletionError, setDeletionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const closeEditor = () => setEditedInformation(undefined);
  const saveAndReload = async () => { closeEditor(); await reload(); };

  const confirmDeletion = async () => {
    setDeleting(true); setDeletionError('');
    try {
      await adminService.deleteCenterInformation(token, informationToDelete.id);
      setInformationToDelete(null);
      await reload();
    } catch (error) { setDeletionError(error.message); } finally { setDeleting(false); }
  };

  return (
    <section aria-labelledby="center-information-title">
      <div className="toolbar">
        <h2 id="center-information-title">Informations du Centre</h2>
        <button type="button" className="btn btn--primary" onClick={() => setEditedInformation(null)}>Ajouter une information</button>
      </div>
      <p className="muted">
        Contacts, adresse, missions, vision, réseaux sociaux… Kim répond uniquement à partir de ce qui est saisi ici.
      </p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {informationEntries && informationEntries.length === 0 && <p className="muted">Aucune information enregistrée.</p>}
      <div className="cards">
        {informationEntries?.map((information) => (
          <article key={information.id} className="card">
            <header className="card__head"><h3>{information.title}</h3></header>
            <p className="muted">{information.category} · modifiée {formatDateTime(information.updated_at)}</p>
            <p>{information.content}</p>
            {information.source_url && (
              <p className="muted">Source : <a href={information.source_url} target="_blank" rel="noopener noreferrer">{information.source_label || information.source_url}</a></p>
            )}
            <div className="actions">
              <button type="button" className="btn btn--small btn--soft" onClick={() => setEditedInformation(information)}>Modifier</button>
              <button type="button" className="btn btn--small btn--danger" onClick={() => { setInformationToDelete(information); setDeletionError(''); }}>Supprimer</button>
            </div>
          </article>
        ))}
      </div>

      <OpeningHoursEditor />

      {editedInformation !== undefined && (
        <ModalDialog title={editedInformation ? "Modifier l'information" : 'Ajouter une information'} wide onClose={closeEditor}>
          <CenterInformationForm information={editedInformation} onSaved={saveAndReload} onCancel={closeEditor} />
        </ModalDialog>
      )}
      {informationToDelete && (
        <DeletionConfirmationDialog
          title="Supprimer l'information"
          message={`Supprimer « ${informationToDelete.title} » ? Kim ne pourra plus s'appuyer dessus.`}
          busy={deleting} error={deletionError}
          onConfirm={confirmDeletion} onCancel={() => setInformationToDelete(null)}
        />
      )}
    </section>
  );
}
