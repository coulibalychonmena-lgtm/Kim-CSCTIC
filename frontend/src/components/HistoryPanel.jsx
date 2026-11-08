import { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Historique des conversations de l'appareil (et du compte) : ouvrir, supprimer une conversation ou tout supprimer. */
export default function HistoryPanel({ onClose }) {
  const { translate, lang } = useLanguage();
  const { sessionId, listConversations, openConversation, deleteConversation, deleteAllConversations } = useChat();
  const [state, setState] = useState({ loading: true, items: [], error: '' });

  const reload = () => listConversations()
    .then((items) => setState({ loading: false, items, error: '' }))
    .catch((error) => setState({ loading: false, items: [], error: error.message }));
  useEffect(() => { reload(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (item) => {
    if (!window.confirm(translate('history_delete_confirm'))) return;
    try { await deleteConversation(item.session_id); await reload(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  };
  const removeAll = async () => {
    if (!window.confirm(translate('history_delete_all_confirm'))) return;
    try { await deleteAllConversations(); await reload(); } catch (error) { setState((current) => ({ ...current, error: error.message })); }
  };
  const open = (item) => { openConversation(item.session_id); onClose(); };
  const formatDate = (value) => new Date(value).toLocaleString(lang === 'ko' ? 'ko-KR' : lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="history" role="dialog" aria-modal="false" aria-label={translate('history_title')}>
      <div className="history__head">
        <h2>{translate('history_title')}</h2>
        <button type="button" className="btn btn--ghost btn--small" onClick={onClose}>{translate('close')}</button>
      </div>
      {state.loading && <p className="muted">{translate('loading')}</p>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {!state.loading && !state.items.length && !state.error && <p className="muted">{translate('history_empty')}</p>}
      <ul className="history__list">
        {state.items.map((item) => (
          <li key={item.session_id} className={`history__item${item.session_id === sessionId ? ' is-current' : ''}`}>
            <button type="button" className="history__open" onClick={() => open(item)}>
              <strong>{item.title || translate('history_untitled')}</strong>
              <span className="muted">{formatDate(item.last_at)} · {item.exchanges} {translate('history_messages')}{item.session_id === sessionId ? ` · ${translate('history_current')}` : ''}</span>
            </button>
            <button type="button" className="btn btn--ghost btn--small history__delete" onClick={() => remove(item)} aria-label={`${translate('history_delete')} : ${item.title || ''}`}>{translate('history_delete')}</button>
          </li>
        ))}
      </ul>
      {state.items.length > 0 && <button type="button" className="btn btn--ghost btn--small history__delete-all" onClick={removeAll}>{translate('history_delete_all')}</button>}
    </div>
  );
}
