import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import BackgroundSection from '../components/BackgroundSection.jsx';
import DirectorMessage from '../components/DirectorMessage.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useSiteBackgrounds } from '../hooks/useSiteBackgrounds.js';

const REQUEST_CARDS = [
  { form: 'room', titleKey: 'card_room_title', textKey: 'card_room_text' },
  { form: 'register', titleKey: 'card_register_title', textKey: 'card_register_text' },
  { form: 'partner', titleKey: 'card_partner_title', textKey: 'card_partner_text' },
];

export default function LandingPage() {
  const { translate } = useLanguage();
  const backgroundFor = useSiteBackgrounds();

  return (
    <>
      <a className="skip" href="#main">{translate('skip')}</a>
      <Header />
      <main id="main">
        <BackgroundSection imageUrl={backgroundFor('hero')} className="bg-section--hero" aria-labelledby="hero-title">
          <h1 id="hero-title">{translate('hero_title')}</h1>
          <p className="bg-section__lead">{translate('hero_text')}</p>
          <div className="cta-row">
            <Link to="/chat" className="btn btn--primary btn--large">{translate('cta_chat')}</Link>
            <Link to="/chat?form=room" className="btn btn--light btn--large">{translate('cta_room')}</Link>
          </div>
        </BackgroundSection>

        <BackgroundSection imageUrl={backgroundFor('services')} aria-labelledby="services-title">
          <h2 id="services-title" className="bg-section__title">{translate('services_title')}</h2>
          <p className="bg-section__lead">{translate('services_text')}</p>
          <div className="landing-cards">
            {REQUEST_CARDS.map((card) => (
              <article key={card.form} className="landing-card">
                <h3>{translate(card.titleKey)}</h3>
                <p>{translate(card.textKey)}</p>
                <Link to={`/chat?form=${card.form}`} className="btn btn--primary btn--block">{translate('card_cta')}</Link>
              </article>
            ))}
          </div>
        </BackgroundSection>

        <BackgroundSection imageUrl={backgroundFor('evenements')} className="bg-section--center" aria-labelledby="events-title">
          <h2 id="events-title" className="bg-section__title">{translate('events_title')}</h2>
          <p className="bg-section__lead">{translate('events_text')}</p>
          <div className="cta-row cta-row--center">
            <Link to="/chat" className="btn btn--primary btn--large">{translate('events_cta')}</Link>
          </div>
        </BackgroundSection>
      </main>
      <DirectorMessage />
    </>
  );
}
