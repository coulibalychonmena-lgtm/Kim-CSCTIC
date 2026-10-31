import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as imageUploadService from '../services/image-upload.service.js';

export const uploadImage = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: { url: await imageUploadService.uploadImage(request.file.buffer) } });
});
