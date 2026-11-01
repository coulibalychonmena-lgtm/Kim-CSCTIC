import FormField from '../FormField.jsx';
import FormActions from './FormActions.jsx';
import { useFormState } from './useFormState.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { publicService } from '../../services/publicService.js';
import { useAccountPrefill } from './useAccountPrefill.js';

const REQUIRED_FIELDS = ['organization', 'contact_name', 'email', 'partnership_type', 'description'];

const PARTNERSHIP_TYPES = ['Technique', 'Financier', 'Événementiel', 'Pédagogique'];
const NEW_PARTNERSHIP_STATUS = 'Nouveau';

export default function PartnershipForm({ onDone, onCancel, prefill = {} }) {
  const { translate } = useLanguage();
  const { token, contact } = useAccountPrefill();
  const formState = useFormState({
    organization: '', contact_name: `${contact.firstname} ${contact.lastname}`.trim(), email: contact.email, phone: contact.phone, partnership_type: '', description: '',
    ...prefill,
  }, { required: REQUIRED_FIELDS });

  const onSubmit = formState.handleSubmit(async (values) => {
    const created = await publicService.submitPartnershipProposal(values, token);
    onDone({
      kind: 'partnership', id: created.id, status: NEW_PARTNERSHIP_STATUS, warnings: [],
      summary: { organization: values.organization, contact: values.contact_name, type: values.partnership_type },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <FormField label={translate('f_org')} required error={formState.fieldErrors.organization} {...formState.bindField('organization')} />
      <FormField label={translate('f_contact')} required error={formState.fieldErrors.contact_name} {...formState.bindField('contact_name')} />
      <div className="form__row">
        <FormField label={translate('f_email')} type="email" required error={formState.fieldErrors.email} {...formState.bindField('email')} />
        <FormField label={translate('f_phone')} type="tel" error={formState.fieldErrors.phone} {...formState.bindField('phone')} />
      </div>
      <FormField as="select" label={translate('f_ptype')} required error={formState.fieldErrors.partnership_type} {...formState.bindField('partnership_type')}>
        <option value="">{translate('choose')}</option>
        {PARTNERSHIP_TYPES.map((type) => <option key={type} value={type}>{translate(`ptype_${type}`)}</option>)}
      </FormField>
      <FormField as="textarea" label={translate('f_desc')} required error={formState.fieldErrors.description} {...formState.bindField('description')} />
      <FormActions error={formState.formError} submitting={formState.submitting} onCancel={onCancel} />
    </form>
  );
}
