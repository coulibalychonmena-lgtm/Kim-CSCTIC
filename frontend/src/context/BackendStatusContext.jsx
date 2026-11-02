import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL, API_CONFIGURATION_PROBLEM } from '../services/httpClient.js';

const BackendStatusContext = createContext(null);
const HEALTH_TIMEOUT_MILLISECONDS = 10000;
const PATIENCE_MILLISECONDS = 75000; // un réveil d'hébergement gratuit dure au plus ~1 min : au-delà, on explique ce qui bloque
const wait = (milliseconds) => new Promise((resolve) => { setTimeout(resolve, milliseconds); });

async function fetchWithTimeout(address, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MILLISECONDS);
  try { return await fetch(address, { ...options, signal: controller.signal, cache: 'no-store' }); } finally { clearTimeout(timeout); }
}

/**
 * Une sonde = un état : 'ok' (API réveillée), 'waking' (réponse d'attente du serveur), 'config' (mauvaise adresse d'API),
 * 'blocked' (le serveur répond mais refuse ce site : CORS) ou 'network' (aucune réponse).
 */
export async function probeBackend() {
  if (API_CONFIGURATION_PROBLEM) return 'config';
  const healthAddress = `${API_BASE_URL}/health`;
  try {
    const healthResponse = await fetchWithTimeout(healthAddress);
    if (healthResponse.ok) {
      const healthBody = await healthResponse.json().catch(() => null);
      return healthBody?.status === 'ok' ? 'ok' : 'config'; // une page HTML (ex. le site lui-même) n'est pas l'API
    }
    return healthResponse.status === 404 ? 'config' : 'waking'; // 502/503… : hébergement en cours de démarrage
  } catch {
    try { await fetchWithTimeout(healthAddress, { mode: 'no-cors' }); return 'blocked'; } catch { return 'network'; }
  }
}

/**
 * Réveille l'API (hébergement gratuit qui s'endort) dès l'ouverture du site. Le chat s'active dès qu'elle répond ;
 * si elle ne répond toujours pas après quelques instants, la cause probable est affichée au lieu d'un chargement sans fin.
 */
export function BackendStatusProvider({ children }) {
  const [status, setStatus] = useState(API_CONFIGURATION_PROBLEM ? 'unreachable' : 'waking'); // 'waking' | 'ready' | 'unreachable'
  const [problem, setProblem] = useState(API_CONFIGURATION_PROBLEM); // null | 'config' | 'cors' | 'network'
  const activeLoop = useRef(null);

  const wakeUp = useCallback(() => {
    if (activeLoop.current) return;
    const loop = { cancelled: false };
    activeLoop.current = loop;
    const startedAt = Date.now();
    setStatus(API_CONFIGURATION_PROBLEM ? 'unreachable' : 'waking'); setProblem(API_CONFIGURATION_PROBLEM);
    (async () => {
      let attemptNumber = 0;
      while (!loop.cancelled) {
        attemptNumber += 1;
        const probeResult = await probeBackend();
        if (loop.cancelled) break;
        if (probeResult === 'ok') { setStatus('ready'); setProblem(null); break; }
        if (probeResult === 'config') { setStatus('unreachable'); setProblem('config'); break; }
        if (Date.now() - startedAt > PATIENCE_MILLISECONDS) {
          setStatus('unreachable'); setProblem(probeResult === 'blocked' ? 'cors' : 'network');
        }
        await wait(Math.min(1500 + attemptNumber * 500, 5000)); // on continue d'essayer : Kim s'active tout seul dès que l'API répond
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

  const retry = useCallback(() => {
    if (activeLoop.current) activeLoop.current.cancelled = true;
    activeLoop.current = null;
    wakeUp();
  }, [wakeUp]);

  const value = useMemo(
    () => ({ status, problem, isReady: status === 'ready', reportUnreachable: wakeUp, retry }),
    [status, problem, wakeUp, retry],
  );
  return <BackendStatusContext.Provider value={value}>{children}</BackendStatusContext.Provider>;
}

export const useBackendStatus = () => useContext(BackendStatusContext);
