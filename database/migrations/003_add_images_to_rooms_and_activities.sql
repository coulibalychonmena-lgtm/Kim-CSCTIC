-- ============================================================
-- KIM / CSCTICAO - Migration 003 : photos des salles et des formations
-- IMAGE_URL : adresse https de l'image hébergée sur Cloudinary
--             (envoyée par l'administration depuis /admin).
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

ALTER TABLE ROOMS ADD COLUMN IF NOT EXISTS IMAGE_URL VARCHAR(500);

ALTER TABLE ACTIVITIES ADD COLUMN IF NOT EXISTS IMAGE_URL VARCHAR(500);
