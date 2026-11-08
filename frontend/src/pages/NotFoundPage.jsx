import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Seo from '../components/Seo.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Adresse inconnue : vraie page « introuvable » en noindex (au lieu d'une redirection silencieuse vers l'accueil). */
export default function NotFoundPage() {
  const { translate } = useLanguage();
  return (
    <>
      <Seo page="notfound" path="/404" noindex />
      <Header />
      <main className="legal">
        <h1>{translate('not_found_title')}</h1>
        <p>{translate('not_found_text')}</p>
        <p><Link to="/" className="btn btn--primary">{translate('not_found_home')}</Link></p>
      </main>
    </>
  );
}
