-- ============================================================
-- KIM / CSCTICAO - Migration 005 : conditions d'inscription et message de l'administration
-- ACTIVITIES.ENROLLMENT_CONDITIONS : niveau requis, adhésion, prérequis (texte libre,
--                                    lu par Kim et affiché à l'admin pour vérification)
-- ACTIVITY_REGISTRATIONS.ADMIN_COMMENT : message joint à la validation ou au refus
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

ALTER TABLE ACTIVITIES ADD COLUMN IF NOT EXISTS ENROLLMENT_CONDITIONS VARCHAR(1000);

ALTER TABLE ACTIVITY_REGISTRATIONS ADD COLUMN IF NOT EXISTS ADMIN_COMMENT VARCHAR(1000);
