import { useLanguage } from '../context/LanguageContext.jsx';
import { formatDateTime, formatDay } from '../utils/format.js';

export function EventsList({ events }) {
  const { lang } = useLanguage();
  return (
    <ul className="entry-grid">
      {events.map((event) => (
        <li key={event.id} className="entry-card">
          {event.image_url && <img src={event.image_url} alt="" loading="lazy" />}
          <div className="entry-card__body">
            <p className="entry-card__date">{formatDateTime(event.starts_at, lang)}</p>
            <h3>{event.title}</h3>
            {event.location && <p className="muted">{event.location}</p>}
            {event.description && <p>{event.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NewsList({ news }) {
  const { lang, translate } = useLanguage();
  return (
    <ul className="entry-grid">
      {news.map((item) => (
        <li key={item.id} className="entry-card">
          {item.image_url && <img src={item.image_url} alt="" loading="lazy" />}
          <div className="entry-card__body">
            <p className="entry-card__date">{formatDay(item.published_at, lang)}</p>
            <h3>{item.title}</h3>
            {item.summary && <p>{item.summary}</p>}
            <details>
              <summary>{translate('read_more')}</summary>
              {item.content.split(/\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </details>
          </div>
        </li>
      ))}
    </ul>
  );
}
