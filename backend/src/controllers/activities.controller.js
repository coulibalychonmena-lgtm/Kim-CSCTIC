import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as activitiesService from '../services/activities.service.js';
import { visitorIdOf } from '../middlewares/auth.middleware.js';
import { requestedLanguage } from '../utils/request-language.js';
import { publicActivities } from '../services/public-content.service.js';

export const listActivities = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await publicActivities(requestedLanguage(request)) });
});

export const createActivity = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await activitiesService.createActivity(request.body) });
});

export const updateActivity = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await activitiesService.updateActivity(request.params.id, request.body) });
});

export const deleteActivity = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await activitiesService.deleteActivity(request.params.id) });
});

export const registerToActivity = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await activitiesService.registerToActivity(request.body, visitorIdOf(request)) });
});

export const listRegistrations = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await activitiesService.listRegistrations(request.query.status) });
});

export const updateRegistrationStatus = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await activitiesService.updateRegistrationStatus(request.params.id, request.body) });
});
