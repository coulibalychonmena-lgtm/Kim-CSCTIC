import { sendApiRequest } from './httpClient.js';

export const chatService = {
  sendMessage: (messageData) => sendApiRequest('/chat/message', { method: 'POST', body: messageData }),
  getHumanMessages: (sessionId) =>
    sendApiRequest(`/chat/session/${encodeURIComponent(sessionId)}/human-messages`).then((responseBody) => responseBody.data),
};
