import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as knowledgeGapsService from '../services/knowledge-gaps.service.js';

export const listUnansweredQuestions = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await knowledgeGapsService.listUnansweredQuestions(request.query.status) });
});
export const updateUnansweredStatus = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await knowledgeGapsService.updateUnansweredStatus(request.params.id, request.body.status) });
});
export const getCatalogQuality = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await knowledgeGapsService.catalogQualityReport() });
});
