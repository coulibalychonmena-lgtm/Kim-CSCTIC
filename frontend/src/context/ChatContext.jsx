import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../services/chatService.js';
import { publicService } from '../services/publicService.js';
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
  const { isReady, reportUnreachable } = useBackendStatus();
  const [suggestions, setSuggestions] = useState([]);
  const [videos, setVideos] = useState([]);
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
        presentation: kimReply.presentation, videos: kimReply.videos,
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

  /** Kim présente les services : diaporama d'images avec description et boutons d'action. */
  const showPresentation = useCallback(async () => {
    setTyping(true);
    try {
      const slides = await publicService.listPresentation(lang);
      if (slides.length) {
        appendMessage({ role: 'kim', text: translate('presentation_intro'), presentation: slides });
        appendMessage({ role: 'kim', text: translate('presentation_followup'), showSuggestions: true });
      } else {
        appendMessage({ role: 'kim', text: translate('presentation_none') });
      }
    } catch (error) {
      if (UNREACHABLE_STATUSES.includes(error.status)) reportUnreachable();
      appendMessage({ role: 'kim', text: UNREACHABLE_STATUSES.includes(error.status) ? translate('reconnecting') : error.message, error: true });
    } finally { setTyping(false); }
  }, [lang, translate, appendMessage, reportUnreachable]);

  const showVideos = useCallback(() => {
    appendMessage(videos.length
      ? { role: 'kim', text: translate('videos_intro'), videos }
      : { role: 'kim', text: translate('videos_none') });
  }, [videos, translate, appendMessage]);

  /** Une suggestion du chat (gérée dans l'administration) : message, présentation, vidéos, formulaire ou agent. */
  const runSuggestion = useCallback((suggestion) => {
    const label = (lang === 'en' && suggestion.label_en) || (lang === 'ko' && suggestion.label_ko) || suggestion.label;
    const echoLabel = () => appendMessage({ role: 'user', text: label });
    switch (suggestion.action_type) {
      case 'presentation': echoLabel(); showPresentation(); break;
      case 'videos': echoLabel(); showVideos(); break;
      case 'form_room': echoLabel(); openForm('room_request'); break;
      case 'form_register': echoLabel(); openForm('activity_registration'); break;
      case 'form_partner': echoLabel(); openForm('partnership'); break;
      case 'agent': send(translate('agent_request')); break;
      default: send(suggestion.message || label);
    }
  }, [lang, translate, appendMessage, showPresentation, showVideos, openForm, send]);

  /** Bouton d'une diapositive : réserver, s'inscrire, proposer un partenariat, contacter un agent. */
  const runSlideAction = useCallback((action) => {
    if (action.type === 'reserve') openForm('room_request', action.target ? { room_id: action.target } : {});
    else if (action.type === 'register') openForm('activity_registration', action.target ? { activity_id: action.target } : {});
    else if (action.type === 'partner') openForm('partnership');
    else if (action.type === 'contact') send(translate('agent_request'));
  }, [openForm, send, translate]);

  // Suggestions et vidéos de l'administration, chargées dès que Kim est prêt.
  useEffect(() => {
    if (!isReady) return undefined;
    let isMounted = true;
    Promise.all([publicService.listChatSuggestions().catch(() => []), publicService.listVideos().catch(() => [])])
      .then(([loadedSuggestions, loadedVideos]) => { if (isMounted) { setSuggestions(loadedSuggestions); setVideos(loadedVideos); } });
    return () => { isMounted = false; };
  }, [isReady]);

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
    () => ({ messages, typing, send, openForm, completeForm, dismissForm, patchMessage, suggestions, hasVideos: videos.length > 0, runSuggestion, runSlideAction }),
    [messages, typing, send, openForm, completeForm, dismissForm, patchMessage, suggestions, videos, runSuggestion, runSlideAction],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
