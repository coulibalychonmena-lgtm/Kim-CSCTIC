import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import ModalDialog from '../ModalDialog.jsx';
import FormField from '../FormField.jsx';
import DeletionConfirmationDialog from './DeletionConfirmationDialog.jsx';
import { EntryForm } from './EntriesManager.jsx';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';
import { formatDateTime } from '../../utils/format.js';

const ACTIONS = [
  ['reserve', 'Réserver (ouvre le formulaire de salle)'], ['register', "S'inscrire (ouvre le formulaire de formation)"],
  ['partner', 'Proposer un partenariat'], ['contact', 'Contacter un agent'], ['link', 'Lien externe'], ['none', 'Aucun bouton'],
];
const KIND_LABEL = { room: 'Salle', activity: 'Formation', custom: 'Personnalisée' };
const CREATION_FIELDS = [
  { name: 'title', label: 'Titre', type: 'text', required: true },
  { name: 'image_url', label: 'Image', type: 'image' },
  { name: 'admin_text', label: 'Texte de présentation', type: 'textarea', required: true, assist: { imageField: 'image_url', kind: 'slide' } },
  { name: 'additive', label: 'Complément (facultatif)', type: 'text' },
  { name: 'action_type', label: 'Bouton d\'action', type: 'select', options: ACTIONS },
  { name: 'action_label', label: 'Texte du bouton (facultatif)', type: 'text' },
  { name: 'action_url', label: 'Adresse du lien (si « Lien externe »)', type: 'text' },
  { name: 'sort_order', label: "Ordre d'affichage (petit nombre = en premier)", type: 'number' },
  { name: 'is_published', label: 'Publiée dans le diaporama', type: 'checkbox' },
];

function SlideEditor({ slide, onChanged }) {
  const { token } = useAuth();
  const [draft, setDraft] = useState({
    admin_text: slide.admin_text ?? '', additive: slide.additive ?? '', action_type: slide.action_type,
    action_label: slide.action_label ?? '', action_url: slide.action_url ?? '', sort_order: String(slide.sort_order),
    is_published: slide.is_published, ...(slide.kind === 'custom' ? { title: slide.title ?? '' } : {}),
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ kind: '', text: '' });
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const setField = (name) => (event) => setDraft((previous) => ({ ...previous, [name]: event.target.value }));
  const isCustom = slide.kind === 'custom';

  const run = async (action, successText) => {
    setBusy(true); setFeedback({ kind: '', text: '' });
    try { await action(); setFeedback({ kind: 'ok', text: successText }); await onChanged(); }
    catch (error) { setFeedback({ kind: 'error', text: error.message }); } finally { setBusy(false); }
  };
  const save = () => run(() => adminService.presentations.update(token, slide.id, draft), 'Enregistré : visible dans le diaporama et connu de Kim.');
  const regenerate = () => run(() => adminService.presentations.regenerate(token, slide.id), 'Kim a réécrit son texte à partir des données actuelles.');

  return (
    <article className="card slide-editor">
      <header className="card__head">
        <h3>{slide.title}</h3>
        <span className="badge">{KIND_LABEL[slide.kind]}</span>
      </header>
      <div className="slide-editor__top">
        {slide.image_url ? <img className="table-photo table-photo--wide" src={slide.image_url} alt="" loading="lazy" /> : <p className="muted">Aucune image : ajoutez-la dans Salles/Formations{isCustom ? ' ou modifiez cette diapositive' : ''}.</p>}
        <p className="muted">Présentée {slide.shown_count} fois{slide.last_shown_at ? ` · dernière : ${formatDateTime(slide.last_shown_at)}` : ''}</p>
      </div>
      {!isCustom && (
        <div className="slide-editor__ai">
          <p><strong>Texte rédigé par Kim</strong>{slide.ai_generated_at ? ` (${formatDateTime(slide.ai_generated_at)})` : ''}</p>
          <p>{slide.ai_text || "Pas encore rédigé : Kim le rédige à sa première présentation, ou cliquez sur « Faire réécrire par Kim »."}</p>
          <details><summary>Données du catalogue utilisées</summary><p>{slide.facts_text}</p></details>
        </div>
      )}
      {isCustom && <FormField label="Titre" value={draft.title} onChange={setField('title')} />}
      <FormField
        label={isCustom ? 'Texte de présentation' : 'Correction (remplace le texte de Kim ; vide = texte de Kim)'}
        as="textarea" value={draft.admin_text} onChange={setField('admin_text')}
      />
      <FormField label="Complément (ajouté à la fin du texte)" value={draft.additive} onChange={setField('additive')} />
      <p className="slide-editor__preview"><strong>Vu par les visiteurs :</strong> {[draft.admin_text || slide.ai_text, draft.additive].filter(Boolean).join(' ') || '—'}</p>
      <FormField label="Bouton d'action" as="select" value={draft.action_type} onChange={setField('action_type')}>
        {ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </FormField>
      <FormField label="Texte du bouton (facultatif)" value={draft.action_label} onChange={setField('action_label')} />
      {draft.action_type === 'link' && <FormField label="Adresse du lien" value={draft.action_url} onChange={setField('action_url')} />}
      <FormField label="Ordre d'affichage" type="number" value={draft.sort_order} onChange={setField('sort_order')} />
      <label className="check">
        <input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft((previous) => ({ ...previous, is_published: event.target.checked }))} />
        Publiée dans le diaporama
      </label>
      {feedback.text && <p className={feedback.kind === 'error' ? 'form-error' : 'muted'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}
      <div className="actions">
        <button type="button" className="btn btn--small btn--primary" disabled={busy} onClick={save}>{busy ? 'Patientez…' : 'Enregistrer'}</button>
        {!isCustom && <button type="button" className="btn btn--small btn--soft" disabled={busy} onClick={regenerate}>Faire réécrire par Kim</button>}
        {isCustom && <button type="button" className="btn btn--small btn--danger" disabled={busy} onClick={() => setConfirmingDeletion(true)}>Supprimer</button>}
      </div>
      {confirmingDeletion && (
        <DeletionConfirmationDialog
          title="Supprimer la diapositive" message={`Supprimer « ${slide.title} » du diaporama ?`} busy={busy} error=""
          onCancel={() => setConfirmingDeletion(false)}
          onConfirm={() => run(() => adminService.presentations.remove(token, slide.id), 'Supprimée.')}
        />
      )}
    </article>
  );
}

export default function PresentationsTab() {
  const { token } = useAuth();
  const { data: slides, loading, error, reload } = useAutoRefreshingData(() => adminService.presentations.list(token), [token], 60000);
  const [creating, setCreating] = useState(false);
  const onChanged = async () => { await reload(); };

  return (
    <section aria-label="Présentation des services">
      <div className="toolbar">
        <h2>Présentation des services par Kim</h2>
        <button type="button" className="btn btn--primary" onClick={() => setCreating(true)}>Ajouter une diapositive</button>
      </div>
      <p className="muted">
        Quand un visiteur accepte la présentation, Kim fait défiler une image par salle et par formation avec une description et des boutons (réserver, s'inscrire, contacter).
        Vous voyez ici le texte rédigé par Kim : s'il manque de précision, écrivez une <strong>correction</strong> (elle remplace le texte de Kim) ou ajoutez un <strong>complément</strong>.
        Les corrections sont aussi transmises à Kim pour qu'il les reprenne dans le chat. Images, titres et capacités viennent des onglets Salles et Formations.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {slides && slides.length === 0 && <p className="muted">Aucune diapositive : ajoutez des salles ou des formations, ou créez une diapositive personnalisée.</p>}
      <div className="cards">{slides?.map((slide) => <SlideEditor key={`${slide.id}-${slide.ai_generated_at}`} slide={slide} onChanged={onChanged} />)}</div>
      {creating && (
        <ModalDialog title="Ajouter une diapositive" wide onClose={() => setCreating(false)}>
          <EntryForm
            fields={CREATION_FIELDS} entry={null} service={adminService.presentations}
            onSaved={async () => { setCreating(false); await reload(); }} onCancel={() => setCreating(false)}
          />
        </ModalDialog>
      )}
    </section>
  );
}
