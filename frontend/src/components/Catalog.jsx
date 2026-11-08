import { useEffect, useState } from 'react';
import { publicService } from '../services/publicService.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import ItemDetailDialog from './ItemDetailDialog.jsx';
import { responsiveImageProps } from '../utils/image-optimization.js';

/** Catalogue lu en direct depuis l'API (donc depuis la base Supabase) : ce que l'administration saisit apparaît ici. */
export default function Catalog() {
  const { translate, lang } = useLanguage();
  const { openForm } = useChat();
  const [detail, setDetail] = useState(null);
  const [catalog, setCatalog] = useState({ loading: true, failed: false, rooms: [], activities: [] });

  useEffect(() => {
    let isMounted = true;
    Promise.all([publicService.listRooms(lang), publicService.listActivities(lang)])
      .then(([rooms, activities]) => isMounted && setCatalog({ loading: false, failed: false, rooms, activities }))
      .catch(() => isMounted && setCatalog({ loading: false, failed: true, rooms: [], activities: [] }));
    return () => { isMounted = false; };
  }, [lang]);

  if (catalog.loading) return <p className="muted">{translate('loading')}</p>;
  if (catalog.failed) return <p className="muted">{translate('load_error')}</p>;

  const closeAndOpenForm = (type, prefill) => { setDetail(null); openForm(type, prefill); };

  return (
    <div className="catalog">
      <section aria-labelledby="catalog-rooms-title">
        <h2 id="catalog-rooms-title">{translate('catalog_rooms')}</h2>
        {catalog.rooms.length === 0 && <p className="muted">{translate('catalog_empty')}</p>}
        <ul>
          {catalog.rooms.map((room) => (
            <li key={room.id}>
              <button type="button" className="catalog__item" onClick={() => setDetail({ kind: 'room', item: room })} aria-haspopup="dialog">
                {room.image_url && <img className="catalog__thumb" {...responsiveImageProps(room.image_url, '72px')} alt="" loading="lazy" decoding="async" />}
                <span className="catalog__text">
                  <strong>{room.name}</strong>
                  <span className="muted">{[room.max_capacity ? `${translate('capacity')} : ${room.max_capacity}` : null, translate('more_details')].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="catalog-activities-title">
        <h2 id="catalog-activities-title">{translate('catalog_activities')}</h2>
        {catalog.activities.length === 0 && <p className="muted">{translate('catalog_empty')}</p>}
        <ul>
          {catalog.activities.map((activity) => (
            <li key={activity.id}>
              <button type="button" className="catalog__item" onClick={() => setDetail({ kind: 'activity', item: activity })} aria-haspopup="dialog">
                {activity.image_url && <img className="catalog__thumb" {...responsiveImageProps(activity.image_url, '72px')} alt="" loading="lazy" decoding="async" />}
                <span className="catalog__text">
                  <strong>{activity.title}</strong>
                  <span className="muted">{[activity.remaining_seats !== null ? `${activity.remaining_seats} ${translate('seats_left')}` : null, translate('more_details')].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {detail && (
        <ItemDetailDialog kind={detail.kind} item={detail.item} onClose={() => setDetail(null)}
          action={detail.kind === 'room'
            ? <button type="button" className="btn btn--primary" onClick={() => closeAndOpenForm('room_request', { room_id: detail.item.id })}>{translate('room_cta')}</button>
            : <button type="button" className="btn btn--primary" onClick={() => closeAndOpenForm('activity_registration', { activity_id: detail.item.id })}>{translate('activity_cta')}</button>} />
      )}
    </div>
  );
}
