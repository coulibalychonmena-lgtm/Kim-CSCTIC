// Textes juridiques (politique de confidentialité, mentions légales) en français, anglais et coréen.
// Ils décrivent ce que le site fait réellement. Les durées de conservation sont les valeurs par défaut de
// backend/scripts/purge-expired-data.js. À faire relire par le Centre (voir docs/corrections/03-conformite-comptes-formulaires.md).
export const LEGAL_CONTENT = {
  privacy: {
    fr: {
      title: 'Politique de confidentialité',
      intro: "Le Centre Sportif, Culturel et TIC Ivoiro-Coréen Alassane Ouattara (CSCTICAO) respecte votre vie privée. Cette page explique quelles données personnelles ce site collecte, pourquoi, combien de temps elles sont conservées et comment exercer vos droits, conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.",
      sections: [
        ['Responsable du traitement', "Le CSCTICAO. Les coordonnées figurent en bas de page et dans les mentions légales."],
        ['Données collectées et finalités', [
          'Demande de salle : nom, prénom, e-mail, téléphone, date, horaires, nombre de personnes, matériel, nature de l\'événement — pour étudier et valider votre demande.',
          'Pré-inscription à une formation : nom, prénom, âge, e-mail, téléphone, niveau et, pour un mineur, le nom et l\'accord d\'un parent ou tuteur — pour gérer l\'inscription.',
          'Proposition de partenariat : organisation, contact, e-mail, téléphone, description — pour étudier la proposition.',
          'Compte : nom, e-mail, téléphone, mot de passe (conservé uniquement sous forme chiffrée) ou identifiant Google — pour suivre vos demandes.',
          'Conversations avec Kim : vos messages et les réponses, une empreinte technique de votre réseau et un identifiant d\'appareil — pour répondre, limiter les abus et améliorer le service.',
        ]],
        ['Base légale', "Votre consentement, que vous donnez en cochant la case présente sur chaque formulaire. Vous pouvez le retirer à tout moment."],
        ['Mineurs', "Pour toute inscription d'une personne de moins de 18 ans, l'accord d'un parent ou tuteur légal est obligatoire."],
        ['Prestataires qui traitent des données pour nous', [
          'Supabase (base de données) et Render (hébergement du site et de l\'API).',
          'Google : connexion avec Google (si vous la choisissez) et modèle Gemini qui génère les réponses de Kim. Vos messages au chat lui sont transmis ; n\'y saisissez pas d\'informations sensibles.',
          'Cloudinary : hébergement des images. Resend : envoi des e-mails de compte.',
        ]],
        ['Durées de conservation', [
          'Conversations avec Kim : 12 mois.',
          'Demandes de salle, pré-inscriptions et propositions de partenariat traitées : 24 mois après leur traitement.',
          'Compte : jusqu\'à sa suppression par vous.',
          'Liens de réinitialisation et de vérification : 1 heure et 24 heures.',
        ]],
        ['Vos droits', "Accès, rectification, opposition et suppression. Depuis « Mon espace », vous pouvez télécharger vos données et supprimer votre compte ; depuis le bouton « Historique » du chat, vous pouvez supprimer une conversation ou tout l'historique (le contenu est effacé ; seules des données techniques anonymisées, comme la date, sont conservées pour limiter les abus). Vous pouvez aussi écrire au Centre (coordonnées ci-dessous). En cas de difficulté, vous pouvez saisir l'Autorité de régulation des télécommunications/TIC de Côte d'Ivoire (ARTCI), autorité de protection des données."],
        ['Sécurité', "Connexions chiffrées (HTTPS), mots de passe chiffrés, accès administrateur protégé, limitation du nombre de questions et de demandes pour éviter les abus."],
      ],
      contact: 'Coordonnées du Centre', noContact: "Les coordonnées seront affichées ici dès qu'elles auront été saisies dans l'administration.", updated: 'Dernière mise à jour',
    },
    en: {
      title: 'Privacy policy',
      intro: 'The Alassane Ouattara Ivorian-Korean Sports, Cultural and ICT Centre (CSCTICAO) respects your privacy. This page explains which personal data this site collects, why, how long it is kept and how to exercise your rights, in accordance with Ivorian law no. 2013-450 of 19 June 2013 on the protection of personal data.',
      sections: [
        ['Data controller', 'CSCTICAO. Contact details are shown in the page footer and in the legal notice.'],
        ['Data collected and purposes', [
          'Room request: name, email, phone, date, times, number of people, equipment, nature of the event — to review and validate your request.',
          'Course pre-registration: name, age, email, phone, level and, for a minor, the name and consent of a parent or guardian — to manage the registration.',
          'Partnership proposal: organisation, contact, email, phone, description — to review the proposal.',
          'Account: name, email, phone, password (stored only in encrypted form) or Google identifier — to follow your requests.',
          'Conversations with Kim: your messages and the replies, a technical fingerprint of your network and a device identifier — to answer, limit abuse and improve the service.',
        ]],
        ['Legal basis', 'Your consent, given by ticking the box on each form. You can withdraw it at any time.'],
        ['Minors', 'For anyone under 18, the consent of a parent or legal guardian is mandatory.'],
        ['Providers processing data for us', [
          'Supabase (database) and Render (hosting of the site and API).',
          'Google: sign-in with Google (if you choose it) and the Gemini model that generates Kim\'s replies. Your chat messages are sent to it; do not enter sensitive information.',
          'Cloudinary: image hosting. Resend: account emails.',
        ]],
        ['Retention periods', [
          'Conversations with Kim: 12 months.',
          'Processed room requests, pre-registrations and partnership proposals: 24 months after processing.',
          'Account: until you delete it.',
          'Reset and verification links: 1 hour and 24 hours.',
        ]],
        ['Your rights', 'Access, rectification, objection and deletion. From "My space" you can download your data and delete your account; from the chat "History" button you can delete a conversation or the whole history (the content is erased; only anonymised technical data such as the date is kept to limit abuse). You can also write to the Centre (contact details below). If needed, you may contact the Ivorian telecommunications/ICT regulatory authority (ARTCI), the data protection authority.'],
        ['Security', 'Encrypted connections (HTTPS), encrypted passwords, protected administrator access, limits on questions and requests to prevent abuse.'],
      ],
      contact: 'Centre contact details', noContact: 'Contact details will appear here once they have been entered in the administration.', updated: 'Last updated',
    },
    ko: {
      title: '개인정보 처리방침',
      intro: '알라산 와타라 코트디부아르-한국 스포츠·문화·ICT 센터(CSCTICAO)는 여러분의 개인정보를 존중합니다. 이 페이지는 코트디부아르 개인정보 보호법(2013년 6월 19일 법률 제2013-450호)에 따라 이 사이트가 수집하는 개인정보, 목적, 보관 기간, 권리 행사 방법을 설명합니다.',
      sections: [
        ['개인정보 처리자', 'CSCTICAO. 연락처는 페이지 하단과 법적 고지에 표시됩니다.'],
        ['수집 항목 및 목적', [
          '시설 예약 요청: 이름, 이메일, 전화번호, 날짜, 시간, 인원, 장비, 행사 내용 — 요청 검토 및 승인.',
          '교육 사전 등록: 이름, 나이, 이메일, 전화번호, 수준, 미성년자의 경우 부모 또는 후견인의 이름과 동의 — 등록 관리.',
          '파트너십 제안: 기관, 담당자, 이메일, 전화번호, 설명 — 제안 검토.',
          '계정: 이름, 이메일, 전화번호, 비밀번호(암호화하여 저장) 또는 Google 식별자 — 요청 진행 확인.',
          'Kim과의 대화: 메시지와 답변, 네트워크의 기술적 식별값, 기기 식별자 — 답변, 남용 방지, 서비스 개선.',
        ]],
        ['법적 근거', '각 양식의 확인란을 선택하여 주시는 동의입니다. 언제든지 철회할 수 있습니다.'],
        ['미성년자', '18세 미만은 부모 또는 법정 후견인의 동의가 필수입니다.'],
        ['처리를 위탁받는 업체', [
          'Supabase(데이터베이스), Render(사이트 및 API 호스팅).',
          'Google: Google 로그인(선택 시)과 Kim의 답변을 생성하는 Gemini 모델. 채팅 메시지가 전달되므로 민감한 정보를 입력하지 마세요.',
          'Cloudinary: 이미지 호스팅. Resend: 계정 관련 이메일 발송.',
        ]],
        ['보관 기간', [
          'Kim과의 대화: 12개월.',
          '처리 완료된 시설 예약, 사전 등록, 파트너십 제안: 처리 후 24개월.',
          '계정: 직접 삭제할 때까지.',
          '재설정·확인 링크: 각각 1시간, 24시간.',
        ]],
        ['귀하의 권리', '열람, 정정, 반대, 삭제. "내 공간"에서 데이터를 내려받고 계정을 삭제할 수 있으며, 채팅의 "대화 기록" 버튼으로 대화 한 건 또는 전체 기록을 삭제할 수 있습니다(내용은 삭제되고, 남용 방지를 위한 날짜 등 익명 처리된 기술 데이터만 보관됩니다). 아래 연락처로 센터에 문의할 수도 있습니다. 필요 시 코트디부아르 통신·ICT 규제기관(ARTCI)에 문의할 수 있습니다.'],
        ['보안', '암호화된 연결(HTTPS), 암호화된 비밀번호, 보호된 관리자 접근, 남용 방지를 위한 질문·요청 횟수 제한.'],
      ],
      contact: '센터 연락처', noContact: '관리자 화면에 연락처가 입력되면 여기에 표시됩니다.', updated: '최종 수정일',
    },
  },
  notice: {
    fr: {
      title: 'Mentions légales',
      intro: 'Site et assistant virtuel « Kim » du Centre Sportif, Culturel et TIC Ivoiro-Coréen Alassane Ouattara (CSCTICAO).',
      sections: [
        ['Éditeur', 'CSCTICAO — Centre Sportif, Culturel et TIC Ivoiro-Coréen Alassane Ouattara, Côte d\'Ivoire. Directeur de la publication : Patrice REMARCK, Directeur Général.'],
        ['Hébergement', 'Site : Render Services, Inc. (États-Unis). Base de données : Supabase, Inc. Images : Cloudinary Ltd.'],
        ['Assistant virtuel', "Kim est un assistant fondé sur l'intelligence artificielle. Il peut se tromper : les informations officielles et les validations (réservations, inscriptions) restent celles des équipes du Centre. Kim ne confirme jamais une demande."],
        ['Données personnelles', 'Voir la politique de confidentialité.'],
      ],
      contact: 'Contact', noContact: "Les coordonnées seront affichées ici dès qu'elles auront été saisies dans l'administration.", updated: 'Dernière mise à jour',
    },
    en: {
      title: 'Legal notice',
      intro: 'Website and virtual assistant "Kim" of the Alassane Ouattara Ivorian-Korean Sports, Cultural and ICT Centre (CSCTICAO).',
      sections: [
        ['Publisher', 'CSCTICAO — Alassane Ouattara Ivorian-Korean Sports, Cultural and ICT Centre, Côte d\'Ivoire. Publication director: Patrice REMARCK, Director General.'],
        ['Hosting', 'Site: Render Services, Inc. (United States). Database: Supabase, Inc. Images: Cloudinary Ltd.'],
        ['Virtual assistant', 'Kim is an artificial-intelligence assistant. It can make mistakes: official information and validations (bookings, registrations) remain those of the Centre\'s team. Kim never confirms a request.'],
        ['Personal data', 'See the privacy policy.'],
      ],
      contact: 'Contact', noContact: 'Contact details will appear here once they have been entered in the administration.', updated: 'Last updated',
    },
    ko: {
      title: '법적 고지',
      intro: '알라산 와타라 코트디부아르-한국 스포츠·문화·ICT 센터(CSCTICAO)의 웹사이트 및 가상 비서 "Kim".',
      sections: [
        ['발행자', 'CSCTICAO — 알라산 와타라 코트디부아르-한국 스포츠·문화·ICT 센터, 코트디부아르. 발행 책임자: Patrice REMARCK, 총괄 관장.'],
        ['호스팅', '사이트: Render Services, Inc.(미국). 데이터베이스: Supabase, Inc. 이미지: Cloudinary Ltd.'],
        ['가상 비서', 'Kim은 인공지능 기반 비서로 오류가 있을 수 있습니다. 공식 정보와 승인(예약, 등록)은 센터 직원이 최종 결정하며 Kim은 어떤 요청도 확정하지 않습니다.'],
        ['개인정보', '개인정보 처리방침을 참조하세요.'],
      ],
      contact: '연락처', noContact: '관리자 화면에 연락처가 입력되면 여기에 표시됩니다.', updated: '최종 수정일',
    },
  },
};
