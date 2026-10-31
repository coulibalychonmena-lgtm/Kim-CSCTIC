import { useState } from 'react';

/** État d'un formulaire + soumission avec gestion des erreurs champ par champ renvoyées par l'API. */
export function useFormState(initialValues) {
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
    setSubmitting(true); setFormError(''); setFieldErrors({});
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
