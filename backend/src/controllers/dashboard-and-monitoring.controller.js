import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import * as dashboardStatisticsService from '../services/dashboard-statistics.service.js';
import * as chatMonitoringService from '../services/chat-monitoring.service.js';
import * as humanTakeoverService from '../services/human-takeover.service.js';

export const getDashboardStatistics = wrapAsyncRoute(async (_request, response) => {
  const [counts, quality] = await Promise.all([dashboardStatisticsService.getDashboardStatistics(), dashboardStatisticsService.getQualityIndicators()]);
  response.json({ data: { ...counts, quality } });
});

export const listFlaggedChats = wrapAsyncRoute(async (_request, response) => {
  response.json({ data: await chatMonitoringService.listFlaggedChats() });
});

export const getChatSession = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await chatMonitoringService.getChatSession(request.params.sessionId) });
});

export const startTakeover = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await humanTakeoverService.startTakeover(request.params.sessionId) });
});

export const endTakeover = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await humanTakeoverService.endTakeover(request.params.sessionId) });
});

export const replyToVisitor = wrapAsyncRoute(async (request, response) => {
  response.status(201).json({ data: await humanTakeoverService.sendHumanReply(request.params.sessionId, request.body.message) });
});
