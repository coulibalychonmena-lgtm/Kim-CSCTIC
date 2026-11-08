// Messages système du chat, dans la langue du visiteur (fr, en, ko ; anglais pour toute autre langue).
const NOTICES = {
  login_required: {
    fr: 'Vous avez posé vos 5 premières questions en tant que visiteur. Pour continuer à discuter avec Kim, connectez-vous ou créez un compte gratuit (un clic avec Google suffit).',
    en: "You've used your first 5 questions as a visitor. To keep chatting with Kim, sign in or create a free account (one click with Google is enough).",
    ko: '방문자로서 처음 5개의 질문을 모두 사용하셨습니다. Kim과 계속 대화하려면 로그인하거나 무료 계정을 만드세요(Google로 한 번에 가능).',
  },
  client_cap: {
    fr: 'Beaucoup de questions arrivent depuis votre réseau en ce moment. Réessayez dans une heure, ou connectez-vous pour continuer.',
    en: 'Many questions are coming from your network right now. Try again in an hour, or sign in to continue.',
    ko: '현재 같은 네트워크에서 질문이 많이 들어오고 있습니다. 한 시간 후에 다시 시도하거나 로그인해 계속하세요.',
  },
  account_cap: {
    fr: 'Vous avez atteint la limite de questions par heure. Réessayez dans un moment.',
    en: "You've reached the hourly question limit. Please try again in a while.",
    ko: '시간당 질문 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.',
  },
  already_escalated: {
    fr: 'Un agent du Centre a déjà été prévenu pour cette conversation : il vous répondra ici.',
    en: 'A Centre agent has already been notified for this conversation: they will reply here.',
    ko: '이 대화에 대해 센터 담당자에게 이미 알렸습니다. 이곳에서 답변해 드립니다.',
  },
  quota_exceeded: {
    fr: "Trop de demandes d'agent ont été envoyées aujourd'hui. Réessayez demain, ou contactez le Centre pendant ses horaires d'ouverture.",
    en: 'Too many agent requests were sent today. Please try again tomorrow, or contact the Centre during opening hours.',
    ko: '오늘 상담원 요청이 너무 많이 접수되었습니다. 내일 다시 시도하거나 운영 시간에 센터로 문의해 주세요.',
  },
  technical_failure: {
    fr: "Je ne parviens pas à répondre pour le moment. Réessayez dans un instant, ou demandez à parler à un agent du Centre.",
    en: "I can't answer right now. Please try again in a moment, or ask to talk to a Centre agent.",
    ko: '지금은 답변을 드릴 수 없습니다. 잠시 후 다시 시도하거나 센터 상담원과의 대화를 요청해 주세요.',
  },
  agent_forwarded: {
    fr: "Votre demande est transmise à un agent du Centre : il vous répondra ici.",
    en: 'Your request has been passed to a Centre agent: they will reply here.',
    ko: '요청을 센터 담당자에게 전달했습니다. 이곳에서 답변해 드립니다.',
  },
};

export const noticeText = (code, language) => NOTICES[code]?.[language] ?? NOTICES[code]?.en ?? '';
