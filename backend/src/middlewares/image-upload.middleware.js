import multer from 'multer';
import { AppError } from './error.middleware.js';

const MAXIMUM_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const receiveSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAXIMUM_IMAGE_SIZE_BYTES, files: 1 },
  fileFilter: (_request, file, callback) => (ACCEPTED_IMAGE_TYPES.includes(file.mimetype)
    ? callback(null, true)
    : callback(new AppError(400, 'Format accepté : JPEG, PNG ou WebP.'))),
}).single('image');

/** Reçoit le champ « image » (multipart) et traduit les erreurs de taille en message clair. */
export function receiveImageUpload(request, response, next) {
  receiveSingleImage(request, response, (uploadError) => {
    if (uploadError?.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'Image trop lourde (5 Mo maximum).'));
    if (uploadError) return next(uploadError);
    if (!request.file) return next(new AppError(400, 'Aucune image reçue.'));
    return next();
  });
}
