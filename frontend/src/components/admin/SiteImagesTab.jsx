import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import { publicService } from '../../services/publicService.js';
import { SITE_BACKGROUND_SLOTS, defaultBackgroundUrl } from '../../config/site-backgrounds.js';
import ImageUploadField from './ImageUploadField.jsx';
import { useAutoRefreshingData } from './useAutoRefreshingData.js';

function BackgroundSlotEditor({ slot, savedUrl, onSaved }) {
  const { token } = useAuth();
  const [draftUrl, setDraftUrl] = useState(savedUrl || '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ kind: '', text: '' });

  const save = async (imageUrl) => {
    setSaving(true); setFeedback({ kind: '', text: '' });
    try {
      await adminService.setSiteBackground(token, slot.id, imageUrl || null);
      setDraftUrl(imageUrl || '');
      setFeedback({ kind: 'ok', text: imageUrl ? 'Image enregistrée : elle est visible sur le site.' : 'Image par défaut rétablie.' });
      await onSaved();
    } catch (error) { setFeedback({ kind: 'error', text: error.message }); } finally { setSaving(false); }
  };

  const hasUnsavedChange = draftUrl !== (savedUrl || '');

  return (
    <article className="card">
      <header className="card__head"><h3>{slot.label}</h3></header>
      <p className="muted">{slot.hint}</p>
      {!draftUrl && (
        <figure className="image-field">
          <img className="image-field__preview" src={defaultBackgroundUrl(slot.id)} alt="Image par défaut de cet emplacement" />
          <figcaption className="muted">Image par défaut</figcaption>
        </figure>
      )}
      <ImageUploadField label="Nouvelle image" imageUrl={draftUrl} onChange={setDraftUrl} />
      {feedback.text && (
        <p className={feedback.kind === 'error' ? 'form-error' : 'muted'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p>
      )}
      <div className="actions">
        <button type="button" className="btn btn--small btn--primary" disabled={saving || !hasUnsavedChange} onClick={() => save(draftUrl)}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button type="button" className="btn btn--small btn--soft" disabled={saving || (!savedUrl && !draftUrl)} onClick={() => save('')}>
          Rétablir l'image par défaut
        </button>
      </div>
    </article>
  );
}

export default function SiteImagesTab() {
  const { data: backgrounds, loading, error: loadError, reload } = useAutoRefreshingData(() => publicService.listSiteBackgrounds(), []);
  const savedUrlFor = (slotId) => backgrounds?.find((row) => row.slot === slotId)?.image_url || '';

  return (
    <section aria-labelledby="site-images-title">
      <div className="toolbar"><h2 id="site-images-title">Images de la page d'accueil</h2></div>
      <p className="muted">Ces images servent d'arrière-plan aux sections de la page d'accueil. Le changement est visible des visiteurs dès l'enregistrement.</p>
      {loadError && <p className="form-error" role="alert">{loadError}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {backgrounds && (
        <div className="cards">
          {SITE_BACKGROUND_SLOTS.map((slot) => (
            <BackgroundSlotEditor key={`${slot.id}-${savedUrlFor(slot.id)}`} slot={slot} savedUrl={savedUrlFor(slot.id)} onSaved={reload} />
          ))}
        </div>
      )}
    </section>
  );
}
