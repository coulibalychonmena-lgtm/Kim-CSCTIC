import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import MessageBubble from './MessageBubble.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import WakePanel from './WakePanel.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

export default function ChatWindow() {
  const { translate } = useLanguage();
  const { messages, typing, send } = useChat();
  const { isReady } = useBackendStatus();
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, typing, isReady]);

  const submit = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    send(draft);
    setDraft('');
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  };

  if (!isReady) return <section className="chat chat--waking" aria-label="Kim"><WakePanel /></section>;

  return (
    <section className="chat" aria-label="Kim">
      <div className="chat__log" role="log" aria-live="polite">
        <div className="msg msg--kim">
          <span className="avatar" aria-hidden="true">김</span>
          <div className="msg__col"><div className="bubble">{translate('greeting')}</div></div>
        </div>
        {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        {typing && <TypingIndicator />}
        <div ref={endRef} />
      </div>
      <form className="chat__input" onSubmit={submit}>
        <label htmlFor="chat-draft" className="sr-only">{translate('placeholder')}</label>
        <textarea
          id="chat-draft" rows={1} value={draft} maxLength={2000}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown}
          placeholder={translate('placeholder')}
        />
        <button type="submit" className="btn btn--primary" disabled={typing || !draft.trim()}>{translate('send')}</button>
      </form>
    </section>
  );
}
