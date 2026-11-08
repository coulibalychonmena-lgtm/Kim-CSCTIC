import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/** État d'un formulaire + soumission avec gestion des erreurs champ par champ renvoyées par l'API. */
/**
 * `required` : champs texte obligatoires ; `mustBeTrue` : cases à cocher obligatoires (consentement) ;
 * `validate(values)` : règles métier côté navigateur (renvoie { champ: message }) — le serveur répète les mêmes contrôles.
 */
export function useFormState(initialValues, { required = [], mustBeTrue = [], validate } = {}) {
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

  const bindCheckbox = (fieldName) => ({
    name: fieldName,
    checked: values[fieldName] === true,
    onChange: (event) => setValues((current) => ({ ...current, [fieldName]: event.target.checked })),
  });

  const setFieldValue = (fieldName, value) => setValues((current) => ({ ...current, [fieldName]: value }));

  const handleSubmit = (submitHandler) => async (event) => {
    event.preventDefault();
    setFormError('');
    // Tant qu'un champ obligatoire est vide, rien n'est envoyé.
    const missingFields = required.filter((fieldName) => String(values[fieldName] ?? '').trim() === '');
    const uncheckedFields = mustBeTrue.filter((fieldName) => values[fieldName] !== true);
    if (missingFields.length || uncheckedFields.length) {
      setFieldErrors({
        ...Object.fromEntries(missingFields.map((fieldName) => [fieldName, translate('required_field')])),
        ...Object.fromEntries(uncheckedFields.map((fieldName) => [fieldName, translate('consent_required')])),
      });
      setFormError(translate('required_missing'));
      return;
    }
    const ruleErrors = validate ? validate(values) : {};
    if (Object.keys(ruleErrors).length) {
      setFieldErrors(ruleErrors);
      setFormError(translate('check_fields'));
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

  return { values, bindField, bindCheckbox, setFieldValue, fieldErrors, formError, submitting, handleSubmit };
}
