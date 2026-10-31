import { useLanguage } from '../context/LanguageContext.jsx';
import StatusBadge from './StatusBadge.jsx';

const TRANSLATION_KEY_BY_STATUS = {
  'En attente de validation humaine': 'status_pending',
  "Liste d'attente": 'status_waitlist',
  Nouveau: 'status_received',
};

/** Lignes du récapitulatif : [clé de traduction du libellé, valeur], sans les valeurs vides. */
function buildSummaryRows(request, translate) {
  const summary = request.summary || {};
  const rowsByRequestKind = {
    room_request: [
      ['s_room', summary.room], ['s_date', summary.date],
      ['s_time', summary.start_time && `${summary.start_time} – ${summary.end_time}`],
      ['s_attendees', summary.attendees], ['s_purpose', summary.purpose], ['s_requester', summary.requester],
    ],
    activity_registration: [
      ['s_activity', summary.activity], ['s_name', summary.name], ['s_age', summary.age], ['s_level', summary.level],
    ],
    partnership: [
      ['s_org', summary.organization], ['s_contact', summary.contact],
      ['s_type', summary.type && translate(`ptype_${summary.type}`)],
    ],
  };
  return (rowsByRequestKind[request.kind] || [])
    .filter(([, value]) => value !== undefined && value !== null && value !== '');
}

/** Récapitulatif d'une demande, avec le badge orange « En attente de validation humaine ». */
export default function RequestSummaryCard({ request }) {
  const { translate } = useLanguage();
  return (
    <section className="summary" aria-label={translate('summary_title')}>
      <header className="summary__head">
        <h3>{translate('summary_title')}</h3>
        <StatusBadge status={request.status} label={translate(TRANSLATION_KEY_BY_STATUS[request.status] || 'status_pending')} />
      </header>
      <dl className="summary__list">
        {buildSummaryRows(request, translate).map(([labelKey, value]) => (
          <div key={labelKey}><dt>{translate(labelKey)}</dt><dd>{String(value)}</dd></div>
        ))}
      </dl>
      {request.warnings?.length > 0 && (
        <ul className="summary__warn" aria-label={translate('warn_title')}>
          {request.warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}
        </ul>
      )}
      <p className="summary__notice">{translate('notice')}</p>
    </section>
  );
}
