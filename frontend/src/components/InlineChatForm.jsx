import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import RoomRequestForm from './forms/RoomRequestForm.jsx';
import RegistrationForm from './forms/RegistrationForm.jsx';
import PartnershipForm from './forms/PartnershipForm.jsx';

const FORMS = {
  room_request: { Component: RoomRequestForm, titleKey: 'form_room' },
  activity_registration: { Component: RegistrationForm, titleKey: 'form_register' },
  partnership: { Component: PartnershipForm, titleKey: 'form_partner' },
};

/** Formulaire affiché directement dans le chat, bordé d'orange, à remplir sans quitter la conversation. */
export default function InlineChatForm({ message }) {
  const { translate } = useLanguage();
  const { completeForm, dismissForm } = useChat();
  const { form } = message;
  const definition = Object.hasOwn(FORMS, form.type) ? FORMS[form.type] : null;
  if (!definition) return null;
  if (form.state !== 'open') {
    return <p className="inline-form__done">{translate(form.state === 'sent' ? 'form_sent' : 'form_closed')}</p>;
  }
  const { Component, titleKey } = definition;
  return (
    <section className="inline-form" aria-label={translate(titleKey)}>
      <h3 className="inline-form__title">{translate(titleKey)}</h3>
      <p className="muted">{translate('form_required_hint')}</p>
      <Component prefill={form.prefill} onDone={(request) => completeForm(message.id, request)} onCancel={() => dismissForm(message.id)} />
    </section>
  );
}
