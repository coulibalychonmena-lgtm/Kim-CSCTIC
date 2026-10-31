import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../services/chatService.js';
import { useLanguage } from './LanguageContext.jsx';

const ChatContext = createContext(null);
const HUMAN_MESSAGES_POLL_MILLISECONDS = 6000;

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
  const [sessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const displayedAgentMessageIds = useRef(new Set());

  const appendMessage = useCallback(
    (newMessage) => setMessages((previousMessages) => [...previousMessages, { id: crypto.randomUUID(), ...newMessage }]),
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
        sources: kimReply.sources, images: kimReply.images,
        request: kimReply.request, needsHuman: kimReply.needs_human && !kimReply.human_takeover,
      });
    } catch (error) {
      appendMessage({ role: 'kim', text: error.message, error: true });
    } finally {
      setTyping(false);
    }
  }, [typing, appendMessage, sessionId, lang, translate]);

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

  /** Affiche dans le fil le récapitulatif d'une demande envoyée via un formulaire. */
  const addRequestSummary = useCallback(
    (request) => appendMessage({ role: 'kim', text: '', request }),
    [appendMessage],
  );

  const value = useMemo(() => ({ messages, typing, send, addRequestSummary }), [messages, typing, send, addRequestSummary]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
