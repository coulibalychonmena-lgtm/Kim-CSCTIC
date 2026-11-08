import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatService } from '../services/chatService.js';
import { publicService } from '../services/publicService.js';
import { useLanguage } from './LanguageContext.jsx';
import { useBackendStatus } from './BackendStatusContext.jsx';
import { useAuth } from './AuthContext.jsx';

const ChatContext = createContext(null);
const HUMAN_MESSAGES_POLL_MILLISECONDS = 6000;
const HUMAN_MESSAGES_MAX_POLL_MILLISECONDS = 30000;
const UNREACHABLE_STATUSES = [0, 502, 503, 504];

function getSessionId() {
  let sessionId = sessionStorage.getItem('kim_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('kim_session_id', sessionId);
  }
  return sessionId;
}

/** Identifiant d'appareil durable : le serveur s'en sert pour compter le quota anonyme (un nouvel onglet ne le remet pas à zéro). */
function getDeviceId() {
  try {
    let deviceId = localStorage.getItem('kim_device_id');
    if (!deviceId) { deviceId = crypto.randomUUID(); localStorage.setItem('kim_device_id', deviceId); }
    return deviceId;
  } catch { return 'no-storage'; }
}

export function ChatProvider({ children }) {
  const { lang, translate } = useLanguage();
  const { token } = useAuth();
  const { isReady, reportUnreachable } = useBackendStatus();
  const [replyLanguage, setReplyLanguage] = useState(lang);
  const [suggestions, setSuggestions] = useState([]);
  const [videos, setVideos] = useState([]);
  const [sessionId, setSessionId] = useState(getSessionId);
  const [deviceId] = useState(getDeviceId);
  const [anonymousRemaining, setAnonymousRemaining] = useState(null);
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

  /** Message de Kim affiché à partir de la réponse complète du serveur. */
  const toKimMessage = useCallback((kimReply) => ({
    role: 'kim', lang: kimReply.language, serverId: kimReply.message_id,
    text: kimReply.human_takeover ? translate('takeover_notice') : kimReply.reply,
    sources: kimReply.sources, images: kimReply.images, form: kimReply.form,
    presentation: kimReply.presentation, videos: kimReply.videos,
    needsHuman: kimReply.needs_human && !kimReply.human_takeover,
    offersAgent: kimReply.agent_offer && !kimReply.needs_human,
    streaming: false,
  }), [translate]);

  /**
   * `options.intent = 'agent_request'` : clic sur « Parler à un agent » (accord explicite d'escalade).
   * La réponse s'affiche au fil de l'eau (SSE) ; le texte final du serveur la remplace à la fin.
   */
  const send = useCallback(async (text, options = {}) => {
    const message = text.trim();
    if (!message || typing) return;
    appendMessage({ role: 'user', text: message });
    setTyping(true);
    const streamedMessageId = crypto.randomUUID();
    let streamedText = '';
    let streamStarted = false;
    try {
      const kimReply = await chatService.streamMessage(
        { message, sessionId, deviceId, language: lang, ...(options.intent ? { intent: options.intent } : {}) },
        token,
        (delta) => {
          streamedText += delta;
          if (!streamStarted) {
            streamStarted = true;
            setMessages((previous) => [...previous, { id: streamedMessageId, role: 'kim', text: streamedText, streaming: true }]);
          } else {
            setMessages((previous) => previous.map((entry) => (entry.id === streamedMessageId ? { ...entry, text: streamedText } : entry)));
          }
        },
      );
      // L'agent n'est réellement prévenu que sur accord explicite : le serveur le confirme par needs_human.
      if (kimReply.needs_human) setWaitingForAgent(true);
      if (kimReply.language) setReplyLanguage(kimReply.language);
      setAnonymousRemaining(kimReply.anonymous_remaining ?? null);
      const finalMessage = toKimMessage(kimReply);
      if (streamStarted) setMessages((previous) => previous.map((entry) => (entry.id === streamedMessageId ? { ...entry, ...finalMessage } : entry)));
      else appendMessage(finalMessage);
    } catch (error) {
      if (streamStarted) setMessages((previous) => previous.filter((entry) => entry.id !== streamedMessageId)); // réponse partielle abandonnée
      if (error.status === 429 && ['LOGIN_REQUIRED', 'CLIENT_CAP'].includes(error.code)) {
        // Quota atteint : message dans la langue du visiteur + connexion (Google en un clic).
        appendMessage({ role: 'kim', text: error.message, quota: { code: error.code } });
      } else if (error.status === 429) {
        appendMessage({ role: 'kim', text: error.message, error: true });
      } else if (UNREACHABLE_STATUSES.includes(error.status)) {
        // Serveur endormi ou injoignable : un seul message, puis le réveil automatique reprend la main.
        reportUnreachable();
        appendMessage({ role: 'kim', text: translate('reconnecting'), error: true });
      } else {
        appendMessage({ role: 'kim', text: error.message, error: true });
      }
    } finally {
      setTyping(false);
    }
  }, [typing, appendMessage, sessionId, deviceId, lang, token, translate, reportUnreachable, toKimMessage]);

  /** Horaires / contact : réponse de la base, sans modèle, hors quota. */
  const askFaq = useCallback(async (topic, label) => {
    appendMessage({ role: 'user', text: label });
    setTyping(true);
    try {
      const answer = await chatService.getFaq(topic, { lang, sessionId, deviceId }, token);
      appendMessage({ role: 'kim', lang: answer.language, text: answer.reply, sources: answer.sources });
    } catch (error) {
      if (UNREACHABLE_STATUSES.includes(error.status)) reportUnreachable();
      appendMessage({ role: 'kim', text: UNREACHABLE_STATUSES.includes(error.status) ? translate('reconnecting') : error.message, error: true });
    } finally { setTyping(false); }
  }, [appendMessage, lang, sessionId, deviceId, token, translate, reportUnreachable]);

  /** Demande explicite d'un agent (bouton) : c'est l'accord qui autorise l'alerte. */
  const requestAgent = useCallback(() => send(translate('agent_request'), { intent: 'agent_request' }), [send, translate]);

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
      const slides = await publicService.listPresentation(replyLanguage);
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
  }, [replyLanguage, translate, appendMessage, reportUnreachable]);

  const showVideos = useCallback(() => {
    appendMessage(videos.length
      ? { role: 'kim', text: translate('videos_intro'), videos }
      : { role: 'kim', text: translate('videos_none') });
  }, [videos, translate, appendMessage]);

  /** Une suggestion du chat (gérée dans l'administration) : message, présentation, vidéos, formulaire ou agent. */
  const runSuggestion = useCallback((suggestion) => {
    const { label } = suggestion;
    const echoLabel = () => appendMessage({ role: 'user', text: label });
    switch (suggestion.action_type) {
      case 'presentation': echoLabel(); showPresentation(); break;
      case 'videos': echoLabel(); showVideos(); break;
      case 'form_room': echoLabel(); openForm('room_request'); break;
      case 'form_register': echoLabel(); openForm('activity_registration'); break;
      case 'form_partner': echoLabel(); openForm('partnership'); break;
      case 'faq_hours': askFaq('hours', label); break;
      case 'faq_contact': askFaq('contact', label); break;
      case 'agent': requestAgent(); break;
      default: send(suggestion.message || label);
    }
  }, [translate, appendMessage, showPresentation, showVideos, openForm, askFaq, requestAgent]);

  /** Bouton d'une diapositive : réserver, s'inscrire, proposer un partenariat, contacter un agent. */
  const runSlideAction = useCallback((action) => {
    if (action.type === 'reserve') openForm('room_request', action.target ? { room_id: action.target } : {});
    else if (action.type === 'register') openForm('activity_registration', action.target ? { activity_id: action.target } : {});
    else if (action.type === 'partner') openForm('partnership');
    else if (action.type === 'contact') requestAgent();
  }, [openForm, requestAgent]);

  // Suggestions et vidéos de l'administration, chargées dès que Kim est prêt.
  useEffect(() => {
    if (!isReady) return undefined;
    let isMounted = true;
    Promise.all([publicService.listChatSuggestions(lang).catch(() => []), publicService.listVideos(lang).catch(() => [])])
      .then(([loadedSuggestions, loadedVideos]) => { if (isMounted) { setSuggestions(loadedSuggestions); setVideos(loadedVideos); } });
    return () => { isMounted = false; };
  }, [isReady, lang]);

  // Changer la langue de l'interface change aussi celle de la conversation.
  useEffect(() => { setReplyLanguage(lang); }, [lang]);

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

  // Dès qu'un agent est réellement sollicité, on relit ses réponses : toutes les 6 s, avec ralentissement progressif (jusqu'à 30 s)
  // tant qu'il n'y a rien de nouveau, et pause quand l'onglet est masqué. Aucun appel tant qu'il n'y a pas eu d'escalade.
  useEffect(() => {
    if (!waitingForAgent) return undefined;
    let cancelled = false;
    let timer = null;
    let delay = HUMAN_MESSAGES_POLL_MILLISECONDS;
    const schedule = () => { if (!cancelled) timer = setTimeout(poll, delay); };
    async function poll() {
      if (document.hidden) { schedule(); return; }
      let foundNew = false;
      try {
        const { messages: agentMessages } = await chatService.getHumanMessages(sessionId);
        agentMessages
          .filter((agentMessage) => !displayedAgentMessageIds.current.has(agentMessage.id))
          .forEach((agentMessage) => {
            foundNew = true;
            displayedAgentMessageIds.current.add(agentMessage.id);
            appendMessage({ role: 'agent', text: agentMessage.message });
          });
      } catch { /* le prochain passage réessaiera */ }
      delay = foundNew ? HUMAN_MESSAGES_POLL_MILLISECONDS : Math.min(Math.round(delay * 1.5), HUMAN_MESSAGES_MAX_POLL_MILLISECONDS);
      schedule();
    }
    const onVisibility = () => { if (!document.hidden) { clearTimeout(timer); delay = HUMAN_MESSAGES_POLL_MILLISECONDS; poll(); } };
    document.addEventListener('visibilitychange', onVisibility);
    poll();
    return () => { cancelled = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, [waitingForAgent, sessionId, appendMessage]);

  // Rechargement de la page : la session du serveur est conservée, la conversation est relue au lieu d'être perdue.
  const historyLoadedFor = useRef(null);
  useEffect(() => {
    if (!isReady || historyLoadedFor.current === sessionId) return undefined;
    historyLoadedFor.current = sessionId;
    let isMounted = true;
    chatService.getHistory(sessionId).then((exchanges) => {
      if (!isMounted || !exchanges.length) return;
      const restored = exchanges.flatMap((exchange) => [
        ...(exchange.user_message && !exchange.user_message.startsWith('[FAQ ') ? [{ id: `h-u-${exchange.id}`, role: 'user', text: exchange.user_message }] : []),
        ...(exchange.kim_response ? [{ id: `h-k-${exchange.id}`, role: 'kim', lang: exchange.detected_language, serverId: exchange.id, text: exchange.kim_response, rating: exchange.rating ?? null, needsHuman: exchange.needs_human }] : []),
      ]);
      setMessages((current) => (current.length ? current : restored));
      if (exchanges.some((exchange) => exchange.needs_human)) setWaitingForAgent(true);
    }).catch(() => { /* historique indisponible : on repart d'une conversation vide */ });
    return () => { isMounted = false; };
  }, [isReady, sessionId]);

  /** « Nouvelle conversation » : nouvelle session (le contexte gardé par le serveur est abandonné) et fil vide. */
  const startNewConversation = useCallback(() => {
    const newSessionId = crypto.randomUUID();
    sessionStorage.setItem('kim_session_id', newSessionId);
    displayedAgentMessageIds.current = new Set();
    historyLoadedFor.current = newSessionId;
    setMessages([]);
    setWaitingForAgent(false);
    setAnonymousRemaining(null);
    setReplyLanguage(lang);
    setSessionId(newSessionId);
  }, [lang]);

  /** Historique : liste, ouverture, suppression (le contenu est effacé côté serveur ; le quota, lui, n'est pas remis à zéro). */
  const listConversations = useCallback(() => chatService.listConversations({ deviceId }, token), [deviceId, token]);

  const openConversation = useCallback((targetSessionId) => {
    if (targetSessionId === sessionId) return;
    sessionStorage.setItem('kim_session_id', targetSessionId);
    displayedAgentMessageIds.current = new Set();
    historyLoadedFor.current = null; // l'effet de relecture charge la conversation choisie
    setMessages([]);
    setWaitingForAgent(false);
    setSessionId(targetSessionId);
  }, [sessionId]);

  const deleteConversation = useCallback(async (targetSessionId) => {
    await chatService.deleteConversation(targetSessionId, { deviceId }, token);
    if (targetSessionId === sessionId) startNewConversation();
  }, [deviceId, token, sessionId, startNewConversation]);

  const deleteAllConversations = useCallback(async () => {
    await chatService.deleteAllConversations({ deviceId }, token);
    startNewConversation();
  }, [deviceId, token, startNewConversation]);

  /** Pouce haut (1) / bas (-1) sur une réponse de Kim. */
  const rateMessage = useCallback(async (messageId, serverId, rating) => {
    patchMessage(messageId, { rating });
    try { await chatService.sendFeedback({ messageId: serverId, sessionId, rating }); } catch { patchMessage(messageId, { rating: null }); }
  }, [patchMessage, sessionId]);

  const value = useMemo(
    () => ({ messages, typing, send, requestAgent, startNewConversation, rateMessage, sessionId, listConversations, openConversation, deleteConversation, deleteAllConversations, anonymousRemaining, openForm, completeForm, dismissForm, patchMessage, suggestions, hasVideos: videos.length > 0, runSuggestion, runSlideAction }),
    [messages, typing, send, requestAgent, startNewConversation, rateMessage, sessionId, listConversations, openConversation, deleteConversation, deleteAllConversations, anonymousRemaining, openForm, completeForm, dismissForm, patchMessage, suggestions, videos, runSuggestion, runSlideAction],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export const useChat = () => useContext(ChatContext);
