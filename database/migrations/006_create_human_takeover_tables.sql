-- ============================================================
-- KIM / CSCTICAO - Migration 006 : reprise en main d'une conversation par un agent
-- CHAT_TAKEOVERS : une ligne = conversation reprise (Kim ne répond plus tant qu'elle existe)
-- HUMAN_MESSAGES : messages écrits par l'agent, relus par le chat du visiteur
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS CHAT_TAKEOVERS (
  SESSION_ID  VARCHAR(64)   PRIMARY KEY,
  STARTED_AT  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS HUMAN_MESSAGES (
  ID          VARCHAR(36)   DEFAULT UUID_STRING() PRIMARY KEY,
  SESSION_ID  VARCHAR(64)   NOT NULL,
  MESSAGE     VARCHAR(4000) NOT NULL,
  CREATED_AT  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
