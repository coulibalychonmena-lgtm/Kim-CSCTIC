import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';
import { useFormState } from '../forms/useFormState.js';
import ImageUploadField from './ImageUploadField.jsx';
import AiDescriptionAssistant from './AiDescriptionAssistant.jsx';
import DeletionConfirmationDialog from './DeletionConfirmationDialog.jsx';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

const ACTIVITY_CATEGORIES = ['Sport', 'TIC', 'Langue', 'Culture'];

const emptyActivityValues = {
  title: '', category: '', age_min: '', age_max: '', age_range_label: '', total_seats: '', schedule: '', enrollment_conditions: '', description: '', image_url: '',
};

const toFormValues = (activity) => ({
  title: activity.title, category: activity.category, age_min: activity.age_min ?? '', age_max: activity.age_max ?? '',
  age_range_label: activity.age_range_label ?? '', total_seats: activity.total_seats ?? '',
  schedule: activity.schedule ?? '', enrollment_conditions: activity.enrollment_conditions ?? '', description: activity.description ?? '', image_url: activity.image_url ?? '',
});

function ActivityEditorForm({ activity, onSaved, onCancel }) {
  const { token } = useAuth();
  const formState = useFormState(activity ? toFormValues(activity) : emptyActivityValues);

  const onSubmit = formState.handleSubmit(async (values) => {
    if (activity) await adminService.updateActivity(token, activity.id, values);
    else await adminService.createActivity(token, values);
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <FormField label="Titre de la formation" required error={formState.fieldErrors.title} {...formState.bindField('title')} />
      <FormField as="select" label="Catégorie" required error={formState.fieldErrors.category} {...formState.bindField('category')}>
        <option value="">Choisir…</option>
        {ACTIVITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
      </FormField>
      <div className="form__row form__row--3">
        <FormField label="Âge minimum" type="number" min="0" error={formState.fieldErrors.age_min} {...formState.bindField('age_min')} />
        <FormField label="Âge maximum" type="number" min="0" error={formState.fieldErrors.age_max} {...formState.bindField('age_max')} />
        <FormField label="Nombre total de places" type="number" min="0" error={formState.fieldErrors.total_seats} {...formState.bindField('total_seats')} />
      </div>
      <FormField label="Public visé (texte libre, ex. « Enfants et adultes »)" error={formState.fieldErrors.age_range_label} {...formState.bindField('age_range_label')} />
      <FormField label="Jours et horaires des sessions" error={formState.fieldErrors.schedule} {...formState.bindField('schedule')} />
      <FormField label="Conditions d'inscription (niveau, adhésion, prérequis)" error={formState.fieldErrors.enrollment_conditions} {...formState.bindField('enrollment_conditions')} />
      <FormField as="textarea" label="Description et objectifs" error={formState.fieldErrors.description} {...formState.bindField('description')} />
      <ImageUploadField label="Photo de la formation" imageUrl={formState.values.image_url} onChange={(url) => formState.setFieldValue('image_url', url)} />
      <AiDescriptionAssistant imageUrl={formState.values.image_url} title={formState.values.title} kind="activity" value={formState.values.description} onChange={(text) => formState.setFieldValue('description', text)} />
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

export default function ActivityCatalogTab() {
  const { token } = useAuth();
  const { data: activities, loading, error: loadError, reload } = useAutoRefreshingData(() => adminService.listActivities(), []);
  const [editedActivity, setEditedActivity] = useState(undefined); // undefined = fermé, null = création, objet = modification
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [deletionError, setDeletionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const closeEditor = () => setEditedActivity(undefined);
  const saveAndReload = async () => { closeEditor(); await reload(); };

  const confirmDeletion = async () => {
    setDeleting(true); setDeletionError('');
    try {
      await adminService.deleteActivity(token, activityToDelete.id);
      setActivityToDelete(null);
      await reload();
    } catch (error) { setDeletionError(error.message); } finally { setDeleting(false); }
  };

  return (
    <section aria-labelledby="activity-catalog-title">
      <div className="toolbar">
        <h2 id="activity-catalog-title">Formations et activités</h2>
        <button type="button" className="btn btn--primary" onClick={() => setEditedActivity(null)}>Ajouter une formation</button>
      </div>
      <p className="muted">
        Tant que le nombre de places d'une formation n'est pas renseigné, aucune limite n'est appliquée aux pré-inscriptions.
      </p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {activities && activities.length === 0 && <p className="muted">Aucune formation enregistrée. Utilisez « Ajouter une formation » pour commencer.</p>}
      {activities && activities.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Photo</th><th>Formation</th><th>Catégorie</th><th>Public</th><th>Places</th><th>Horaires</th><th>Actions</th></tr></thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.image_url ? <img className="table-photo" src={activity.image_url} alt={activity.title} loading="lazy" /> : <span className="muted">—</span>}</td>
                  <td><strong>{activity.title}</strong>{activity.description && <><br /><span className="muted">{activity.description}</span></>}</td>
                  <td>{activity.category}</td>
                  <td>
                    {activity.age_min !== null || activity.age_max !== null
                      ? `${activity.age_min ?? '?'}–${activity.age_max ?? '?'} ans`
                      : (activity.age_range_label ?? <span className="muted">—</span>)}
                  </td>
                  <td>
                    {activity.total_seats === null
                      ? <span className="muted">quota non défini</span>
                      : `${activity.assigned_seats} / ${activity.total_seats}`}
                  </td>
                  <td>{activity.schedule ?? <span className="muted">—</span>}</td>
                  <td className="actions">
                    <button type="button" className="btn btn--small btn--soft" onClick={() => setEditedActivity(activity)}>Modifier</button>
                    <button type="button" className="btn btn--small btn--danger" onClick={() => { setActivityToDelete(activity); setDeletionError(''); }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editedActivity !== undefined && (
        <ModalDialog title={editedActivity ? 'Modifier la formation' : 'Ajouter une formation'} onClose={closeEditor}>
          <ActivityEditorForm activity={editedActivity} onSaved={saveAndReload} onCancel={closeEditor} />
        </ModalDialog>
      )}
      {activityToDelete && (
        <DeletionConfirmationDialog
          title="Supprimer la formation"
          message={`Supprimer « ${activityToDelete.title} » ? Elle disparaîtra du site et des réponses de Kim.`}
          busy={deleting} error={deletionError}
          onConfirm={confirmDeletion} onCancel={() => setActivityToDelete(null)}
        />
      )}
    </section>
  );
}
