import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as openingHoursService from '../services/opening-hours.service.js';

export const listOpeningHours = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await openingHoursService.listOpeningHours() });
});

export const replaceOpeningHours = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await openingHoursService.replaceOpeningHours(request.body?.days) });
});
