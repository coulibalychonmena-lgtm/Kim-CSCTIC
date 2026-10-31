import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as siteBackgroundsService from '../services/site-backgrounds.service.js';

export const listSiteBackgrounds = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await siteBackgroundsService.listSiteBackgrounds() });
});

export const setSiteBackground = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await siteBackgroundsService.setSiteBackground(request.params.slot, request.body.image_url ?? null) });
});
