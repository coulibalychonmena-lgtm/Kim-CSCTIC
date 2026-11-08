import { useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';
let scriptPromise = null;

/** Charge le script Google Identity Services une seule fois. */
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_SCRIPT; script.async = true; script.defer = true;
    script.onload = resolve;
    script.onerror = () => { scriptPromise = null; reject(new Error('Google indisponible')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Bouton « Continuer avec Google ». Le serveur fournit l'identifiant client, un nonce et un « state » signé ;
 * le jeton d'identité reçu est renvoyé au serveur, qui le vérifie (signature, audience, émetteur, expiration, nonce).
 * Rien n'est affiché si GOOGLE_CLIENT_ID n'est pas défini côté serveur : l'inscription par e-mail reste disponible.
 */
export default function GoogleSignInButton({ onSuccess }) {
  const { lang, translate } = useLanguage();
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | disabled | error
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const challenge = await authService.googleChallenge();
        if (!challenge.enabled) { if (!cancelled) setStatus('disabled'); return; }
        await loadGoogleScript();
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: challenge.client_id,
          nonce: challenge.nonce,
          auto_select: false,
          callback: async ({ credential }) => {
            try {
              const user = await loginWithGoogle(credential, challenge.state);
              onSuccess?.(user);
            } catch (error) {
              setErrorMessage(error.message);
              setAttempt((count) => count + 1); // nouveau nonce pour un nouvel essai
            }
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: lang, width: 280,
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [lang, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'disabled') return null;
  return (
    <div className="google-signin">
      <div ref={containerRef} className="google-signin__button" aria-label={translate('google_continue')} />
      {status === 'error' && <p className="muted" role="status">{translate('google_unavailable')}</p>}
      {errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}
    </div>
  );
}
