-- ============================================================
-- KIM / CSCTICAO - Migration 001 : tables opérationnelles (TDR §4)
-- Aucune donnée n'est insérée : salles, formations et informations du Centre
-- sont saisies par l'administration depuis l'interface /admin.
-- Cible : PostgreSQL (Supabase). Les clés étrangères sont réellement appliquées ;
--        les valeurs de statut restent validées côté backend (services).
-- ============================================================

-- 4.1 USERS -------------------------------------------------
CREATE TABLE IF NOT EXISTS USERS (
  ID            VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  FULL_NAME     VARCHAR(150)  NOT NULL,
  EMAIL         VARCHAR(255)  NOT NULL UNIQUE,
  PASSWORD_HASH VARCHAR(255)  NOT NULL,            -- bcrypt
  ROLE          VARCHAR(30)   NOT NULL,            -- Administrateur | Agent du Centre | Visiteur
  CREATED_AT    TIMESTAMPTZ   DEFAULT NOW()
);

-- 4.2 ROOMS -------------------------------------------------
CREATE TABLE IF NOT EXISTS ROOMS (
  ID            VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  NAME          VARCHAR(150)  NOT NULL,
  SPACE_TYPE    VARCHAR(80)   NOT NULL,
  MAX_CAPACITY  INTEGER     ,
  EQUIPMENT     JSONB,                             -- ex: ["vidéoprojecteur","sonorisation","climatisation","accès PMR"]
  DESCRIPTION   VARCHAR(2000),
  PRICING       VARCHAR(500),                      -- tarif indicatif ou conditions d'accès
  STATUS        VARCHAR(30)   NOT NULL DEFAULT 'Disponible'  -- Disponible | En maintenance
);

-- 4.3 ACTIVITIES --------------------------------------------
CREATE TABLE IF NOT EXISTS ACTIVITIES (
  ID               VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  TITLE            VARCHAR(200)  NOT NULL,
  CATEGORY         VARCHAR(30)   NOT NULL,         -- Sport | TIC | Langue | Culture
  AGE_MIN          SMALLINT    ,
  AGE_MAX          SMALLINT    ,
  AGE_RANGE_LABEL  VARCHAR(80),
  TOTAL_SEATS      INTEGER     ,                    -- NULL = quota non défini (saisi depuis l'espace administration)
  ASSIGNED_SEATS   INTEGER        NOT NULL DEFAULT 0,
  DESCRIPTION      VARCHAR(4000),
  SCHEDULE         VARCHAR(500)                    -- jours et horaires des sessions
);

-- 4.4 ROOM_REQUESTS -----------------------------------------
CREATE TABLE IF NOT EXISTS ROOM_REQUESTS (
  ID                 VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  REQUESTER_LASTNAME VARCHAR(100)  NOT NULL,
  REQUESTER_FIRSTNAME VARCHAR(100) NOT NULL,
  EMAIL              VARCHAR(255)  NOT NULL,
  PHONE              VARCHAR(40)   NOT NULL,
  ROOM_ID            VARCHAR(36)   NOT NULL REFERENCES ROOMS(ID),
  REQUESTED_DATE     DATE          NOT NULL,
  START_TIME         TIME          NOT NULL,
  END_TIME           TIME          NOT NULL,
  ATTENDEES          INTEGER        NOT NULL,
  EXTRA_EQUIPMENT    JSONB,
  PURPOSE            VARCHAR(1000) NOT NULL,
  STATUS             VARCHAR(40)   NOT NULL DEFAULT 'En attente de validation humaine', -- | Validée | Refusée
  ADMIN_COMMENT      VARCHAR(1000),
  CREATED_AT         TIMESTAMPTZ   DEFAULT NOW()
);

-- 4.5 ACTIVITY_REGISTRATIONS --------------------------------
CREATE TABLE IF NOT EXISTS ACTIVITY_REGISTRATIONS (
  ID               VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  LASTNAME         VARCHAR(100)  NOT NULL,
  FIRSTNAME        VARCHAR(100)  NOT NULL,
  AGE              SMALLINT       NOT NULL,
  EMAIL            VARCHAR(255)  NOT NULL,
  PHONE            VARCHAR(40)   NOT NULL,
  ACTIVITY_ID      VARCHAR(36)   NOT NULL REFERENCES ACTIVITIES(ID),
  CURRENT_LEVEL    VARCHAR(100),
  STATUS           VARCHAR(40)   NOT NULL DEFAULT 'En attente de validation humaine', -- | Confirmée | Liste d'attente | Refusée
  SUBMITTED_AT     TIMESTAMPTZ   DEFAULT NOW()
);

-- 4.6 PARTNERSHIP_REQUESTS ----------------------------------
CREATE TABLE IF NOT EXISTS PARTNERSHIP_REQUESTS (
  ID               VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  ORGANIZATION     VARCHAR(200)  NOT NULL,
  CONTACT_NAME     VARCHAR(150)  NOT NULL,
  EMAIL            VARCHAR(255)  NOT NULL,
  PHONE            VARCHAR(40),
  PARTNERSHIP_TYPE VARCHAR(30)   NOT NULL,         -- Technique | Financier | Événementiel | Pédagogique
  DESCRIPTION      VARCHAR(4000) NOT NULL,
  STATUS           VARCHAR(30)   NOT NULL DEFAULT 'Nouveau',  -- | En cours d'étude | Traité | Archivé
  RECEIVED_AT      TIMESTAMPTZ   DEFAULT NOW()
);

-- 4.7 CHAT_LOGS ---------------------------------------------
CREATE TABLE IF NOT EXISTS CHAT_LOGS (
  ID                 VARCHAR(36)   DEFAULT gen_random_uuid()::text PRIMARY KEY,
  SESSION_ID         VARCHAR(64)   NOT NULL,
  USER_MESSAGE       VARCHAR(8000) NOT NULL,
  KIM_RESPONSE       VARCHAR(16000),
  DETECTED_LANGUAGE  VARCHAR(10),                  -- fr | en | ko
  CITED_SOURCE       VARCHAR(500),
  NEEDS_HUMAN        BOOLEAN       DEFAULT FALSE,
  CREATED_AT         TIMESTAMPTZ   DEFAULT NOW()
);
