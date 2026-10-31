import { useEffect, useState } from 'react';
import { publicService } from '../services/publicService.js';

const DIRECTION_CATEGORY = 'direction';

/** Mot du Directeur : lu en direct depuis les informations du Centre (saisies par l'administration). */
export default function DirectorMessage() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    publicService.listCenterInformation()
      .then((entries) => isMounted && setMessage(entries.find((entry) => entry.category === DIRECTION_CATEGORY) || null))
      .catch(() => isMounted && setMessage(null));
    return () => { isMounted = false; };
  }, []);

  if (!message) return null;
  const paragraphs = message.content.split(/\n+/).filter(Boolean);

  return (
    <section className="director" aria-labelledby="director-title">
      <div className="director__inner">
        <h2 id="director-title">{message.title}</h2>
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}
