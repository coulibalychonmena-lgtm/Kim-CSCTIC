import { Link, NavLink } from 'react-router-dom';
import LanguageSelector from './LanguageSelector.jsx';
import InstallButton from './InstallButton.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const { translate } = useLanguage();
  const { isAuthenticated, isAdministrator, logout } = useAuth();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <img
            className="brand__logo"
            src="/logo.png"
            alt=""
            width="75"
            height="44"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <span className="brand__text">
            <strong>{translate('brand')}</strong>
            <small>{translate('brand_full')}</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Navigation">
          <NavLink to="/chat" className="site-nav__link">{translate('nav_chat')}</NavLink>
          {isAuthenticated
            ? <NavLink to={isAdministrator ? '/admin/dashboard' : '/mon-espace'} className="site-nav__link">{translate(isAdministrator ? 'nav_admin' : 'nav_account')}</NavLink>
            : <NavLink to="/connexion" className="site-nav__link">{translate('nav_login')}</NavLink>}
          {isAuthenticated && <button type="button" className="site-nav__link site-nav__button" onClick={logout}>{translate('nav_logout')}</button>}
          <InstallButton />
          <LanguageSelector />
        </nav>
      </div>
    </header>
  );
}
