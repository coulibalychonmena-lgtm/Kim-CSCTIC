import { useCallback, useEffect, useState } from 'react';

const REFRESH_INTERVAL_MILLISECONDS = 15000;

/** Charge des données admin et les rafraîchit automatiquement (les nouvelles demandes apparaissent seules). */
export function useAutoRefreshingData(loadData, dependencies = [], intervalMilliseconds = REFRESH_INTERVAL_MILLISECONDS) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableLoadData = useCallback(loadData, dependencies);

  const reload = useCallback(async () => {
    try {
      const data = await stableLoadData();
      setState({ data, loading: false, error: '' });
    } catch (error) {
      setState((previousState) => ({ ...previousState, loading: false, error: error.message }));
    }
  }, [stableLoadData]);

  useEffect(() => {
    reload();
    const refreshTimer = setInterval(reload, intervalMilliseconds);
    return () => clearInterval(refreshTimer);
  }, [reload, intervalMilliseconds]);

  return { ...state, reload };
}

export const formatDateTime = (value) =>
  (value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
