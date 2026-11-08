import { createHash } from 'node:crypto';
import { wrapAsyncRoute } from '../utils/async-route-handler.js';
import { env } from '../config/environment.js';
import * as chatService from '../services/chat.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import { SUPPORTED_LANGUAGES, USER_ROLES } from '../utils/domain-values.js';
import { answerFaq } from '../services/faq.service.js';
import * as humanTakeoverService from '../services/human-takeover.service.js';

/** Empreinte salée de l'adresse IP : permet de plafonner un réseau sans conserver l'adresse. */
const hashClient = (request) => (request.ip ? createHash('sha256').update(`${env.jwtSecret}|${request.ip}`).digest('hex') : null);

export const postChatMessage = wrapAsyncRoute(async (request, response) => {
  const { message, sessionId, language, intent, deviceId } = request.body;
  response.json(await chatService.handleMessage({
    message, sessionId, language, intent, deviceId, clientHash: hashClient(request), user: request.user || null,
  }));
});

export const getHumanMessages = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await humanTakeoverService.getVisitorView(request.params.sessionId) });
});

/** Réponses FAQ gratuites (horaires, contact), hors quota : GET /chat/faq/hours?lang=fr&sessionId=...&deviceId=... */
export const getFaqAnswer = wrapAsyncRoute(async (request, response) => {
  const { topic } = request.params;
  if (!['hours', 'contact'].includes(topic)) throw new AppError(404, 'Rubrique inconnue.');
  const language = SUPPORTED_LANGUAGES.includes(request.query.lang) ? request.query.lang : 'fr';
  const sessionId = /^[\w-]{1,64}$/.test(String(request.query.sessionId || '')) ? request.query.sessionId : null;
  const deviceId = /^[\w-]{1,64}$/.test(String(request.query.deviceId || '')) ? request.query.deviceId : null;
  response.json(await answerFaq(topic, language, {
    sessionId, deviceId, clientHash: hashClient(request), userId: request.user?.role === USER_ROLES.VISITOR ? request.user.sub : null,
  }));
});

/**
 * POST /chat/stream : même contrat que /chat/message, mais la réponse arrive au fil de l'eau (Server-Sent Events) :
 *   event: delta  data: {"text":"…"}        morceau de la réponse
 *   event: done   data: { …réponse complète… }   identique à la réponse de /chat/message (remplace le texte reçu)
 *   event: error  data: {"message":"…"}     échec après le début du flux
 * Les refus avant génération (quota 429, validation) restent de vraies réponses HTTP JSON : les en-têtes SSE ne sont envoyés
 * qu'au premier morceau ou à la fin.
 */
export const postChatStream = wrapAsyncRoute(async (request, response) => {
  const { message, sessionId, language, intent, deviceId } = request.body;
  let streaming = false;
  const startStream = () => {
    if (streaming) return;
    streaming = true;
    response.status(200).set({ 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.flushHeaders();
  };
  const send = (event, data) => response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    const result = await chatService.handleMessage({
      message, sessionId, language, intent, deviceId, clientHash: hashClient(request), user: request.user || null,
      onReplyDelta: (text) => { startStream(); send('delta', { text }); },
    });
    startStream();
    send('done', result);
    response.end();
  } catch (error) {
    if (!streaming) throw error;           // pas encore de flux : réponse d'erreur HTTP normale (ex. 429)
    send('error', { message: error.message });
    response.end();
  }
});

/** POST /chat/feedback : pouce haut (1) ou bas (-1) sur une réponse de Kim ; un seul avis par réponse et par session, modifiable. */
export const postChatFeedback = wrapAsyncRoute(async (request, response) => {
  response.json(await chatService.recordFeedback(request.body));
});

/** GET /chat/session/:sessionId/history : relit la conversation d'une session (rechargement de la page). */
export const getChatHistory = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await chatService.loadSessionHistory(request.params.sessionId) });
});

const cleanId = (value) => (/^[\w-]{1,64}$/.test(String(value || '')) ? String(value) : null);
const visitorOf = (request) => ({ deviceId: cleanId(request.query.deviceId), userId: request.user?.role === USER_ROLES.VISITOR ? request.user.sub : null });

/** GET /chat/sessions?deviceId=… : conversations de l'appareil (et du compte connecté). */
export const listChatConversations = wrapAsyncRoute(async (request, response) => {
  response.json({ data: await chatService.listConversations(visitorOf(request)) });
});
/** DELETE /chat/session/:sessionId?deviceId=… : supprime le contenu d'une conversation. */
export const deleteChatConversation = wrapAsyncRoute(async (request, response) => {
  response.json(await chatService.deleteConversations({ sessionId: cleanId(request.params.sessionId), ...visitorOf(request) }));
});
/** DELETE /chat/sessions?deviceId=… : supprime tout l'historique du visiteur. */
export const deleteAllChatConversations = wrapAsyncRoute(async (request, response) => {
  response.json(await chatService.deleteConversations({ sessionId: null, ...visitorOf(request) }));
});
