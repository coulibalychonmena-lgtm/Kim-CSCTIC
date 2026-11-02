import { useEffect, useState } from 'react';

/** Charge une liste publique une fois ; en cas d'échec, la section reste simplement masquée (liste vide). */
export function useLoadedData(loadData, dependencies = []) {
  const [state, setState] = useState({ data: [], loading: true });
  useEffect(() => {
    let isMounted = true;
    loadData()
      .then((data) => isMounted && setState({ data, loading: false }))
      .catch(() => isMounted && setState({ data: [], loading: false }));
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
  return state;
}
