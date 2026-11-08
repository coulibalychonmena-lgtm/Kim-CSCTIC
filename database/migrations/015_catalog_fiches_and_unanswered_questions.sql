-- ============================================================
-- KIM / CSCTICAO - Migration 015 : fiches standard salles et formations, questions sans réponse, corrections de contenu
-- Idempotente : peut être rejouée sans risque. N'insère aucune donnée métier (aucun tarif ni capacité inventés).
-- ============================================================

-- Fiche standard d'une salle : capacité (MAX_CAPACITY), équipements, tarif (PRICING) existent déjà ; on ajoute surface et conditions
ALTER TABLE ROOMS ADD COLUMN IF NOT EXISTS SURFACE_M2  NUMERIC(8,1);
ALTER TABLE ROOMS ADD COLUMN IF NOT EXISTS CONDITIONS  TEXT;

-- Fiche standard d'une formation : public/âge (AGE_*), jours et horaires (SCHEDULE) existent déjà ; on ajoute durée, prix, prérequis
ALTER TABLE ACTIVITIES ADD COLUMN IF NOT EXISTS DURATION       VARCHAR(100);
ALTER TABLE ACTIVITIES ADD COLUMN IF NOT EXISTS PRICE          VARCHAR(100);
ALTER TABLE ACTIVITIES ADD COLUMN IF NOT EXISTS PREREQUISITES  TEXT;

-- Questions auxquelles Kim n'a pas su répondre : liste de contenus à compléter chaque semaine
CREATE TABLE IF NOT EXISTS UNANSWERED_QUESTIONS (
  ID           VARCHAR(36)  DEFAULT gen_random_uuid()::text PRIMARY KEY,
  QUESTION_KEY VARCHAR(300) NOT NULL UNIQUE,   -- question normalisée (minuscules, sans ponctuation) : regroupe les doublons
  QUESTION     VARCHAR(2000) NOT NULL,         -- dernière formulation vue
  LANGUAGE     VARCHAR(5),
  OCCURRENCES  INTEGER      NOT NULL DEFAULT 1,
  STATUS       VARCHAR(20)  NOT NULL DEFAULT 'À compléter' CHECK (STATUS IN ('À compléter', 'Traité')),
  FIRST_SEEN   TIMESTAMPTZ  DEFAULT NOW(),
  LAST_SEEN    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS IDX_UNANSWERED_STATUS ON UNANSWERED_QUESTIONS (STATUS, OCCURRENCES DESC);
ALTER TABLE UNANSWERED_QUESTIONS ENABLE ROW LEVEL SECURITY;

-- Coquilles repérées dans les fiches (corrigées seulement si le texte exact est présent : sans effet sinon)
UPDATE ROOMS SET DESCRIPTION = REPLACE(DESCRIPTION, 'équipements nécessaire sur chaque box', 'équipements nécessaires sur chaque box')
WHERE DESCRIPTION LIKE '%équipements nécessaire sur chaque box%';
UPDATE ROOMS SET DESCRIPTION = REPLACE(DESCRIPTION, 'pour la recherche, formation, ... Avec', 'pour la recherche et la formation, avec')
WHERE DESCRIPTION LIKE '%pour la recherche, formation, ... Avec%';

-- Traductions déjà en cache qui disent « TIC Center » : supprimées pour être retraduites avec le glossaire (TIC → ICT, Centre → Centre)
DELETE FROM CONTENT_TRANSLATIONS WHERE LANGUAGE = 'en' AND TRANSLATION ~* '\mTIC Cent(er|re)';
DELETE FROM CONTENT_TRANSLATIONS WHERE LANGUAGE = 'en' AND TRANSLATION ~* '\mICT Center';
