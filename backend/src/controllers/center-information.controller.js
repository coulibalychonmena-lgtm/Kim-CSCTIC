import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as centerInformationService from '../services/center-information.service.js';
import { requestedLanguage } from '../utils/request-language.js';
import { publicCenterInformation } from '../services/public-content.service.js';

export const listCenterInformation = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await publicCenterInformation(requestedLanguage(request)) });
});

export const createCenterInformation = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await centerInformationService.createCenterInformation(request.body) });
});

export const updateCenterInformation = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await centerInformationService.updateCenterInformation(request.params.id, request.body) });
});

export const deleteCenterInformation = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await centerInformationService.deleteCenterInformation(request.params.id) });
});
