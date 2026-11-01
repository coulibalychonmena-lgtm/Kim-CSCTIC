import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/** État d'un formulaire + soumission avec gestion des erreurs champ par champ renvoyées par l'API. */
export function useFormState(initialValues, { required = [] } = {}) {
  const { translate } = useLanguage();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const bindField = (fieldName) => ({
    name: fieldName,
    value: values[fieldName] ?? '',
    onChange: (event) => setValues((current) => ({ ...current, [fieldName]: event.target.value })),
  });

  const setFieldValue = (fieldName, value) => setValues((current) => ({ ...current, [fieldName]: value }));

  const handleSubmit = (submitHandler) => async (event) => {
    event.preventDefault();
    setFormError('');
    // Tant qu'un champ obligatoire est vide, rien n'est envoyé.
    const missingFields = required.filter((fieldName) => String(values[fieldName] ?? '').trim() === '');
    if (missingFields.length) {
      setFieldErrors(Object.fromEntries(missingFields.map((fieldName) => [fieldName, translate('required_field')])));
      setFormError(translate('required_missing'));
      return;
    }
    setSubmitting(true); setFieldErrors({});
    try {
      await submitHandler(values);
    } catch (error) {
      setFormError(error.message);
      setFieldErrors(error.details && typeof error.details === 'object' ? error.details : {});
    } finally {
      setSubmitting(false);
    }
  };

  return { values, bindField, setFieldValue, fieldErrors, formError, submitting, handleSubmit };
}
