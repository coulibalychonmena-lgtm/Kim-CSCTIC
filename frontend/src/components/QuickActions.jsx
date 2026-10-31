import { useLanguage } from '../context/LanguageContext.jsx';

export default function QuickActions({ onOpen }) {
  const { translate } = useLanguage();
  return (
    <nav className="quick" aria-label={translate('quick_title')}>
      <button type="button" className="btn btn--soft" onClick={() => onOpen('room')}>{translate('quick_room')}</button>
      <button type="button" className="btn btn--soft" onClick={() => onOpen('register')}>{translate('quick_register')}</button>
      <button type="button" className="btn btn--soft" onClick={() => onOpen('partner')}>{translate('quick_partner')}</button>
    </nav>
  );
}
