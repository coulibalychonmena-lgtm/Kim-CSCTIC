import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as chatService from '../services/chat.service.js';
import * as humanTakeoverService from '../services/human-takeover.service.js';

export const postChatMessage = wrapAsyncRoute(async (request, response) => {
  response.json(await chatService.handleMessage(request.body));
});

export const getHumanMessages = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await humanTakeoverService.getVisitorView(request.params.sessionId) });
});
