import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/httpClient.js';

const BackendStatusContext = createContext(null);
const HEALTH_TIMEOUT_MILLISECONDS = 10000;
const wait = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

async function isBackendAwake() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MILLISECONDS);
  try {
    const healthResponse = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal, cache: 'no-store' });
    return healthResponse.ok;
  } catch { return false; } finally { clearTimeout(timeout); }
}

/**
 * Réveille l'API (hébergement gratuit qui s'endort) dès l'ouverture du site et
 * indique quand Kim est réellement prêt à répondre : le chat ne s'affiche qu'à ce moment-là.
 */
export function BackendStatusProvider({ children }) {
  const [status, setStatus] = useState('waking'); // 'waking' | 'ready'
  const [attempts, setAttempts] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const activeLoop = useRef(null);

  const wakeUp = useCallback(() => {
    if (activeLoop.current) return;
    const loop = { cancelled: false };
    activeLoop.current = loop;
    setStatus('waking'); setAttempts(0); setStartedAt(Date.now());
    (async () => {
      let attemptNumber = 0;
      while (!loop.cancelled) {
        attemptNumber += 1;
        setAttempts(attemptNumber);
        if (await isBackendAwake()) { if (!loop.cancelled) setStatus('ready'); break; }
        await wait(Math.min(1500 + attemptNumber * 500, 5000));
      }
      if (activeLoop.current === loop) activeLoop.current = null;
    })();
  }, []);

  useEffect(() => {
    wakeUp();
    const onConnectionBack = () => wakeUp();
    window.addEventListener('online', onConnectionBack);
    return () => {
      window.removeEventListener('online', onConnectionBack);
      if (activeLoop.current) activeLoop.current.cancelled = true;
      activeLoop.current = null;
    };
  }, [wakeUp]);

  const value = useMemo(
    () => ({ status, isReady: status === 'ready', attempts, startedAt, reportUnreachable: wakeUp }),
    [status, attempts, startedAt, wakeUp],
  );
  return <BackendStatusContext.Provider value={value}>{children}</BackendStatusContext.Provider>;
}

export const useBackendStatus = () => useContext(BackendStatusContext);
