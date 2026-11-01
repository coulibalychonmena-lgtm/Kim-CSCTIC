import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as partnershipsService from '../services/partnerships.service.js';
import { visitorIdOf } from '../middlewares/auth.middleware.js';

export const createPartnership = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await partnershipsService.createPartnership(request.body, visitorIdOf(request)) });
});

export const listPartnerships = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await partnershipsService.listPartnerships(request.query.status) });
});

export const updatePartnershipStatus = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await partnershipsService.updatePartnershipStatus(request.params.id, request.body.status) });
});
