import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';

/**
 * Kim propose une description à partir de l'image (ou de la vidéo, ou du titre).
 * Dès qu'une nouvelle image est ajoutée et que la description est vide, la proposition est écrite
 * automatiquement dans le champ : l'administration la modifie, puis enregistre.
 */
export default function AiDescriptionAssistant({ imageUrl = '', videoUrl = '', title = '', kind, value, onChange }) {
  const { token } = useAuth();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState({ kind: '', text: '' });
  const lastSourceRef = useRef(imageUrl || videoUrl); // une image déjà présente à l'ouverture ne déclenche rien
  const canPropose = Boolean(imageUrl || videoUrl || title.trim());

  const propose = useCallback(async () => {
    setBusy(true); setNote({ kind: '', text: '' });
    try {
      const description = await adminService.describeMedia(token, {
        image_url: imageUrl || null, video_url: videoUrl || null, title: title.trim() || null, kind,
      });
      onChange(description);
      setNote({ kind: 'ok', text: 'Proposition de Kim : relisez-la, modifiez-la si besoin, puis enregistrez.' });
    } catch (error) { setNote({ kind: 'error', text: error.message }); } finally { setBusy(false); }
  }, [token, imageUrl, videoUrl, title, kind, onChange]);

  useEffect(() => {
    const source = imageUrl || videoUrl;
    if (!source || source === lastSourceRef.current) return;
    lastSourceRef.current = source;
    if (!String(value || '').trim()) propose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, videoUrl]);

  return (
    <div className="ai-assist">
      <button type="button" className="btn btn--small btn--soft" disabled={busy || !canPropose} onClick={propose}>
        {busy ? 'Kim rédige…' : 'Proposer une description avec Kim'}
      </button>
      {note.text && <p className={note.kind === 'error' ? 'form-error' : 'muted'} role={note.kind === 'error' ? 'alert' : 'status'}>{note.text}</p>}
    </div>
  );
}
