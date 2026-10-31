import { useId, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';

/** Champ photo : envoie le fichier sur Cloudinary (via l'API) puis renvoie son adresse au formulaire. */
export default function ImageUploadField({ label, imageUrl, onChange }) {
  const inputId = useId();
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const uploadSelectedFile = async (event) => {
    const [selectedFile] = event.target.files;
    event.target.value = '';
    if (!selectedFile) return;
    setUploading(true); setUploadError('');
    try {
      const { url } = await adminService.uploadImage(token, selectedFile);
      onChange(url);
    } catch (error) { setUploadError(error.message); } finally { setUploading(false); }
  };

  return (
    <div className="field image-field">
      <label htmlFor={inputId}>{label}</label>
      {imageUrl && <img className="image-field__preview" src={imageUrl} alt="Aperçu de la photo" />}
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadSelectedFile} disabled={uploading} />
      {uploading && <p className="muted">Envoi de la photo…</p>}
      {imageUrl && !uploading && (
        <button type="button" className="btn btn--small btn--soft" onClick={() => onChange('')}>Retirer la photo</button>
      )}
      {uploadError && <p className="field__error" role="alert">{uploadError}</p>}
      <p className="muted">JPEG, PNG ou WebP, 5 Mo maximum. L'enregistrement du formulaire applique le changement.</p>
    </div>
  );
}
