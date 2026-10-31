import { Link } from 'react-router-dom';
import LanguageSelector from './LanguageSelector.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Header() {
  const { translate } = useLanguage();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <img
            className="brand__logo"
            src="/logo.png"
            alt=""
            width="73"
            height="44"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
          <span className="brand__text">
            <strong>{translate('brand')}</strong>
            <small>{translate('brand_full')}</small>
          </span>
        </Link>
        <LanguageSelector />
      </div>
    </header>
  );
}
