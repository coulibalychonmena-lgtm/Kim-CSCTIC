import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import SuggestionChips from './SuggestionChips.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

/** Pendant le chargement, Kim est déjà là : message d'accueil visible, saisie bloquée quelques instants. */
function LoadingNote() {
  const { translate } = useLanguage();
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
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
  const { messages, typing, send } = useChat();
  const { isReady } = useBackendStatus();
  const [draft, setDraft] = useState('');
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
        {typing && <TypingIndicator />}
        {!isReady && <LoadingNote />}
        <div ref={endRef} />
      </div>
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
