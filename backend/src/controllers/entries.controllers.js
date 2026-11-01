import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { eventsService, newsService } from '../services/entries.service.js';

const createController = (service) => ({
  listPublished: wrapAsyncRoute(async (_request, response) => { response.json({ data: await service.listPublished() }); }),
  listAll: wrapAsyncRoute(async (_request, response) => { response.json({ data: await service.listAll() }); }),
  create: wrapAsyncRoute(async (request, response) => { response.status(201).json({ data: await service.create(request.body) }); }),
  update: wrapAsyncRoute(async (request, response) => { response.json({ data: await service.update(request.params.id, request.body) }); }),
  remove: wrapAsyncRoute(async (request, response) => { response.json({ data: await service.remove(request.params.id) }); }),
});

export const events = createController(eventsService);
export const news = createController(newsService);
