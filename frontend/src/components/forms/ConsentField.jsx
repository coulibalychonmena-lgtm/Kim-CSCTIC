import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Case de consentement obligatoire + lien vers la politique de confidentialité (loi n° 2013-450 sur la protection
 * des données à caractère personnel). `name`/`checked`/`onChange` viennent de formState.bindCheckbox.
 */
export default function ConsentField({ error, children, ...checkboxProps }) {
  const { translate } = useLanguage();
  const id = useId();
  return (
    <div className={`field field--check${error ? ' field--error' : ''}`}>
      <label htmlFor={id} className="check">
        <input id={id} type="checkbox" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} {...checkboxProps} />
        <span>
          {children || (
            <>
              {translate('consent_text')}{' '}
              <a href="/confidentialite" target="_blank" rel="noopener noreferrer">{translate('privacy_link')}</a>. *
            </>
          )}
        </span>
      </label>
      {error && <p className="field__error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}
