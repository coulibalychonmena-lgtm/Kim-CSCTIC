import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { proposeDescription } from '../services/media-description.service.js';

export const describeMedia = wrapAsyncRoute(async (request, response) => {
  response.json({ data: { description: await proposeDescription(request.body) } });
});
