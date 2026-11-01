import { env } from '../config/environment.js';
import { AppError } from '../middlewares/error.middleware.js';
import { describeImage, generateText } from './gemini.service.js';

const MAXIMUM_IMAGE_BYTES = 5 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MILLISECONDS = 10000;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUBJECT_BY_KIND = {
  room: 'une salle ou un espace du Centre', activity: 'une formation ou une activité du Centre', event: 'un événement du Centre',
  news: 'une actualité du Centre', video: 'une vidéo de présentation du Centre', slide: 'une diapositive de présentation des services',
};
const YOUTUBE_PATTERN = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

/** Seules les images du Cloudinary du Centre et les miniatures YouTube peuvent être téléchargées par le serveur. */
function allowedImageAddress(address) {
  if (!address) return null;
  let url;
  try { url = new URL(address); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.hostname === 'res.cloudinary.com' && url.pathname.startsWith(`/${env.cloudinary.cloudName}/`)) return url.href;
  if (url.hostname === 'img.youtube.com' && url.pathname.startsWith('/vi/')) return url.href;
  return null;
}

const youtubeThumbnailOf = (videoUrl) => {
  const match = String(videoUrl || '').match(YOUTUBE_PATTERN);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
};

async function downloadImage(address) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MILLISECONDS);
  try {
    const downloadResponse = await fetch(address, { signal: controller.signal, redirect: 'error' });
    const mimeType = (downloadResponse.headers.get('content-type') || '').split(';')[0].trim();
    if (!downloadResponse.ok || !SUPPORTED_IMAGE_TYPES.includes(mimeType)) throw new Error('Image illisible.');
    const imageBytes = Buffer.from(await downloadResponse.arrayBuffer());
    if (imageBytes.length > MAXIMUM_IMAGE_BYTES) throw new Error('Image trop lourde.');
    return { mimeType, base64Data: imageBytes.toString('base64') };
  } finally { clearTimeout(timeout); }
}

/** Propose une description (modifiable par l'administration) à partir de l'image, ou à défaut du titre. */
export async function proposeDescription({ image_url: imageUrl, video_url: videoUrl, title, kind }) {
  const subject = SUBJECT_BY_KIND[kind] || 'un élément du Centre';
  const namedSubject = title ? `${subject} intitulé(e) « ${title} »` : subject;
  const imageAddress = allowedImageAddress(imageUrl) || allowedImageAddress(youtubeThumbnailOf(videoUrl));
  const rules = "Écris en français, 2 à 3 phrases, 60 mots maximum, destinées aux visiteurs. N'invente aucune capacité, aucun tarif, horaire ni nom propre. Réponds par le texte seul, sans titre ni guillemets.";

  if (imageAddress) {
    try {
      const { mimeType, base64Data } = await downloadImage(imageAddress);
      const description = await describeImage(
        `Tu aides l'administration du Centre Sportif, Culturel et des TIC Ivoiro-Coréen. Décris ${namedSubject} uniquement à partir de ce qui est visible sur l'image (lieu, ambiance, disposition, équipements visibles). ${rules}`,
        mimeType, base64Data,
      );
      if (description) return description.slice(0, 1000);
    } catch (error) {
      console.error('[DESCRIPTION] analyse de l\'image impossible :', error.message);
    }
  }
  if (!title) throw new AppError(400, 'Ajoutez une image (ou un titre) pour obtenir une proposition.');
  try {
    const description = await generateText(`Tu aides l'administration du Centre Sportif, Culturel et des TIC Ivoiro-Coréen. Propose une description générale de ${namedSubject}, à partir du titre seul, sans rien affirmer qui ne soit pas évident. ${rules}`);
    if (description) return description.slice(0, 1000);
  } catch (error) {
    console.error('[DESCRIPTION] rédaction impossible :', error.message);
  }
  throw new AppError(502, 'Kim ne peut pas proposer de description pour le moment : saisissez-la à la main.');
}
