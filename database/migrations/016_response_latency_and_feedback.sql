-- ============================================================
-- KIM / CSCTICAO - Migration 016 : latence des réponses et retours des visiteurs (pouce haut / bas)
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS RESPONSE_MS INTEGER;   -- temps de génération de la réponse (indicateur p95)

CREATE TABLE IF NOT EXISTS CHAT_FEEDBACK (
  ID          VARCHAR(36)  DEFAULT gen_random_uuid()::text PRIMARY KEY,
  CHAT_LOG_ID VARCHAR(36)  NOT NULL REFERENCES CHAT_LOGS(ID) ON DELETE CASCADE,
  SESSION_ID  VARCHAR(64)  NOT NULL,
  RATING      SMALLINT     NOT NULL CHECK (RATING IN (-1, 1)),      -- 1 = pouce haut, -1 = pouce bas
  CREATED_AT  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (CHAT_LOG_ID, SESSION_ID)                                  -- un seul avis par réponse et par session (modifiable)
);
CREATE INDEX IF NOT EXISTS IDX_CHAT_FEEDBACK_CREATED ON CHAT_FEEDBACK (CREATED_AT);
ALTER TABLE CHAT_FEEDBACK ENABLE ROW LEVEL SECURITY;
