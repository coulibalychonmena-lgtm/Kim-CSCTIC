-- ============================================================
-- KIM / CSCTICAO - Migration 013 : escalade sur accord, quota anonyme, connexion Google, FAQ sans quota
-- Idempotente : peut être rejouée sans risque. Aucune donnée n'est insérée.
-- ============================================================

-- Suivi des échanges : accord d'escalade, catégorie du message, compteurs de quota (côté serveur), source FAQ
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS AGENT_OFFERED      BOOLEAN     NOT NULL DEFAULT FALSE;  -- Kim a proposé de transmettre à un agent
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS ESCALATION_REASON  VARCHAR(30);                          -- button | explicit_request | accepted_offer | model_flag
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS REQUEST_CATEGORY   VARCHAR(20);                          -- on_topic | out_of_base | off_topic | malicious
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS CLIENT_HASH        VARCHAR(64);                          -- empreinte salée de l'IP (jamais l'IP)
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS DEVICE_ID          VARCHAR(64);                          -- identifiant d'appareil du navigateur
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS USER_ID            VARCHAR(36);                          -- compte connecté, sinon NULL (anonyme)
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS FROM_FAQ           BOOLEAN     NOT NULL DEFAULT FALSE;   -- réponse servie sans modèle : hors quota
CREATE INDEX IF NOT EXISTS IDX_CHAT_LOGS_SESSION ON CHAT_LOGS (SESSION_ID, CREATED_AT);
CREATE INDEX IF NOT EXISTS IDX_CHAT_LOGS_DEVICE  ON CHAT_LOGS (DEVICE_ID, CREATED_AT);
CREATE INDEX IF NOT EXISTS IDX_CHAT_LOGS_CLIENT  ON CHAT_LOGS (CLIENT_HASH, CREATED_AT);
CREATE INDEX IF NOT EXISTS IDX_CHAT_LOGS_USER    ON CHAT_LOGS (USER_ID, CREATED_AT);

-- Connexion avec Google : pas de mot de passe pour ces comptes ; l'e-mail est déjà vérifié par Google
ALTER TABLE USERS ALTER COLUMN PASSWORD_HASH DROP NOT NULL;
ALTER TABLE USERS ADD COLUMN IF NOT EXISTS GOOGLE_SUB      VARCHAR(64);
ALTER TABLE USERS ADD COLUMN IF NOT EXISTS EMAIL_VERIFIED  BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS UQ_USERS_GOOGLE_SUB ON USERS (GOOGLE_SUB) WHERE GOOGLE_SUB IS NOT NULL;

-- Suggestions « FAQ » : horaires et contact servis depuis la base, sans modèle, hors quota
DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'chat_suggestions'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%action_type%'
  LOOP
    EXECUTE format('ALTER TABLE CHAT_SUGGESTIONS DROP CONSTRAINT %I', constraint_name);
  END LOOP;
  ALTER TABLE CHAT_SUGGESTIONS ADD CONSTRAINT CHAT_SUGGESTIONS_ACTION_TYPE_CHECK
    CHECK (ACTION_TYPE IN ('message', 'presentation', 'videos', 'form_room', 'form_register', 'form_partner', 'agent', 'faq_hours', 'faq_contact'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- La suggestion de départ « Quels sont vos horaires ? » (jamais modifiée) devient une réponse FAQ gratuite
UPDATE CHAT_SUGGESTIONS SET ACTION_TYPE = 'faq_hours'
WHERE ACTION_TYPE = 'message' AND LABEL = 'Quels sont vos horaires ?' AND MESSAGE IS NULL;
