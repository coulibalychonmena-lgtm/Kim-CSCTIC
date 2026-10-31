import { useLanguage } from '../context/LanguageContext.jsx';

export default function TypingIndicator() {
  const { translate } = useLanguage();
  return (
    <div className="msg msg--kim" role="status">
      <span className="avatar" aria-hidden="true">김</span>
      <div className="bubble bubble--typing">
        <span className="dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="sr-only">{translate('typing')}</span>
      </div>
    </div>
  );
}
