// Réponses FAQ sans modèle (horaires, contact) : texte fabriqué à partir de la base, dans la langue du visiteur.
const DAYS = {
  fr: ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'],
  en: ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ko: ['', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
};
const TEXTS = {
  hours_intro: { fr: "Voici les horaires d'ouverture du Centre :", en: 'Here are the Centre\'s opening hours:', ko: '센터 운영 시간은 다음과 같습니다:' },
  closed: { fr: 'fermé', en: 'closed', ko: '휴관' },
  hours_unknown: { fr: "Les horaires d'ouverture ne sont pas encore renseignés.", en: 'Opening hours have not been entered yet.', ko: '운영 시간이 아직 등록되지 않았습니다.' },
  contact_intro: { fr: 'Voici les coordonnées du Centre :', en: 'Here are the Centre\'s contact details:', ko: '센터 연락처는 다음과 같습니다:' },
  contact_unknown: { fr: "Les coordonnées du Centre ne sont pas encore renseignées. Je peux transmettre votre question à un agent si vous le souhaitez.", en: 'The Centre\'s contact details have not been entered yet. I can forward your question to an agent if you like.', ko: '센터 연락처가 아직 등록되지 않았습니다. 원하시면 질문을 상담원에게 전달해 드릴 수 있습니다.' },
  source_hours: { fr: "Horaires d'ouverture du Centre", en: "Centre opening hours", ko: '센터 운영 시간' },
  source_contact: { fr: 'Coordonnées du Centre', en: 'Centre contact details', ko: '센터 연락처' },
};
const pick = (table, language) => table[language] ?? table.en;
export const faqText = (key, language) => pick(TEXTS[key], language);
export const dayName = (dayNumber, language) => pick(DAYS, language)[dayNumber];

const hhmm = (time, language) => (language === 'fr' ? String(time).slice(0, 5).replace(':', 'h') : String(time).slice(0, 5));

/** Les 7 jours, du lundi au dimanche ; un jour sans horaire est « fermé » (le dimanche ne disparaît plus). */
export function formatOpeningHours(openingHours, language) {
  if (!openingHours.length) return faqText('hours_unknown', language);
  const byDay = new Map(openingHours.map((day) => [Number(day.day_of_week), day]));
  const lines = [1, 2, 3, 4, 5, 6, 7].map((dayNumber) => {
    const day = byDay.get(dayNumber);
    return `- ${dayName(dayNumber, language)} : ${day ? `${hhmm(day.open_time, language)}–${hhmm(day.close_time, language)}` : faqText('closed', language)}`;
  });
  return `${faqText('hours_intro', language)}\n${lines.join('\n')}`;
}

export function formatContacts(contacts, language) {
  if (!contacts.length) return faqText('contact_unknown', language);
  return `${faqText('contact_intro', language)}\n${contacts.map((contact) => `- ${contact.title} : ${contact.content}`).join('\n')}`;
}
