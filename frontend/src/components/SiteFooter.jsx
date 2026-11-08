import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { publicService } from '../services/publicService.js';
import { useLoadedData } from '../hooks/useLoadedData.js';

// Convention de l'administration (rubrique « Informations du Centre ») : la catégorie « contact » alimente ce pied de page et la FAQ
// de Kim ; « réseaux sociaux » (adresse du lien dans « URL de la source » ou dans le texte) alimente les liens sociaux.
const isContact = (entry) => /contact/i.test(entry.category);
const isSocial = (entry) => /r[ée]seau|social/i.test(entry.category);
const isAddress = (entry) => /adresse|address|주소|localisation|location/i.test(entry.title);
const asLink = (entry) => [entry.source_url, entry.content].find((value) => /^https?:\/\//i.test(String(value || '').trim()))?.trim();
const mapsLink = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Pied de page institutionnel : adresse et plan d'accès, téléphone, e-mail, réseaux sociaux, mentions légales. Tout vient de l'administration. */
export default function SiteFooter() {
  const { translate, lang } = useLanguage();
  const { data: information } = useLoadedData(() => publicService.listCenterInformation(lang), [lang]);
  const contacts = information.filter(isContact);
  const socials = information.filter(isSocial).map((entry) => ({ entry, href: asLink(entry) })).filter((item) => item.href);
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <strong>{translate('brand')}</strong>
          <p className="muted">{translate('brand_full')}</p>
        </div>
        {contacts.length > 0 && (
          <ul className="site-footer__contacts" aria-label={translate('footer_contact')}>
            {contacts.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.title}</strong> : {entry.content}
                {isAddress(entry) && <> · <a href={mapsLink(entry.content)} target="_blank" rel="noopener noreferrer">{translate('footer_map')}</a></>}
              </li>
            ))}
          </ul>
        )}
        {socials.length > 0 && (
          <ul className="site-footer__socials" aria-label={translate('footer_social')}>
            {socials.map(({ entry, href }) => <li key={entry.id}><a href={href} target="_blank" rel="noopener noreferrer">{entry.title}</a></li>)}
          </ul>
        )}
        <nav className="site-footer__legal" aria-label={translate('footer_legal')}>
          <Link to="/mentions-legales">{translate('legal_link')}</Link>
          <Link to="/confidentialite">{translate('privacy_link_title')}</Link>
        </nav>
      </div>
    </footer>
  );
}
