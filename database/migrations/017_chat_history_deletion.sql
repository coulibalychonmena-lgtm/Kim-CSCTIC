-- ============================================================
-- KIM / CSCTICAO - Migration 017 : historique des conversations supprimable par le visiteur
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

-- Supprimer une conversation efface son CONTENU (messages, réponses, sources) mais conserve la ligne technique anonymisée
-- (date, compteurs) : le quota anonyme et le plafond par réseau reposent sur ces compteurs et ne doivent pas être contournables.
ALTER TABLE CHAT_LOGS ADD COLUMN IF NOT EXISTS DELETED_AT TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS IDX_CHAT_LOGS_VISIBLE ON CHAT_LOGS (DEVICE_ID, CREATED_AT) WHERE DELETED_AT IS NULL;
