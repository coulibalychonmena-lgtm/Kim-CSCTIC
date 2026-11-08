import { API_BASE_URL, ApiError, sendApiRequest } from './httpClient.js';
import { createSseParser } from '../utils/sse.js';

export const chatService = {
  sendMessage: (messageData, token) => sendApiRequest('/chat/message', { method: 'POST', body: messageData, token }),

  /**
   * Réponse en flux (SSE) : `onDelta(texte)` reçoit la réponse au fil de l'eau ; la promesse renvoie la réponse complète
   * (même contenu que /chat/message). Un refus avant génération (quota 429…) arrive comme une erreur HTTP normale.
   */
  async streamMessage(messageData, token, onDelta) {
    let httpResponse;
    try {
      httpResponse = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(messageData),
      });
    } catch {
      throw new ApiError('Impossible de joindre le serveur.', 0);
    }
    if (!httpResponse.ok) {
      const failure = await httpResponse.json().catch(() => ({}));
      throw new ApiError(failure?.error?.message || `Erreur ${httpResponse.status}`, httpResponse.status, failure?.error?.details, failure?.error?.code);
    }
    if (!httpResponse.body?.getReader) return chatService.sendMessage(messageData, token); // navigateur sans flux : réponse d'un bloc

    const reader = httpResponse.body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    let finalReply = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const { event, data } of parser.push(decoder.decode(value, { stream: true }))) {
        if (event === 'delta') onDelta?.(data.text);
        else if (event === 'done') finalReply = data;
        else if (event === 'error') throw new ApiError(data.message || 'Erreur pendant la réponse.', 502);
      }
    }
    if (!finalReply) throw new ApiError('Réponse interrompue.', 502);
    return finalReply;
  },

  /** Horaires / contact : réponses de la base, sans modèle et hors quota. */
  getFaq: (topic, { lang, sessionId, deviceId }, token) => sendApiRequest(
    `/chat/faq/${encodeURIComponent(topic)}?lang=${encodeURIComponent(lang)}&sessionId=${encodeURIComponent(sessionId)}&deviceId=${encodeURIComponent(deviceId)}`, { token },
  ),
  /** Historique : conversations de l'appareil (et du compte), suppression d'une conversation ou de tout l'historique. */
  listConversations: ({ deviceId }, token) => sendApiRequest(`/chat/sessions?deviceId=${encodeURIComponent(deviceId)}`, { token }).then((responseBody) => responseBody.data),
  deleteConversation: (sessionId, { deviceId }, token) => sendApiRequest(`/chat/session/${encodeURIComponent(sessionId)}?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE', token }),
  deleteAllConversations: ({ deviceId }, token) => sendApiRequest(`/chat/sessions?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE', token }),
  sendFeedback: (feedback) => sendApiRequest('/chat/feedback', { method: 'POST', body: feedback }),
  getHistory: (sessionId) => sendApiRequest(`/chat/session/${encodeURIComponent(sessionId)}/history`).then((responseBody) => responseBody.data),
  getHumanMessages: (sessionId) =>
    sendApiRequest(`/chat/session/${encodeURIComponent(sessionId)}/human-messages`).then((responseBody) => responseBody.data),
};
