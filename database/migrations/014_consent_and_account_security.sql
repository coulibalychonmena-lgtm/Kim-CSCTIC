-- ============================================================
-- KIM / CSCTICAO - Migration 014 : consentement (loi n° 2013-450), accord parental, jetons de compte
-- Idempotente : peut être rejouée sans risque. Aucune donnée n'est insérée.
-- ============================================================

-- Date du consentement donné au moment de l'envoi (NULL = demande antérieure à cette migration)
ALTER TABLE ROOM_REQUESTS          ADD COLUMN IF NOT EXISTS CONSENT_AT TIMESTAMPTZ;
ALTER TABLE ACTIVITY_REGISTRATIONS ADD COLUMN IF NOT EXISTS CONSENT_AT TIMESTAMPTZ;
ALTER TABLE PARTNERSHIP_REQUESTS   ADD COLUMN IF NOT EXISTS CONSENT_AT TIMESTAMPTZ;
ALTER TABLE USERS                  ADD COLUMN IF NOT EXISTS CONSENT_AT TIMESTAMPTZ;

-- Accord d'un parent ou tuteur pour un candidat mineur (< 18 ans)
ALTER TABLE ACTIVITY_REGISTRATIONS ADD COLUMN IF NOT EXISTS GUARDIAN_NAME    VARCHAR(150);
ALTER TABLE ACTIVITY_REGISTRATIONS ADD COLUMN IF NOT EXISTS GUARDIAN_CONSENT BOOLEAN NOT NULL DEFAULT FALSE;

-- Jetons à usage unique : réinitialisation du mot de passe et vérification de l'adresse e-mail.
-- Seule l'empreinte (SHA-256) du jeton est conservée ; le jeton lui-même n'est qu'envoyé par e-mail.
CREATE TABLE IF NOT EXISTS ACCOUNT_TOKENS (
  ID          VARCHAR(36)  DEFAULT gen_random_uuid()::text PRIMARY KEY,
  USER_ID     VARCHAR(36)  NOT NULL REFERENCES USERS(ID) ON DELETE CASCADE,
  PURPOSE     VARCHAR(20)  NOT NULL CHECK (PURPOSE IN ('reset_password', 'verify_email')),
  TOKEN_HASH  VARCHAR(64)  NOT NULL UNIQUE,
  EXPIRES_AT  TIMESTAMPTZ  NOT NULL,
  USED_AT     TIMESTAMPTZ,
  CREATED_AT  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS IDX_ACCOUNT_TOKENS_USER ON ACCOUNT_TOKENS (USER_ID, PURPOSE);
ALTER TABLE ACCOUNT_TOKENS ENABLE ROW LEVEL SECURITY;
