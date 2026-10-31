import { query } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { SITE_BACKGROUND_SLOTS } from '../utils/domain-values.js';

export const listSiteBackgrounds = () =>
  query('SELECT SLOT, IMAGE_URL, UPDATED_AT FROM SITE_BACKGROUNDS ORDER BY SLOT');

/** Définit l'image d'un emplacement ; une adresse vide (null) rétablit l'image par défaut. */
export async function setSiteBackground(slot, imageUrl) {
  if (!SITE_BACKGROUND_SLOTS.includes(slot)) throw new AppError(404, 'Emplacement d\'image inconnu.');
  if (!imageUrl) {
    await query('DELETE FROM SITE_BACKGROUNDS WHERE SLOT = ?', [slot]);
    return { slot, image_url: null };
  }
  await query(
    `INSERT INTO SITE_BACKGROUNDS (SLOT, IMAGE_URL) VALUES (?, ?)
     ON CONFLICT (SLOT) DO UPDATE SET IMAGE_URL = EXCLUDED.IMAGE_URL, UPDATED_AT = NOW()`,
    [slot, imageUrl],
  );
  return { slot, image_url: imageUrl };
}
