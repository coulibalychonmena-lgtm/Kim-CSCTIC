import { useRef } from 'react';
import { useChat } from '../context/ChatContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import OrangeTitle from './OrangeTitle.jsx';

/** Images à faire défiler, chacune avec sa description et ses boutons d'action (réserver, s'inscrire, contacter…). */
export default function PresentationCarousel({ slides }) {
  const { translate } = useLanguage();
  const { runSlideAction } = useChat();
  const trackRef = useRef(null);
  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  };
  const labelOf = (action) => action.label || translate(`slide_${action.type}`);

  return (
    <div className="carousel" role="region" aria-roledescription="carousel" aria-label={translate('presentation_intro')}>
      <div className="carousel__track" ref={trackRef} tabIndex={0}>
        {slides.map((slide) => (
          <article key={slide.id} className="carousel__slide">
            {slide.image_url ? <img src={slide.image_url} alt={slide.title} loading="lazy" /> : <div className="carousel__noimage" aria-hidden="true" />}
            <div className="carousel__body">
              <OrangeTitle as="h3">{slide.title}</OrangeTitle>
              <p>{slide.description}</p>
              <div className="carousel__actions">
                {slide.action?.type === 'link'
                  ? <a className="btn btn--primary btn--small" href={slide.action.url} target="_blank" rel="noopener noreferrer">{labelOf(slide.action)}</a>
                  : slide.action && <button type="button" className="btn btn--primary btn--small" onClick={() => runSlideAction(slide.action)}>{labelOf(slide.action)}</button>}
                {slide.action?.type !== 'contact' && (
                  <button type="button" className="btn btn--soft btn--small" onClick={() => runSlideAction({ type: 'contact' })}>{translate('slide_contact')}</button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="carousel__nav">
        <button type="button" className="btn btn--soft btn--small" onClick={() => scrollByPage(-1)} aria-label={translate('slide_prev')}>←</button>
        <button type="button" className="btn btn--soft btn--small" onClick={() => scrollByPage(1)} aria-label={translate('slide_next')}>→</button>
      </div>
    </div>
  );
}
