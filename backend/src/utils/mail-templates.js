// Contenu des e-mails de compte, dans la langue du visiteur (fr, en, ko ; anglais sinon). Fonctions pures.
const TEMPLATES = {
  reset_password: {
    fr: { subject: 'Réinitialisation de votre mot de passe — CSCTICAO', intro: 'Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable 1 heure et ne sert qu\'une fois :', button: 'Choisir un nouveau mot de passe', outro: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé." },
    en: { subject: 'Reset your password — CSCTICAO', intro: 'You asked to reset your password. This link is valid for 1 hour and can be used once:', button: 'Choose a new password', outro: "If you didn't ask for this, ignore this message: your password stays unchanged." },
    ko: { subject: '비밀번호 재설정 — CSCTICAO', intro: '비밀번호 재설정을 요청하셨습니다. 이 링크는 1시간 동안, 한 번만 사용할 수 있습니다:', button: '새 비밀번호 설정', outro: '요청하지 않으셨다면 이 메시지를 무시하세요. 비밀번호는 변경되지 않습니다.' },
  },
  verify_email: {
    fr: { subject: 'Confirmez votre adresse e-mail — CSCTICAO', intro: 'Merci de votre inscription. Confirmez votre adresse e-mail avec ce lien (valable 24 heures) :', button: "Confirmer mon adresse e-mail", outro: "Si vous n'avez pas créé de compte, ignorez ce message." },
    en: { subject: 'Confirm your email address — CSCTICAO', intro: 'Thank you for signing up. Confirm your email address with this link (valid for 24 hours):', button: 'Confirm my email address', outro: "If you didn't create an account, ignore this message." },
    ko: { subject: '이메일 주소를 확인해 주세요 — CSCTICAO', intro: '가입해 주셔서 감사합니다. 아래 링크(24시간 유효)로 이메일 주소를 확인해 주세요:', button: '이메일 주소 확인', outro: '계정을 만들지 않으셨다면 이 메시지를 무시하세요.' },
  },
};

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function buildAccountEmail(purpose, language, link) {
  const template = TEMPLATES[purpose][language] ?? TEMPLATES[purpose].en;
  const text = `${template.intro}\n\n${link}\n\n${template.outro}`;
  const html = `<p>${escapeHtml(template.intro)}</p><p><a href="${escapeHtml(link)}" style="background:#f04c23;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;display:inline-block">${escapeHtml(template.button)}</a></p><p style="color:#555;font-size:13px">${escapeHtml(link)}</p><p>${escapeHtml(template.outro)}</p>`;
  return { subject: template.subject, text, html };
}
