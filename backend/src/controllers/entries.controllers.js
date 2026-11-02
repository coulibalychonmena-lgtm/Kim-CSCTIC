import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { eventsService, newsService, videosService, suggestionsService } from '../services/entries.service.js';
import { publicEvents, publicNews, publicVideos, publicSuggestions } from '../services/public-content.service.js';
import { requestedLanguage } from '../utils/request-language.js';

const createController = (service, loadPublic) => ({
  listPublished: wrapAsyncRoute(async (request, response) => { response.json({ data: await loadPublic(requestedLanguage(request)) }); }),
  listAll: wrapAsyncRoute(async (_request, response) => { response.json({ data: await service.listAll() }); }),
  create: wrapAsyncRoute(async (request, response) => { response.status(201).json({ data: await service.create(request.body) }); }),
  update: wrapAsyncRoute(async (request, response) => { response.json({ data: await service.update(request.params.id, request.body) }); }),
  remove: wrapAsyncRoute(async (request, response) => { response.json({ data: await service.remove(request.params.id) }); }),
});

export const events = createController(eventsService, publicEvents);
export const news = createController(newsService, publicNews);
export const videos = createController(videosService, publicVideos);
export const suggestions = createController(suggestionsService, publicSuggestions);
