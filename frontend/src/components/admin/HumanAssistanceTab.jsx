import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { adminService } from '../../services/adminService.js';
import ModalDialog from '../ModalDialog.jsx';
import { useAutoRefreshingData, formatDateTime } from './useAutoRefreshingData.js';

const THREAD_CLASS_BY_ROLE = { user: 'thread__user', kim: 'thread__kim', agent: 'thread__agent' };
const SPEAKER_BY_ROLE = { user: 'Visiteur', kim: 'Kim', agent: 'Agent' };
const CONVERSATION_REFRESH_MILLISECONDS = 5000;

/** Conversation ouverte : l'agent peut reprendre la main, répondre au visiteur, puis rendre la main à Kim. */
function ConversationDialog({ sessionId, onClose }) {
  const { token } = useAuth();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const { data: session, error: loadError, reload } = useAutoRefreshingData(
    () => adminService.getChatSession(token, sessionId),
    [token, sessionId],
    CONVERSATION_REFRESH_MILLISECONDS,
  );

  const runAction = async (action) => {
    setBusy(true); setActionError('');
    try { await action(); await reload(); } catch (error) { setActionError(error.message); } finally { setBusy(false); }
  };

  const sendReply = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    runAction(async () => { await adminService.replyToVisitor(token, sessionId, draft.trim()); setDraft(''); });
  };

  return (
    <ModalDialog title="Conversation" wide onClose={onClose}>
      {(loadError || actionError) && <p className="form-error" role="alert">{actionError || loadError}</p>}
      {session && (
        <>
          <div className="takeover-bar">
            <StatusLine active={session.takeover_active} />
            {session.takeover_active
              ? <button type="button" className="btn btn--small btn--soft" disabled={busy} onClick={() => runAction(() => adminService.endTakeover(token, sessionId))}>Rendre la main à Kim</button>
              : <button type="button" className="btn btn--small btn--primary" disabled={busy} onClick={() => runAction(() => adminService.startTakeover(token, sessionId))}>Reprendre la main</button>}
          </div>
          {session.timeline.map((entry) => (
            <div key={entry.id} className="thread">
              <p className={THREAD_CLASS_BY_ROLE[entry.role]}><strong>{SPEAKER_BY_ROLE[entry.role]} :</strong> {entry.text}</p>
              <p className="muted">{formatDateTime(entry.created_at)}</p>
            </div>
          ))}
          <form className="reply-form" onSubmit={sendReply}>
            <label htmlFor="agent-reply" className="sr-only">Votre réponse au visiteur</label>
            <textarea id="agent-reply" rows={3} maxLength={2000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Votre réponse au visiteur (elle apparaît dans son chat)…" />
            <button type="submit" className="btn btn--primary" disabled={busy || !draft.trim()}>Envoyer au visiteur</button>
          </form>
        </>
      )}
    </ModalDialog>
  );
}

const StatusLine = ({ active }) => (
  <p className="muted">{active ? 'Un agent a la main : Kim ne répond plus dans cette conversation.' : 'Kim répond actuellement au visiteur.'}</p>
);

export default function HumanAssistanceTab() {
  const { token } = useAuth();
  const { data: flaggedChats, loading, error } = useAutoRefreshingData(() => adminService.listFlaggedChats(token), [token]);
  const [openedSessionId, setOpenedSessionId] = useState(null);

  return (
    <section aria-labelledby="human-assistance-title">
      <h2 id="human-assistance-title">Assistance humaine et monitoring</h2>
      <p className="muted">Conversations où l'usager a demandé un agent ou où Kim n'a pas pu répondre. Ouvrez-en une pour reprendre la main.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="muted">Chargement…</p>}
      {flaggedChats && flaggedChats.length === 0 && <p className="muted">Aucune conversation à reprendre.</p>}
      <div className="cards">
        {flaggedChats?.map((chatLog) => (
          <article key={chatLog.id} className="card">
            <p className="muted">{formatDateTime(chatLog.created_at)} · langue : {chatLog.detected_language || '—'}</p>
            <p><strong>Usager :</strong> {chatLog.user_message}</p>
            {chatLog.kim_response && <p><strong>Kim :</strong> {chatLog.kim_response}</p>}
            <button type="button" className="btn btn--small btn--primary" onClick={() => setOpenedSessionId(chatLog.session_id)}>Ouvrir la conversation</button>
          </article>
        ))}
      </div>
      {openedSessionId && <ConversationDialog sessionId={openedSessionId} onClose={() => setOpenedSessionId(null)} />}
    </section>
  );
}
