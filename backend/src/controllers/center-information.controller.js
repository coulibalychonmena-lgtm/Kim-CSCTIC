import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as centerInformationService from '../services/center-information.service.js';

export const listCenterInformation = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await centerInformationService.listCenterInformation() });
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
