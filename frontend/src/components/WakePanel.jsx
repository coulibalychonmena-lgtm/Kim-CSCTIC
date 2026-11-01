import { useEffect, useState } from 'react';
import { useBackendStatus } from '../context/BackendStatusContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Affiché à la place de Kim tant que le serveur démarre : Kim n'apparaît que lorsqu'il est sûr de répondre. */
export default function WakePanel() {
  const { translate } = useLanguage();
  const { startedAt, attempts } = useBackendStatus();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  return (
    <div className="wake" role="status" aria-live="polite">
      <span className="wake__spinner" aria-hidden="true" />
      <h2>{translate(isOffline ? 'wake_offline_title' : 'wake_title')}</h2>
      <p>{translate(isOffline ? 'wake_offline' : 'wake_text')}</p>
      <p className="muted">{elapsedSeconds}s · {translate('wake_attempt')} {attempts}</p>
    </div>
  );
}
