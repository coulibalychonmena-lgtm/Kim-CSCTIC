import { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { responsiveImageProps } from '../utils/image-optimization.js';
import { detailRows } from '../utils/detail-rows.js';

/**
 * Fiche complète d'un espace ou d'une formation, dans une fenêtre modale native (<dialog> : focus géré, Échap pour fermer).
 * `action` : bouton principal (réserver / s'inscrire) fourni par la page.
 */
export default function ItemDetailDialog({ kind, item, onClose, action = null }) {
  const { translate } = useLanguage();
  const dialogRef = useRef(null);
  const title = kind === 'room' ? item.name : item.title;
  const rows = detailRows(kind, item, translate);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return (
    <dialog ref={dialogRef} className="detail" aria-labelledby="detail-title" onClose={onClose}
      onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
      <div className="detail__inner">
        <button type="button" className="detail__close" onClick={onClose} aria-label={translate('close')}>×</button>
        {item.image_url && <img className="detail__photo" {...responsiveImageProps(item.image_url, '(max-width: 640px) 100vw, 640px')} alt={title} decoding="async" />}
        <h2 id="detail-title">{title}</h2>
        {item.description && <p className="detail__text">{item.description}</p>}
        {rows.length > 0 ? (
          <dl className="detail__list">
            {rows.map(([label, value]) => (
              <div key={label} className="detail__row">
                <dt>{label}</dt>
                <dd>{Array.isArray(value) ? <ul>{value.map((entry) => <li key={entry}>{entry}</li>)}</ul> : value}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="muted">{translate('detail_none')}</p>}
        <div className="detail__actions">
          {action}
          <button type="button" className="btn btn--ghost" onClick={onClose}>{translate('close')}</button>
        </div>
      </div>
    </dialog>
  );
}
