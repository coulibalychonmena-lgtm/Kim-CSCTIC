import { useLanguage } from '../../context/LanguageContext.jsx';

export default function FormActions({ error, submitting, onCancel, disabled = false }) {
  const { translate } = useLanguage();
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>{translate('cancel')}</button>
        <button type="submit" className="btn btn--primary" disabled={submitting || disabled}>
          {submitting ? translate('sending') : translate('submit')}
        </button>
      </div>
    </>
  );
}
