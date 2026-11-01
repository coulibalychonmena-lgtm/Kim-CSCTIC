import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import QuickActions from '../components/QuickActions.jsx';
import Catalog from '../components/Catalog.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';

// Liens de la page d'accueil : /chat?form=room&room=ID, ?form=register&activity=ID, ?form=partner, ?agent=1
const FORM_BY_QUERY_VALUE = {
  room: { type: 'room_request', prefillParam: ['room_id', 'room'] },
  register: { type: 'activity_registration', prefillParam: ['activity_id', 'activity'] },
  partner: { type: 'partnership', prefillParam: null },
};

export default function HomePage() {
  const { translate } = useLanguage();
  const { openForm, send } = useChat();
  const { isReady } = useBackendStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestHandled = useRef(false);

  useEffect(() => {
    if (!isReady || requestHandled.current) return;
    const requestedForm = searchParams.get('form') ?? '';
    const wantsAgent = searchParams.get('agent') === '1';
    if (!wantsAgent && !Object.hasOwn(FORM_BY_QUERY_VALUE, requestedForm)) return;
    requestHandled.current = true;
    if (wantsAgent) {
      send(translate('agent_request'));
    } else {
      const { type, prefillParam } = FORM_BY_QUERY_VALUE[requestedForm];
      const prefill = prefillParam && searchParams.get(prefillParam[1]) ? { [prefillParam[0]]: searchParams.get(prefillParam[1]) } : {};
      openForm(type, prefill);
    }
    setSearchParams({}, { replace: true });
  }, [isReady, searchParams, setSearchParams, openForm, send, translate]);

  return (
    <>
      <a className="skip" href="#main">{translate('skip')}</a>
      <Header />
      <main id="main" className="home">
        <div className="home__chat">
          <ChatWindow />
          <QuickActions />
        </div>
        <aside className="home__aside"><Catalog /></aside>
      </main>
    </>
  );
}
