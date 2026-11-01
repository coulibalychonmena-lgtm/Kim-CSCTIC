import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as roomsService from '../services/rooms.service.js';
import { visitorIdOf } from '../middlewares/auth.middleware.js';

export const listRooms = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await roomsService.listRooms() });
});

export const createRoom = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await roomsService.createRoom(request.body) });
});

export const updateRoom = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await roomsService.updateRoom(request.params.id, request.body) });
});

export const deleteRoom = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await roomsService.deleteRoom(request.params.id) });
});

export const createRoomRequest = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await roomsService.createRoomRequest(request.body, visitorIdOf(request)) });
});

export const listRoomRequests = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await roomsService.listRoomRequests(request.query.status) });
});

export const updateRoomRequestStatus = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await roomsService.updateRoomRequestStatus(request.params.id, request.body) });
});

export const getRoomAvailability = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await roomsService.getRoomAvailability(request.params.id, request.query.date) });
});
