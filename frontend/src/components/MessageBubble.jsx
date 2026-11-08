import { Link } from 'react-router-dom';
import { LanguageOverride, useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useChat } from '../context/ChatContext.jsx';
import Markdown from './Markdown.jsx';
import GoogleSignInButton from './GoogleSignInButton.jsx';
import RequestSummaryCard from './RequestSummaryCard.jsx';
import InlineChatForm from './InlineChatForm.jsx';
import PresentationCarousel from './PresentationCarousel.jsx';
import SuggestionChips from './SuggestionChips.jsx';
import { VideoList } from './VideoPlayer.jsx';
import { responsiveImageProps } from '../utils/image-optimization.js';

/** Quota anonyme atteint : connexion en un clic avec Google, ou par e-mail. */
function QuotaNotice() {
  const { translate } = useLanguage();
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <p className="flag">{translate('quota_signed_in')}</p>;
  return (
    <div className="quota-notice">
      <GoogleSignInButton />
      <p className="muted">{translate('or_separator')}</p>
      <div className="cta-row">
        <Link to="/connexion" className="btn btn--primary btn--small">{translate('quota_login')}</Link>
        <Link to="/connexion?mode=register" className="btn btn--ghost btn--small">{translate('quota_register')}</Link>
      </div>
    </div>
  );
}

/** Un message s'affiche dans sa propre langue (celle de la conversation) : formulaires, mention d'agent, boutons compris. */
export default function MessageBubble({ message }) {
  return <LanguageOverride lang={message.lang}><MessageContent message={message} /></LanguageOverride>;
}

function MessageContent({ message }) {
  const { translate } = useLanguage();
  const { requestAgent, typing, rateMessage } = useChat();
  const isFromAgent = message.role === 'agent';
  const isFromKim = message.role === 'kim' || isFromAgent;
  const speakerName = isFromAgent ? translate('agent') : translate(isFromKim ? 'kim' : 'you');
  return (
    <div className={`msg ${isFromKim ? 'msg--kim' : 'msg--user'}`}>
      {isFromKim && <span className={`avatar${isFromAgent ? ' avatar--agent' : ''}`} aria-hidden="true">{isFromAgent ? '👤' : '김'}</span>}
      <div className="msg__col">
        {message.text && (
          <div className={`bubble${message.error ? ' bubble--error' : ''}`}>
            {isFromAgent && <strong className="bubble__speaker">{speakerName}</strong>}
            <span className="sr-only">{speakerName} : </span>
            {isFromKim ? <Markdown text={message.text} /> : message.text}
            {message.streaming && <span className="bubble__cursor" aria-hidden="true" />}
          </div>
        )}
        {message.images?.length > 0 && (
          <div className="msg__photos">
            {message.images.map((image) => (
              <figure key={image.url} className="photo">
                <a href={image.url} target="_blank" rel="noopener noreferrer">
                  <img {...responsiveImageProps(image.url, '(max-width: 640px) 80vw, 320px')} alt={image.title} loading="lazy" decoding="async" />
                </a>
                <figcaption>{image.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
        {message.presentation?.length > 0 && <PresentationCarousel slides={message.presentation} />}
        {message.videos?.length > 0 && <VideoList videos={message.videos} />}
        {message.form && <InlineChatForm message={message} />}
        {message.showSuggestions && <SuggestionChips exclude={['presentation']} />}
        {message.request && <RequestSummaryCard request={message.request} />}
        {message.sources?.length > 0 && (
          <p className="sources">
            <span>{translate('sources')} :</span>{' '}
            {message.sources.map((source, position) => (
              <span key={source.url}>
                {position > 0 && ', '}
                {/^https?:\/\//.test(source.url)
                  ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
                  : source.label}
              </span>
            ))}
          </p>
        )}
        {message.role === 'kim' && message.serverId && !message.streaming && !message.error && (
          <div className="feedback" role="group" aria-label={translate('feedback_label')}>
            <button type="button" className={`feedback__btn${message.rating === 1 ? ' is-active' : ''}`} aria-pressed={message.rating === 1}
              aria-label={translate('feedback_up')} title={translate('feedback_up')} onClick={() => rateMessage(message.id, message.serverId, 1)}>👍</button>
            <button type="button" className={`feedback__btn${message.rating === -1 ? ' is-active' : ''}`} aria-pressed={message.rating === -1}
              aria-label={translate('feedback_down')} title={translate('feedback_down')} onClick={() => rateMessage(message.id, message.serverId, -1)}>👎</button>
            {message.rating && <span className="muted" role="status">{translate('feedback_thanks')}</span>}
          </div>
        )}
        {message.quota && <QuotaNotice />}
        {message.offersAgent && (
          <button type="button" className="btn btn--soft btn--orange-outline btn--small" disabled={typing} onClick={requestAgent}>{translate('offer_agent_yes')}</button>
        )}
        {message.needsHuman && <p className="flag">{translate('human_flag')}</p>}
      </div>
    </div>
  );
}
