import { useLanguage } from '../context/LanguageContext.jsx';
import { LANGS } from '../i18n/translations.js';

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="lang" role="group" aria-label="Language / Langue / 언어">
      {LANGS.map((language) => (
        <button
          key={language.code}
          type="button"
          className={`lang__btn${lang === language.code ? ' is-active' : ''}`}
          onClick={() => setLang(language.code)}
          aria-pressed={lang === language.code}
          lang={language.code}
        >
          <span aria-hidden="true">{language.flag}</span> {language.label}
        </button>
      ))}
    </div>
  );
}
