-- ============================================================
-- KIM / CSCTICAO - Migration 011 : présentation des services par Kim, vidéos, suggestions du chat
-- PRESENTATION_SLIDES : une diapositive par salle / formation (créée automatiquement) ou personnalisée.
--   AI_TEXT = texte rédigé par Kim ; ADMIN_TEXT = correction de l'administration (remplace AI_TEXT) ;
--   ADDITIVE = complément ajouté à la fin. Le texte affiché = (ADMIN_TEXT ou AI_TEXT) + ADDITIVE.
-- PROMO_VIDEOS : vidéos de présentation / récap du Centre (liens YouTube, Vimeo ou fichier vidéo).
-- CHAT_SUGGESTIONS : suggestions affichées à l'ouverture du chat.
-- Exécutée une seule fois : les suggestions de départ, ensuite modifiées ou supprimées depuis /admin, ne reviennent jamais.
-- ============================================================

CREATE TABLE IF NOT EXISTS PRESENTATION_SLIDES (
  ID               VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  KIND             VARCHAR(20)   NOT NULL CHECK (KIND IN ('room', 'activity', 'custom')),
  REF_ID           VARCHAR(36),
  TITLE            VARCHAR(200),
  IMAGE_URL        VARCHAR(500),
  AI_TEXT          VARCHAR(2000),
  AI_GENERATED_AT  TIMESTAMPTZ,
  ADMIN_TEXT       VARCHAR(2000),
  ADDITIVE         VARCHAR(1000),
  ACTION_TYPE      VARCHAR(20)   NOT NULL DEFAULT 'contact' CHECK (ACTION_TYPE IN ('reserve', 'register', 'contact', 'partner', 'link', 'none')),
  ACTION_LABEL     VARCHAR(80),
  ACTION_URL       VARCHAR(500),
  SORT_ORDER       INTEGER       NOT NULL DEFAULT 100,
  IS_PUBLISHED     BOOLEAN       NOT NULL DEFAULT TRUE,
  SHOWN_COUNT      INTEGER       NOT NULL DEFAULT 0,
  LAST_SHOWN_AT    TIMESTAMPTZ,
  UPDATED_AT       TIMESTAMPTZ   DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS UQ_PRESENTATION_SLIDES_REF ON PRESENTATION_SLIDES (KIND, REF_ID) WHERE REF_ID IS NOT NULL;

CREATE TABLE IF NOT EXISTS PROMO_VIDEOS (
  ID            VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  TITLE         VARCHAR(200)  NOT NULL,
  DESCRIPTION   VARCHAR(2000),
  VIDEO_URL     VARCHAR(500)  NOT NULL,
  SORT_ORDER    INTEGER       NOT NULL DEFAULT 100,
  IS_PUBLISHED  BOOLEAN       NOT NULL DEFAULT TRUE,
  CREATED_AT    TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS CHAT_SUGGESTIONS (
  ID            VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  LABEL         VARCHAR(120)  NOT NULL,
  LABEL_EN      VARCHAR(120),
  LABEL_KO      VARCHAR(120),
  MESSAGE       VARCHAR(500),
  ACTION_TYPE   VARCHAR(20)   NOT NULL DEFAULT 'message'
                CHECK (ACTION_TYPE IN ('message', 'presentation', 'videos', 'form_room', 'form_register', 'form_partner', 'agent')),
  SORT_ORDER    INTEGER       NOT NULL DEFAULT 100,
  IS_PUBLISHED  BOOLEAN       NOT NULL DEFAULT TRUE
);

ALTER TABLE PRESENTATION_SLIDES ENABLE ROW LEVEL SECURITY;
ALTER TABLE PROMO_VIDEOS        ENABLE ROW LEVEL SECURITY;
ALTER TABLE CHAT_SUGGESTIONS    ENABLE ROW LEVEL SECURITY;

-- Suggestions de départ (modifiables et supprimables depuis /admin), uniquement si la table est vide.
INSERT INTO CHAT_SUGGESTIONS (LABEL, LABEL_EN, LABEL_KO, ACTION_TYPE, SORT_ORDER)
SELECT seed.LABEL, seed.LABEL_EN, seed.LABEL_KO, seed.ACTION_TYPE, seed.SORT_ORDER
FROM (VALUES
  ($$Présentez-moi vos services$$,    $$Show me your services$$,        $$서비스를 소개해 주세요$$,        'presentation',  10),
  ($$Réserver une salle$$,            $$Book a room$$,                  $$시설 예약$$,                      'form_room',     20),
  ($$Me pré-inscrire à une formation$$, $$Pre-register for a course$$,  $$교육 사전 등록$$,                 'form_register', 30),
  ($$Quels sont vos horaires ?$$,     $$What are your opening hours?$$, $$운영 시간이 어떻게 되나요?$$,   'message',       40),
  ($$Parler à un agent$$,             $$Talk to an agent$$,             $$상담원과 대화$$,                  'agent',         50)
) AS seed(LABEL, LABEL_EN, LABEL_KO, ACTION_TYPE, SORT_ORDER)
WHERE NOT EXISTS (SELECT 1 FROM CHAT_SUGGESTIONS);
