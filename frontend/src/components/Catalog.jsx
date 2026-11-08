import { useEffect, useState } from 'react';
import { publicService } from '../services/publicService.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { responsiveImageProps } from '../utils/image-optimization.js';

/** Catalogue lu en direct depuis l'API (donc depuis la base Supabase) : ce que l'administration saisit apparaît ici. */
export default function Catalog() {
  const { translate, lang } = useLanguage();
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

  return (
    <div className="catalog">
      <section aria-labelledby="catalog-rooms-title">
        <h2 id="catalog-rooms-title">{translate('catalog_rooms')}</h2>
        {catalog.rooms.length === 0 && <p className="muted">{translate('catalog_empty')}</p>}
        <ul>
          {catalog.rooms.map((room) => (
            <li key={room.id}>
              {room.image_url && <img className="catalog__photo" {...responsiveImageProps(room.image_url, '120px')} alt={room.name} loading="lazy" decoding="async" />}
              <strong>{room.name}</strong>
              {room.max_capacity && <span className="muted">{`${translate('capacity')} : ${room.max_capacity}`}</span>}
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
              {activity.image_url && <img className="catalog__photo" {...responsiveImageProps(activity.image_url, '120px')} alt={activity.title} loading="lazy" decoding="async" />}
              <strong>{activity.title}</strong>
              {activity.remaining_seats !== null && <span className="muted">{`${activity.remaining_seats} ${translate('seats_left')}`}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
