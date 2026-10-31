import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import QuickActions from '../components/QuickActions.jsx';
import Catalog from '../components/Catalog.jsx';
import ModalDialog from '../components/ModalDialog.jsx';
import RoomRequestForm from '../components/forms/RoomRequestForm.jsx';
import RegistrationForm from '../components/forms/RegistrationForm.jsx';
import PartnershipForm from '../components/forms/PartnershipForm.jsx';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const FORMS = {
  room: { titleKey: 'form_room', Component: RoomRequestForm },
  register: { titleKey: 'form_register', Component: RegistrationForm },
  partner: { titleKey: 'form_partner', Component: PartnershipForm },
};

export default function HomePage() {
  const { translate } = useLanguage();
  const { addRequestSummary } = useChat();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedForm = searchParams.get('form');
  const open = Object.hasOwn(FORMS, requestedForm ?? '') ? requestedForm : null;
  const setOpen = useCallback((formKey) => setSearchParams({ form: formKey }), [setSearchParams]);
  const closeForm = useCallback(() => setSearchParams({}), [setSearchParams]);

  const activeForm = open ? FORMS[open] : null;

  return (
    <>
      <a className="skip" href="#main">{translate('skip')}</a>
      <Header />
      <main id="main" className="home">
        <div className="home__chat">
          <ChatWindow />
          <QuickActions onOpen={setOpen} />
        </div>
        <aside className="home__aside"><Catalog /></aside>
      </main>
      {activeForm && (
        <ModalDialog title={translate(activeForm.titleKey)} onClose={closeForm}>
          <activeForm.Component
            onCancel={closeForm}
            onDone={(request) => { addRequestSummary(request); closeForm(); }}
          />
        </ModalDialog>
      )}
    </>
  );
}
