import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';

const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Lundi' }, { dayOfWeek: 2, label: 'Mardi' }, { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' }, { dayOfWeek: 5, label: 'Vendredi' }, { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 7, label: 'Dimanche' },
];

const closedWeek = () => Object.fromEntries(WEEK_DAYS.map(({ dayOfWeek }) => [dayOfWeek, { isOpen: false, openTime: '', closeTime: '' }]));

/** Édition des horaires d'ouverture : un jour décoché est un jour de fermeture. */
export default function OpeningHoursEditor() {
  const { token } = useAuth();
  const [week, setWeek] = useState(closedWeek);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ kind: '', text: '' });

  useEffect(() => {
    adminService.listOpeningHours()
      .then((openDays) => {
        const loadedWeek = closedWeek();
        for (const openDay of openDays) {
          loadedWeek[openDay.day_of_week] = { isOpen: true, openTime: openDay.open_time, closeTime: openDay.close_time };
        }
        setWeek(loadedWeek);
      })
      .catch((error) => setMessage({ kind: 'error', text: error.message }))
      .finally(() => setLoading(false));
  }, []);

  const updateDay = (dayOfWeek, changes) =>
    setWeek((currentWeek) => ({ ...currentWeek, [dayOfWeek]: { ...currentWeek[dayOfWeek], ...changes } }));

  const save = async () => {
    setSaving(true); setMessage({ kind: '', text: '' });
    try {
      const openDays = WEEK_DAYS
        .filter(({ dayOfWeek }) => week[dayOfWeek].isOpen)
        .map(({ dayOfWeek }) => ({
          day_of_week: dayOfWeek, open_time: week[dayOfWeek].openTime, close_time: week[dayOfWeek].closeTime,
        }));
      await adminService.replaceOpeningHours(token, openDays);
      setMessage({ kind: 'success', text: 'Horaires enregistrés.' });
    } catch (error) {
      const fieldDetails = error.details && typeof error.details === 'object' ? ` ${Object.values(error.details).join(' ')}` : '';
      setMessage({ kind: 'error', text: `${error.message}${fieldDetails}` });
    } finally { setSaving(false); }
  };

  return (
    <section aria-labelledby="opening-hours-title" className="opening-hours">
      <h3 id="opening-hours-title">Horaires d'ouverture</h3>
      {loading && <p className="muted">Chargement…</p>}
      {!loading && (
        <>
          <p className="muted">Cochez les jours d'ouverture et indiquez les heures. Un jour décoché est affiché comme fermé.</p>
          <div className="opening-hours__grid">
            {WEEK_DAYS.map(({ dayOfWeek, label }) => (
              <div key={dayOfWeek} className="opening-hours__row">
                <label className="opening-hours__day">
                  <input type="checkbox" checked={week[dayOfWeek].isOpen}
                    onChange={(event) => updateDay(dayOfWeek, { isOpen: event.target.checked })} />
                  {label}
                </label>
                <label className="sr-only" htmlFor={`opening-${dayOfWeek}`}>Ouverture, {label}</label>
                <input id={`opening-${dayOfWeek}`} type="time" disabled={!week[dayOfWeek].isOpen} value={week[dayOfWeek].openTime}
                  onChange={(event) => updateDay(dayOfWeek, { openTime: event.target.value })} />
                <span aria-hidden="true">–</span>
                <label className="sr-only" htmlFor={`closing-${dayOfWeek}`}>Fermeture, {label}</label>
                <input id={`closing-${dayOfWeek}`} type="time" disabled={!week[dayOfWeek].isOpen} value={week[dayOfWeek].closeTime}
                  onChange={(event) => updateDay(dayOfWeek, { closeTime: event.target.value })} />
              </div>
            ))}
          </div>
          {message.text && <p className={message.kind === 'error' ? 'form-error' : 'muted'} role="alert">{message.text}</p>}
          <button type="button" className="btn btn--primary" disabled={saving} onClick={save}>
            {saving ? 'Enregistrement…' : 'Enregistrer les horaires'}
          </button>
        </>
      )}
    </section>
  );
}
