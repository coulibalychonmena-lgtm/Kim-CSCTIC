import { useCallback, useEffect, useState } from 'react';
import { publicService } from '../services/publicService.js';
import { defaultBackgroundUrl } from '../config/site-backgrounds.js';

/** Renvoie une fonction `slot → adresse d'image` : image choisie par l'administration, sinon image par défaut. */
export function useSiteBackgrounds() {
  const [overrides, setOverrides] = useState({});

  useEffect(() => {
    let isMounted = true;
    publicService.listSiteBackgrounds()
      .then((rows) => isMounted && setOverrides(Object.fromEntries(rows.map((row) => [row.slot, row.image_url]))))
      .catch(() => { /* les images par défaut restent affichées */ });
    return () => { isMounted = false; };
  }, []);

  return useCallback((slot) => overrides[slot] || defaultBackgroundUrl(slot), [overrides]);
}
