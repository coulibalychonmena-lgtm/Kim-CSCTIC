import { useLanguage } from '../../context/LanguageContext.jsx';

export default function FormActions({ error, submitting, onCancel }) {
  const { translate } = useLanguage();
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>{translate('cancel')}</button>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? translate('sending') : translate('submit')}
        </button>
      </div>
    </>
  );
}
