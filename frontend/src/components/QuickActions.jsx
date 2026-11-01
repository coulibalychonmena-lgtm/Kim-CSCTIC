import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

/** Les trois démarches : chaque bouton fait afficher le formulaire correspondant dans le chat. */
export default function QuickActions() {
  const { translate } = useLanguage();
  const { openForm } = useChat();
  const { isReady } = useBackendStatus();
  return (
    <nav className="quick" aria-label={translate('quick_title')}>
      <button type="button" className="btn btn--soft btn--orange-outline" disabled={!isReady} onClick={() => openForm('room_request')}>{translate('quick_room')}</button>
      <button type="button" className="btn btn--soft btn--orange-outline" disabled={!isReady} onClick={() => openForm('activity_registration')}>{translate('quick_register')}</button>
      <button type="button" className="btn btn--soft btn--orange-outline" disabled={!isReady} onClick={() => openForm('partnership')}>{translate('quick_partner')}</button>
    </nav>
  );
}
