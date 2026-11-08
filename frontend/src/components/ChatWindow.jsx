import { useEffect, useRef, useState } from 'react';
import HistoryPanel from './HistoryPanel.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import SuggestionChips from './SuggestionChips.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

/** Pendant le chargement, Kim est déjà là : message d'accueil visible, saisie bloquée quelques instants. */
function LoadingNote() {
  const { translate } = useLanguage();
  const { status, problem, retry } = useBackendStatus();
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (status === 'unreachable' && !isOffline) {
    return (
      <div className="loading-note loading-note--problem" role="alert">
        <div>
          <strong>{translate('unreachable_title')}</strong>
          <span>{translate(`unreachable_${problem || 'network'}`)}</span>
          <small>{translate('unreachable_still_trying')}</small>
          <button type="button" className="btn btn--small btn--primary" onClick={retry}>{translate('retry')}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="loading-note" role="status" aria-live="polite">
      <span className="wake__spinner wake__spinner--small" aria-hidden="true" />
      <div>
        <strong>{translate(isOffline ? 'wake_offline_title' : 'wake_title')}</strong>
        <span>{translate(isOffline ? 'wake_offline' : 'wake_text')}</span>
      </div>
    </div>
  );
}

export default function ChatWindow() {
  const { translate } = useLanguage();
  const { messages, typing, send, anonymousRemaining, startNewConversation } = useChat();
  const { isReady } = useBackendStatus();
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, typing, isReady]);

  const submit = (event) => {
    event.preventDefault();
    if (!isReady || !draft.trim()) return;
    send(draft);
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  };

  return (
    <section className="chat" aria-label="Kim">
      <div className="chat__tools">
        <button type="button" className="btn btn--ghost btn--small" onClick={() => setHistoryOpen(true)} aria-haspopup="dialog">{translate('history_title')}</button>
        {messages.length > 0 && <button type="button" className="btn btn--ghost btn--small" onClick={startNewConversation} disabled={typing}>{translate('new_conversation')}</button>}
      </div>
      {historyOpen && <HistoryPanel onClose={() => setHistoryOpen(false)} />}
      <div className="chat__log" role="log" aria-live="polite">
        <div className="msg msg--kim">
          <span className="avatar" aria-hidden="true">김</span>
          <div className="msg__col"><div className="bubble">{translate('greeting')}</div></div>
        </div>
        <div className="msg msg--kim">
          <span className="avatar" aria-hidden="true">김</span>
          <div className="msg__col">
            <div className="bubble">{translate('greeting_question')}</div>
            <SuggestionChips />
          </div>
        </div>
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {typing && !messages.some((message) => message.streaming) && <TypingIndicator />}
        {!isReady && <LoadingNote />}
        <div ref={endRef} />
      </div>
      {anonymousRemaining !== null && anonymousRemaining <= 2 && (
        <p className="chat__quota-hint" role="status">{translate('remaining_questions')} {anonymousRemaining}</p>
      )}
      <form className="chat__input" onSubmit={submit}>
        <label htmlFor="chat-draft" className="sr-only">{translate('placeholder')}</label>
        <textarea
          id="chat-draft" rows={1} value={draft} maxLength={2000}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown}
          placeholder={translate(isReady ? 'placeholder' : 'wake_title')} disabled={!isReady}
        />
        <button type="submit" className="btn btn--primary" disabled={!isReady || typing || !draft.trim()}>{translate('send')}</button>
      </form>
    </section>
  );
}
