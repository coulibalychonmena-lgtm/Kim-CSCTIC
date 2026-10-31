import { useLanguage } from '../context/LanguageContext.jsx';
import RequestSummaryCard from './RequestSummaryCard.jsx';

export default function MessageBubble({ message }) {
  const { translate } = useLanguage();
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
            {message.text}
          </div>
        )}
        {message.images?.length > 0 && (
          <div className="msg__photos">
            {message.images.map((image) => (
              <figure key={image.url} className="photo">
                <a href={image.url} target="_blank" rel="noopener noreferrer">
                  <img src={image.url} alt={image.title} loading="lazy" />
                </a>
                <figcaption>{image.title}</figcaption>
              </figure>
            ))}
          </div>
        )}
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
        {message.needsHuman && <p className="flag">{translate('human_flag')}</p>}
      </div>
    </div>
  );
}
