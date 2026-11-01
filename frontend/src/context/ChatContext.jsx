import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../services/chatService.js';
import { useLanguage } from './LanguageContext.jsx';
import { useBackendStatus } from './BackendStatusContext.jsx';

const ChatContext = createContext(null);
const HUMAN_MESSAGES_POLL_MILLISECONDS = 6000;
const UNREACHABLE_STATUSES = [0, 502, 503, 504];

function getSessionId() {
  let sessionId = sessionStorage.getItem('kim_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('kim_session_id', sessionId);
  }
  return sessionId;
}

export function ChatProvider({ children }) {
  const { lang, translate } = useLanguage();
  const { reportUnreachable } = useBackendStatus();
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const displayedAgentMessageIds = useRef(new Set());

  const appendMessage = useCallback(
    (newMessage) => setMessages((previousMessages) => [...previousMessages, { id: crypto.randomUUID(), ...newMessage }]),
    [],
  );
  const patchMessage = useCallback(
    (messageId, patch) => setMessages((previousMessages) => previousMessages.map((message) => (message.id === messageId ? { ...message, ...patch } : message))),
    [],
  );

  const send = useCallback(async (text) => {
    const message = text.trim();
    if (!message || typing) return;
    appendMessage({ role: 'user', text: message });
    setTyping(true);
    try {
      const kimReply = await chatService.sendMessage({ message, sessionId, language: lang });
      if (kimReply.needs_human) setWaitingForAgent(true);
      appendMessage({
        role: 'kim', text: kimReply.human_takeover ? translate('takeover_notice') : kimReply.reply,
        sources: kimReply.sources, images: kimReply.images, form: kimReply.form,
        needsHuman: kimReply.needs_human && !kimReply.human_takeover,
      });
    } catch (error) {
      // Serveur endormi ou injoignable : un seul message, puis le réveil automatique reprend la main.
      if (UNREACHABLE_STATUSES.includes(error.status)) {
        reportUnreachable();
        appendMessage({ role: 'kim', text: translate('reconnecting'), error: true });
      } else {
        appendMessage({ role: 'kim', text: error.message, error: true });
      }
    } finally {
      setTyping(false);
    }
  }, [typing, appendMessage, sessionId, lang, translate, reportUnreachable]);

  /** Kim affiche un formulaire dans le fil (boutons rapides, liens de la page d'accueil). */
  const openForm = useCallback((formType, prefill = {}) => {
    setMessages((previousMessages) => {
      const alreadyOpen = previousMessages.some((message) => message.form?.type === formType && message.form.state === 'open');
      if (alreadyOpen) return previousMessages;
      return [...previousMessages, {
        id: crypto.randomUUID(), role: 'kim', text: translate(`form_intro_${formType}`),
        form: { type: formType, prefill, state: 'open' },
      }];
    });
  }, [translate]);

  /** Formulaire envoyé : il se referme et le récapitulatif de la demande s'affiche. */
  const completeForm = useCallback((messageId, request) => {
    setMessages((previousMessages) => [
      ...previousMessages.map((message) => (message.id === messageId ? { ...message, form: { ...message.form, state: 'sent' } } : message)),
      { id: crypto.randomUUID(), role: 'kim', text: '', request },
    ]);
  }, []);

  const dismissForm = useCallback((messageId) => {
    setMessages((previousMessages) => previousMessages.map((message) => (message.id === messageId ? { ...message, form: { ...message.form, state: 'closed' } } : message)));
  }, []);

  // Dès qu'un agent est sollicité, on relit régulièrement ses réponses.
  useEffect(() => {
    if (!waitingForAgent) return undefined;
    const pollAgentMessages = async () => {
      try {
        const { messages: agentMessages } = await chatService.getHumanMessages(sessionId);
        agentMessages
          .filter((agentMessage) => !displayedAgentMessageIds.current.has(agentMessage.id))
          .forEach((agentMessage) => {
            displayedAgentMessageIds.current.add(agentMessage.id);
            appendMessage({ role: 'agent', text: agentMessage.message });
          });
      } catch { /* le prochain passage réessaiera */ }
    };
    pollAgentMessages();
    const pollTimer = setInterval(pollAgentMessages, HUMAN_MESSAGES_POLL_MILLISECONDS);
    return () => clearInterval(pollTimer);
  }, [waitingForAgent, sessionId, appendMessage]);

  const value = useMemo(
    () => ({ messages, typing, send, openForm, completeForm, dismissForm, patchMessage }),
    [messages, typing, send, openForm, completeForm, dismissForm, patchMessage],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
