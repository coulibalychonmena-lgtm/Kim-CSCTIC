import { cloudinary } from '../config/cloudinary.js';

const UPLOAD_FOLDER = 'cscticao';

/** Envoie une image (Buffer) sur Cloudinary et renvoie son adresse https. */
export function uploadImage(imageBuffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: UPLOAD_FOLDER, resource_type: 'image' },
      (uploadError, uploadResult) => (uploadError ? reject(uploadError) : resolve(uploadResult.secure_url)),
    );
    uploadStream.end(imageBuffer);
  });
}
