import Header from '../components/Header.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { publicService } from '../services/publicService.js';
import { useLoadedData } from '../hooks/useLoadedData.js';
import { LEGAL_CONTENT } from '../i18n/legal-content.js';
import Seo from '../components/Seo.jsx';

const LAST_UPDATE = '2026-11-07';

/** Politique de confidentialité et mentions légales (kind = 'privacy' | 'notice'). Les coordonnées viennent de l'administration. */
export default function LegalPage({ kind }) {
  const { lang } = useLanguage();
  const content = LEGAL_CONTENT[kind][lang] ?? LEGAL_CONTENT[kind].en;
  const { data: information } = useLoadedData(() => publicService.listCenterInformation(lang), [lang]);
  const contacts = (information || []).filter((entry) => /contact/i.test(entry.category));
  return (
    <>
      <Seo page={kind} path={kind === 'privacy' ? '/confidentialite' : '/mentions-legales'} />
      <Header />
      <main className="legal">
        <h1>{content.title}</h1>
        <p className="muted">{content.updated} : {LAST_UPDATE}</p>
        <p>{content.intro}</p>
        {content.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            {Array.isArray(body) ? <ul>{body.map((line) => <li key={line}>{line}</li>)}</ul> : <p>{body}</p>}
          </section>
        ))}
        <section>
          <h2>{content.contact}</h2>
          {contacts.length
            ? <ul>{contacts.map((entry) => <li key={entry.id}><strong>{entry.title}</strong> : {entry.content}</li>)}</ul>
            : <p className="muted">{content.noContact}</p>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
