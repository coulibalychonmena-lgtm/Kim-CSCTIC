import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import BackgroundSection from '../components/BackgroundSection.jsx';
import DirectorMessage from '../components/DirectorMessage.jsx';
import OrangeTitle from '../components/OrangeTitle.jsx';
import Seo from '../components/Seo.jsx';
import SiteFooter from '../components/SiteFooter.jsx';
import { EventsList, NewsList } from '../components/EntryLists.jsx';
import { VideoList } from '../components/VideoPlayer.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteBackgrounds } from '../hooks/useSiteBackgrounds.js';
import { useLoadedData } from '../hooks/useLoadedData.js';
import { publicService } from '../services/publicService.js';
import { responsiveImageProps } from '../utils/image-optimization.js';

const REQUEST_CARDS = [
  { form: 'room', titleKey: 'card_room_title', textKey: 'card_room_text' },
  { form: 'register', titleKey: 'card_register_title', textKey: 'card_register_text' },
  { form: 'partner', titleKey: 'card_partner_title', textKey: 'card_partner_text' },
];
const AVAILABLE_ROOM_STATUS = 'Disponible';
const WEEK = [1, 2, 3, 4, 5, 6, 7];

/** Une ligne de fiche : même présentation pour tous les espaces et formations, « — » quand l'information n'est pas encore saisie. */
function FicheRow({ label, value }) {
  return <div className="fiche__row"><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}

/** Appel à créer un compte ou à se connecter (ou à ouvrir Mon espace si déjà connecté). */
function AccountCta({ headingId }) {
  const { translate } = useLanguage();
  const { isAuthenticated, isAdministrator } = useAuth();
  return (
    <section className="cta-band" aria-labelledby={headingId}>
      <div className="cta-band__inner">
        <h2 id={headingId}>{translate('cta_account_title')}</h2>
        <p>{translate('cta_account_text')}</p>
        <div className="cta-row cta-row--center">
          {isAuthenticated
            ? <Link to={isAdministrator ? '/admin/dashboard' : '/mon-espace'} className="btn btn--light btn--large">{translate('cta_my_space')}</Link>
            : (
              <>
                <Link to="/connexion?mode=register" className="btn btn--light btn--large">{translate('cta_create_account')}</Link>
                <Link to="/connexion" className="btn btn--outline-light btn--large">{translate('cta_login')}</Link>
              </>
            )}
        </div>
      </div>
    </section>
  );
}

/** Page d'accueil : tout le contenu (espaces, formations, événements, actualités, contacts) vient de l'administration. */
export default function LandingPage() {
  const { translate, lang } = useLanguage();
  const backgroundFor = useSiteBackgrounds();
  const { data: rooms } = useLoadedData(() => publicService.listRooms(lang), [lang]);
  const { data: activities } = useLoadedData(() => publicService.listActivities(lang), [lang]);
  const { data: events } = useLoadedData(() => publicService.listEvents(lang), [lang]);
  const { data: videos } = useLoadedData(() => publicService.listVideos(lang), [lang]);
  const { data: news } = useLoadedData(() => publicService.listNews(lang), [lang]);
  const { data: openingHours } = useLoadedData(publicService.listOpeningHours);
  const { data: centerInformation } = useLoadedData(() => publicService.listCenterInformation(lang), [lang]);
  const contacts = centerInformation.filter((entry) => /contact/i.test(entry.category));
  const hoursByDay = new Map(openingHours.map((day) => [Number(day.day_of_week), day]));

  const structuredData = useMemo(() => ({ information: centerInformation, openingHours, events }), [centerInformation, openingHours, events]);

  return (
    <>
      <Seo page="home" path="/" structuredData={structuredData} />
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

        {rooms.length > 0 && (
          <section className="page-section" aria-labelledby="rooms-title">
            <OrangeTitle id="rooms-title">{translate('rooms_title')}</OrangeTitle>
            <p className="page-section__lead">{translate('rooms_text')}</p>
            <ul className="space-grid">
              {rooms.map((room) => (
                <li key={room.id} className="space-card">
                  {room.image_url && <img {...responsiveImageProps(room.image_url)} alt={room.name} loading="lazy" decoding="async" />}
                  <div className="space-card__body">
                    <OrangeTitle as="h3">{room.name}</OrangeTitle>
                    <p className="muted">{room.space_type}</p>
                    {room.description && <p className="space-card__text">{room.description}</p>}
                    <dl className="fiche">
                      <FicheRow label={translate('capacity')} value={room.max_capacity ? `${room.max_capacity} ${translate('persons')}` : null} />
                      <FicheRow label={translate('lbl_surface')} value={room.surface_m2 ? `${room.surface_m2} m²` : null} />
                      <FicheRow label={translate('lbl_equipment')} value={room.equipment?.length ? room.equipment.join(', ') : null} />
                      <FicheRow label={translate('lbl_price')} value={room.pricing} />
                    </dl>
                    {room.status === AVAILABLE_ROOM_STATUS && (
                      <Link to={`/chat?form=room&room=${encodeURIComponent(room.id)}`} className="btn btn--primary btn--small card-cta">{translate('room_cta')}</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

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

        <AccountCta headingId="account-cta-middle" />

        {activities.length > 0 && (
          <section className="page-section" aria-labelledby="activities-title">
            <OrangeTitle id="activities-title">{translate('activities_title')}</OrangeTitle>
            <ul className="entry-grid">
              {activities.map((activity) => (
                <li key={activity.id} className="entry-card">
                  {activity.image_url && <img {...responsiveImageProps(activity.image_url)} alt={activity.title} loading="lazy" decoding="async" />}
                  <div className="entry-card__body">
                    <p className="entry-card__date">{activity.category}</p>
                    <h3>{activity.title}</h3>
                    {activity.description && <p className="space-card__text">{activity.description}</p>}
                    <dl className="fiche">
                      <FicheRow label={translate('lbl_audience')} value={activity.age_range_label} />
                      <FicheRow label={translate('lbl_schedule')} value={activity.schedule} />
                      <FicheRow label={translate('lbl_duration')} value={activity.duration} />
                      <FicheRow label={translate('lbl_price')} value={activity.price} />
                    </dl>
                    <Link to={`/chat?form=register&activity=${encodeURIComponent(activity.id)}`} className="btn btn--primary btn--small card-cta">{translate('activity_cta')}</Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {videos.length > 0 && (
          <section className="page-section" aria-labelledby="videos-title">
            <OrangeTitle id="videos-title">{translate('videos_title')}</OrangeTitle>
            <VideoList videos={videos} />
          </section>
        )}

        {events.length > 0 && (
          <section className="page-section" aria-labelledby="events-section-title">
            <OrangeTitle id="events-section-title">{translate('events_section_title')}</OrangeTitle>
            <EventsList events={events} />
          </section>
        )}

        {news.length > 0 && (
          <section className="page-section" aria-labelledby="news-section-title">
            <OrangeTitle id="news-section-title">{translate('news_section_title')}</OrangeTitle>
            <NewsList news={news} />
          </section>
        )}

        <BackgroundSection imageUrl={backgroundFor('evenements')} aria-labelledby="assist-title">
          <h2 id="assist-title" className="bg-section__title">{translate('assist_title')}</h2>
          <p className="bg-section__lead">{translate('events_text')}</p>
          <div className="assist-grid">
            {contacts.map((contact) => (
              <div key={contact.title} className="assist-box"><h3>{contact.title}</h3><p>{contact.content}</p></div>
            ))}
            {openingHours.length > 0 && (
              <div className="assist-box">
                <h3>{translate('assist_hours')}</h3>
                <ul className="hours">
                  {WEEK.map((dayNumber) => {
                    const day = hoursByDay.get(dayNumber);
                    return <li key={dayNumber}><span>{translate(`day_${dayNumber}`)}</span> {day ? `${String(day.open_time).slice(0, 5)}–${String(day.close_time).slice(0, 5)}` : translate('hours_closed')}</li>;
                  })}
                </ul>
              </div>
            )}
          </div>
          <div className="cta-row">
            <Link to="/chat" className="btn btn--primary btn--large">{translate('events_cta')}</Link>
            <Link to="/chat?agent=1" className="btn btn--light btn--large">{translate('assist_agent')}</Link>
          </div>
        </BackgroundSection>
      </main>
      <DirectorMessage />
      <SiteFooter />
    </>
  );
}
