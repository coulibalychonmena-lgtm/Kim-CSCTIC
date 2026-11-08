import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteFooter from '../components/SiteFooter.jsx';
import Header from '../components/Header.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EventsList, NewsList } from '../components/EntryLists.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { authService } from '../services/authService.js';
import { publicService } from '../services/publicService.js';
import { useAutoRefreshingData } from '../components/admin/useAutoRefreshingData.js';
import { useLoadedData } from '../hooks/useLoadedData.js';
import { formatDateTime } from '../utils/format.js';

const LIVE_REFRESH_MILLISECONDS = 8000;
const STATUS_KEY = {
  'En attente de validation humaine': 'status_pending', "Liste d'attente": 'status_waitlist', Nouveau: 'status_received',
  Validée: 'status_approved', Confirmée: 'status_confirmed', Refusée: 'status_refused',
  "En cours d'étude": 'status_review', Traité: 'status_done', Archivé: 'status_archived',
};
const WAITING_STATUSES = ['En attente de validation humaine', "Liste d'attente", 'Nouveau', "En cours d'étude"];

function ProgressTracker({ status }) {
  const { translate } = useLanguage();
  const decided = !WAITING_STATUSES.includes(status);
  const steps = [['track_sent', true], ['track_review', true], ['track_decision', decided]];
  return (
    <ol className="tracker" aria-label={translate('track_label')}>
      {steps.map(([labelKey, reached], position) => (
        <li key={labelKey} className={`tracker__step${reached ? ' is-reached' : ''}${position === 1 && !decided ? ' is-current' : ''}`}>{translate(labelKey)}</li>
      ))}
    </ol>
  );
}

function RequestCard({ request }) {
  const { translate, lang } = useLanguage();
  return (
    <article className="card request-card">
      <header className="card__head">
        <h3>{request.title}</h3>
        <StatusBadge status={request.status} label={translate(STATUS_KEY[request.status] || 'status_pending')} />
      </header>
      <p className="muted">{translate(request.kindKey)} · {formatDateTime(request.created_at, lang)}</p>
      {request.details.map((line) => <p key={line}>{line}</p>)}
      <ProgressTracker status={request.status} />
      {request.admin_comment && <p className="request-card__comment"><strong>{translate('admin_message')} :</strong> {request.admin_comment}</p>}
    </article>
  );
}

function flattenRequests(data, translate) {
  const rooms = data.room_requests.map((item) => ({
    ...item, kindKey: 'req_room', title: item.room_name,
    details: [`${item.requested_date} · ${item.start_time}–${item.end_time}`, `${translate('s_attendees')} : ${item.attendees}`],
  }));
  const registrations = data.registrations.map((item) => ({
    ...item, kindKey: 'req_activity', title: item.activity_title, details: [`${item.firstname} ${item.lastname}`],
  }));
  const partnerships = data.partnerships.map((item) => ({
    ...item, kindKey: 'req_partner', title: item.organization, details: [translate(`ptype_${item.partnership_type}`)],
  }));
  return [...rooms, ...registrations, ...partnerships].sort((first, second) => new Date(second.created_at) - new Date(first.created_at));
}

function RequestsPanel() {
  const { token } = useAuth();
  const { translate, lang } = useLanguage();
  const { data, loading, error, updatedAt } = useAutoRefreshingData(() => authService.listMyRequests(token, lang), [token, lang], LIVE_REFRESH_MILLISECONDS);
  const requests = data ? flattenRequests(data, translate) : [];
  return (
    <section aria-label={translate('tab_requests')}>
      <p className="live"><span className="live__dot" aria-hidden="true" /> {translate('live')}{updatedAt && ` · ${translate('updated')} ${new Date(updatedAt).toLocaleTimeString()}`}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">{translate('loading')}</p>}
      {data && requests.length === 0 && <p className="muted">{translate('no_requests')} <Link to="/chat">{translate('cta_chat')}</Link></p>}
      <div className="cards">{requests.map((request) => <RequestCard key={`${request.kindKey}-${request.id}`} request={request} />)}</div>
    </section>
  );
}

function EventsPanel() {
  const { translate, lang } = useLanguage();
  const { data, loading } = useLoadedData(() => publicService.listEvents(lang), [lang]);
  return (
    <section aria-label={translate('tab_events')}>
      {!loading && data.length === 0 && <p className="muted">{translate('no_events')}</p>}
      <EventsList events={data} />
    </section>
  );
}

function NewsPanel() {
  const { translate, lang } = useLanguage();
  const { data, loading } = useLoadedData(() => publicService.listNews(lang), [lang]);
  return (
    <section aria-label={translate('tab_news')}>
      {!loading && data.length === 0 && <p className="muted">{translate('no_news')}</p>}
      <NewsList news={data} />
    </section>
  );
}

const TABS = [
  { id: 'requests', labelKey: 'tab_requests', Panel: RequestsPanel },
  { id: 'events', labelKey: 'tab_events', Panel: EventsPanel },
  { id: 'news', labelKey: 'tab_news', Panel: NewsPanel },
];

/** Vérification de l'e-mail et droits sur ses données : export (accès) et suppression du compte (effacement). */
function AccountDataPanel() {
  const { token, user, logout } = useAuth();
  const { translate, lang } = useLanguage();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const resend = async () => {
    try { await authService.resendVerification(token, lang); setMessage(translate('verify_resent')); } catch (failure) { setError(failure.message); }
  };
  const exportData = async () => {
    try {
      const data = await authService.exportMyData(token);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      link.download = 'mes-donnees-cscticao.json';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (failure) { setError(failure.message); }
  };
  const deleteAccount = async () => {
    if (!window.confirm(translate('delete_confirm'))) return;
    try { await authService.deleteMyAccount(token); logout(); navigate('/', { replace: true }); } catch (failure) { setError(failure.message); }
  };
  return (
    <section className="card account-data" aria-label={translate('my_data_title')}>
      <h2>{translate('my_data_title')}</h2>
      {user?.email_verified === false && (
        <p className="flag">{translate('verify_banner')} <button type="button" className="btn btn--ghost btn--small" onClick={resend}>{translate('verify_resend')}</button></p>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="cta-row">
        <button type="button" className="btn btn--soft" onClick={exportData}>{translate('export_data')}</button>
        <button type="button" className="btn btn--ghost" onClick={deleteAccount}>{translate('delete_account')}</button>
        <Link to="/confidentialite" className="btn btn--ghost">{translate('privacy_link_title')}</Link>
      </div>
    </section>
  );
}

export default function MySpacePage() {
  const { translate } = useLanguage();
  const { user, isAdministrator } = useAuth();
  const [activeTabId, setActiveTabId] = useState(TABS[0].id);
  const { Panel } = TABS.find((tab) => tab.id === activeTabId);
  return (
    <>
      <Header />
      <main className="space">
        <h1>{translate('space_title')}</h1>
        <p className="muted">{translate('space_hello')} {user?.name}</p>
        <div className="cta-row">
          <Link to="/chat" className="btn btn--primary">{translate('cta_chat')}</Link>
          {isAdministrator && <Link to="/admin/dashboard" className="btn btn--soft">{translate('nav_admin')}</Link>}
        </div>
        <div role="tablist" aria-label={translate('space_title')} className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id} type="button" role="tab" aria-selected={activeTabId === tab.id}
              className={`tabs__btn${activeTabId === tab.id ? ' is-active' : ''}`} onClick={() => setActiveTabId(tab.id)}
            >{translate(tab.labelKey)}</button>
          ))}
        </div>
        <Panel />
        <AccountDataPanel />
      </main>
      <SiteFooter />
    </>
  );
}
