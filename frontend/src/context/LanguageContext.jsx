import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // Adresse avec ?lang=en|ko|fr (liens hreflang, partages) : prioritaire sur le choix mémorisé.
  const [lang, setLang] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    return translations[requested] ? requested : (localStorage.getItem('kim_lang') || 'fr');
  });

  useEffect(() => {
    localStorage.setItem('kim_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    translate: (key) => translations[lang]?.[key] ?? translations.fr[key] ?? key,
  }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

/**
 * Affiche un sous-arbre (formulaire du chat, messages système) dans une autre langue que celle du sélecteur du site :
 * celle de la conversation. Si la langue n'a pas de traductions d'interface, on garde la langue du site.
 */
export function LanguageOverride({ lang, children }) {
  const parent = useLanguage();
  const effectiveLang = lang && translations[lang] ? lang : parent.lang;
  const value = useMemo(() => (effectiveLang === parent.lang ? parent : {
    ...parent,
    lang: effectiveLang,
    translate: (key) => translations[effectiveLang]?.[key] ?? translations.fr[key] ?? key,
  }), [effectiveLang, parent]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
