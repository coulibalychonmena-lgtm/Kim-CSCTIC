import { useEffect, useState } from 'react';
import FormField from '../FormField.jsx';
import FormActions from './FormActions.jsx';
import { useFormState } from './useFormState.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { publicService } from '../../services/publicService.js';
import { useAccountPrefill } from './useAccountPrefill.js';
import ConsentField from './ConsentField.jsx';

const ADULT_AGE = 18;

const REQUIRED_FIELDS = ['activity_id', 'lastname', 'firstname', 'age', 'email', 'phone'];

export default function RegistrationForm({ onDone, onCancel, prefill = {} }) {
  const { translate, lang } = useLanguage();
  const { token, contact } = useAccountPrefill();
  const [activities, setActivities] = useState(null);
  // Un candidat de moins de 18 ans exige le nom et l'accord d'un parent ou tuteur (le serveur le vérifie aussi).
  const validate = (values) => {
    const errors = {};
    const age = Number(values.age);
    if (!Number.isInteger(age) || age < 1 || age > 120) errors.age = translate('err_age');
    else if (age < ADULT_AGE) {
      if (!String(values.guardian_name || '').trim()) errors.guardian_name = translate('required_field');
      if (values.guardian_consent !== true) errors.guardian_consent = translate('consent_required');
    }
    return errors;
  };
  const formState = useFormState({
    activity_id: '', lastname: contact.lastname, firstname: contact.firstname, age: '', email: contact.email, phone: contact.phone, current_level: '',
    guardian_name: '', guardian_consent: false, consent: false,
    ...prefill,
  }, { required: REQUIRED_FIELDS, mustBeTrue: ['consent'], validate });
  const isMinor = formState.values.age !== '' && Number(formState.values.age) >= 1 && Number(formState.values.age) < ADULT_AGE;

  useEffect(() => {
    publicService.listActivities(lang).then(setActivities).catch(() => setActivities([]));
  }, [lang]);

  const onSubmit = formState.handleSubmit(async (values) => {
    const age = Number(values.age);
    const created = await publicService.submitActivityRegistration({ ...values, age, ...(age >= ADULT_AGE ? { guardian_name: undefined, guardian_consent: undefined } : {}) }, token);
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
      {isMinor && (
        <fieldset className="guardian">
          <p className="muted">{translate('guardian_hint')}</p>
          <FormField label={translate('guardian_name')} required error={formState.fieldErrors.guardian_name} {...formState.bindField('guardian_name')} />
          <ConsentField error={formState.fieldErrors.guardian_consent} {...formState.bindCheckbox('guardian_consent')}>{translate('guardian_consent')} *</ConsentField>
        </fieldset>
      )}
      <ConsentField error={formState.fieldErrors.consent} {...formState.bindCheckbox('consent')} />
      <FormActions error={formState.formError} submitting={formState.submitting} onCancel={onCancel} />
    </form>
  );
}
