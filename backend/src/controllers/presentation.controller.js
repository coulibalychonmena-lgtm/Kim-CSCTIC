import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { SUPPORTED_LANGUAGES } from '../utils/domain-values.js';
import * as presentationService from '../services/presentation.service.js';

export const listPresentation = wrapAsyncRoute(async (request, response) => {
  const language = SUPPORTED_LANGUAGES.includes(request.query.lang) ? request.query.lang : 'fr';
  response.json({ data: await presentationService.listPresentation(language) });
});

export const listSlidesForAdmin = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await presentationService.listSlidesForAdmin() });
});
export const createSlide = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await presentationService.createCustomSlide(request.body) });
});
export const updateSlide = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await presentationService.updateSlide(request.params.id, request.body) });
});
export const deleteSlide = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await presentationService.deleteSlide(request.params.id) });
});
export const regenerateSlide = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await presentationService.regenerateAiText(request.params.id) });
});
