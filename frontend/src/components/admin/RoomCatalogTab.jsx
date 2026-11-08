import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import StatusBadge from '../StatusBadge.jsx';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';
import { useFormState } from '../forms/useFormState.js';
import ImageUploadField from './ImageUploadField.jsx';
import AiDescriptionAssistant from './AiDescriptionAssistant.jsx';
import DeletionConfirmationDialog from './DeletionConfirmationDialog.jsx';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

const AVAILABLE_STATUS = 'Disponible';
const ROOM_STATUSES = [AVAILABLE_STATUS, 'En maintenance'];

const emptyRoomValues = {
  name: '', space_type: '', max_capacity: '', surface_m2: '', equipment: '', description: '', pricing: '', conditions: '', status: AVAILABLE_STATUS, image_url: '',
};

const toFormValues = (room) => ({
  name: room.name, space_type: room.space_type, max_capacity: room.max_capacity ?? '', surface_m2: room.surface_m2 ?? '',
  equipment: (room.equipment || []).join(', '), description: room.description ?? '',
  pricing: room.pricing ?? '', conditions: room.conditions ?? '', status: room.status, image_url: room.image_url ?? '',
});

function RoomEditorForm({ room, onSaved, onCancel }) {
  const { token } = useAuth();
  const formState = useFormState(room ? toFormValues(room) : emptyRoomValues);

  const onSubmit = formState.handleSubmit(async (values) => {
    const roomData = {
      ...values,
      equipment: values.equipment.split(',').map((item) => item.trim()).filter(Boolean),
    };
    if (room) await adminService.updateRoom(token, room.id, roomData);
    else await adminService.createRoom(token, roomData);
    onSaved();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <FormField label="Nom de la salle" required error={formState.fieldErrors.name} {...formState.bindField('name')} />
      <div className="form__row">
        <FormField label="Type d'espace" required error={formState.fieldErrors.space_type} {...formState.bindField('space_type')} />
        <FormField label="Capacité maximale (personnes)" type="number" min="1" error={formState.fieldErrors.max_capacity} {...formState.bindField('max_capacity')} />
        <FormField label="Surface (m²)" type="number" min="1" step="0.1" error={formState.fieldErrors.surface_m2} {...formState.bindField('surface_m2')} />
      </div>
      <FormField label="Équipements (séparés par des virgules)" error={formState.fieldErrors.equipment} {...formState.bindField('equipment')} />
      <FormField as="textarea" label="Description" error={formState.fieldErrors.description} {...formState.bindField('description')} />
      <FormField label="Tarif indicatif" error={formState.fieldErrors.pricing} {...formState.bindField('pricing')} />
      <FormField as="textarea" label="Conditions d'utilisation (caution, assurance, horaires de mise à disposition…)" error={formState.fieldErrors.conditions} {...formState.bindField('conditions')} />
      <ImageUploadField label="Photo de la salle" imageUrl={formState.values.image_url} onChange={(url) => formState.setFieldValue('image_url', url)} />
      <AiDescriptionAssistant imageUrl={formState.values.image_url} title={formState.values.name} kind="room" value={formState.values.description} onChange={(text) => formState.setFieldValue('description', text)} />
      <FormField as="select" label="Statut" error={formState.fieldErrors.status} {...formState.bindField('status')}>
        {ROOM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
      </FormField>
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

export default function RoomCatalogTab() {
  const { token } = useAuth();
  const { data: rooms, loading, error: loadError, reload } = useAutoRefreshingData(() => adminService.listRooms(), []);
  const [editedRoom, setEditedRoom] = useState(undefined); // undefined = fermé, null = création, objet = modification
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletionError, setDeletionError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const closeEditor = () => setEditedRoom(undefined);
  const saveAndReload = async () => { closeEditor(); await reload(); };

  const confirmDeletion = async () => {
    setDeleting(true); setDeletionError('');
    try {
      await adminService.deleteRoom(token, roomToDelete.id);
      setRoomToDelete(null);
      await reload();
    } catch (error) { setDeletionError(error.message); } finally { setDeleting(false); }
  };

  return (
    <section aria-labelledby="room-catalog-title">
      <div className="toolbar">
        <h2 id="room-catalog-title">Salles et espaces</h2>
        <button type="button" className="btn btn--primary" onClick={() => setEditedRoom(null)}>Ajouter une salle</button>
      </div>
      <p className="muted">Ces informations sont lues par Kim et affichées aux visiteurs dès l'enregistrement.</p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {rooms && rooms.length === 0 && <p className="muted">Aucune salle enregistrée. Utilisez « Ajouter une salle » pour commencer.</p>}
      {rooms && rooms.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Photo</th><th>Salle</th><th>Type</th><th>Capacité</th><th>Équipements</th><th>Tarif / conditions</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.image_url ? <img className="table-photo" src={room.image_url} alt={room.name} loading="lazy" /> : <span className="muted">—</span>}</td>
                  <td><strong>{room.name}</strong>{room.description && <><br /><span className="muted">{room.description}</span></>}</td>
                  <td>{room.space_type}</td>
                  <td>{room.max_capacity ?? <span className="muted">non renseignée</span>}</td>
                  <td>{room.equipment.length ? room.equipment.join(', ') : <span className="muted">—</span>}</td>
                  <td>{room.pricing ?? <span className="muted">—</span>}</td>
                  <td><StatusBadge status={room.status} /></td>
                  <td className="actions">
                    <button type="button" className="btn btn--small btn--soft" onClick={() => setEditedRoom(room)}>Modifier</button>
                    <button type="button" className="btn btn--small btn--danger" onClick={() => { setRoomToDelete(room); setDeletionError(''); }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editedRoom !== undefined && (
        <ModalDialog title={editedRoom ? 'Modifier la salle' : 'Ajouter une salle'} onClose={closeEditor}>
          <RoomEditorForm room={editedRoom} onSaved={saveAndReload} onCancel={closeEditor} />
        </ModalDialog>
      )}
      {roomToDelete && (
        <DeletionConfirmationDialog
          title="Supprimer la salle"
          message={`Supprimer « ${roomToDelete.name} » ? Elle disparaîtra du site et des réponses de Kim.`}
          busy={deleting} error={deletionError}
          onConfirm={confirmDeletion} onCancel={() => setRoomToDelete(null)}
        />
      )}
    </section>
  );
}
