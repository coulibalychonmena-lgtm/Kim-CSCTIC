import { useEffect, useState } from 'react';
import FormField from '../FormField.jsx';
import FormActions from './FormActions.jsx';
import { useFormState } from './useFormState.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { publicService } from '../../services/publicService.js';
import { useAccountPrefill } from './useAccountPrefill.js';

const REQUIRED_FIELDS = ['activity_id', 'lastname', 'firstname', 'age', 'email', 'phone'];

export default function RegistrationForm({ onDone, onCancel, prefill = {} }) {
  const { translate, lang } = useLanguage();
  const { token, contact } = useAccountPrefill();
  const [activities, setActivities] = useState(null);
  const formState = useFormState({
    activity_id: '', lastname: contact.lastname, firstname: contact.firstname, age: '', email: contact.email, phone: contact.phone, current_level: '',
    ...prefill,
  }, { required: REQUIRED_FIELDS });

  useEffect(() => {
    publicService.listActivities(lang).then(setActivities).catch(() => setActivities([]));
  }, [lang]);

  const onSubmit = formState.handleSubmit(async (values) => {
    const age = Number(values.age);
    const created = await publicService.submitActivityRegistration({ ...values, age }, token);
    onDone({
      kind: 'activity_registration', id: created.id, status: created.status, warnings: [],
      summary: {
        activity: created.activity_title, name: `${values.firstname} ${values.lastname}`,
        age, level: values.current_level || null,
      },
    });
  });

  if (activities && activities.length === 0) {
    return (
      <div className="form">
        <p className="muted">{translate('no_activities_available')}</p>
        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>{translate('close')}</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="form">
      <FormField as="select" label={translate('f_activity')} required error={formState.fieldErrors.activity_id} {...formState.bindField('activity_id')}>
        <option value="">{translate('choose')}</option>
        {(activities || []).map((activity) => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
      </FormField>
      <div className="form__row">
        <FormField label={translate('f_lastname')} required error={formState.fieldErrors.lastname} {...formState.bindField('lastname')} />
        <FormField label={translate('f_firstname')} required error={formState.fieldErrors.firstname} {...formState.bindField('firstname')} />
      </div>
      <FormField label={translate('f_age')} type="number" min="1" required error={formState.fieldErrors.age} {...formState.bindField('age')} />
      <div className="form__row">
        <FormField label={translate('f_email')} type="email" required error={formState.fieldErrors.email} {...formState.bindField('email')} />
        <FormField label={translate('f_phone')} type="tel" required error={formState.fieldErrors.phone} {...formState.bindField('phone')} />
      </div>
      <FormField label={translate('f_level')} error={formState.fieldErrors.current_level} {...formState.bindField('current_level')} />
      <FormActions error={formState.formError} submitting={formState.submitting} onCancel={onCancel} />
    </form>
  );
}
