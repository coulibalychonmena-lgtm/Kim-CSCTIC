-- ============================================================
-- KIM / CSCTICAO - Migration 009 : images d'arrière-plan de la page d'accueil
-- SITE_BACKGROUNDS : une ligne = un emplacement (hero, services, evenements)
--                    dont l'image est choisie par l'administration depuis /admin.
-- Sans ligne, le site affiche l'image par défaut fournie avec le frontend.
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS SITE_BACKGROUNDS (
  SLOT        VARCHAR(40)  PRIMARY KEY,
  IMAGE_URL   VARCHAR(500) NOT NULL,
  UPDATED_AT  TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE SITE_BACKGROUNDS ENABLE ROW LEVEL SECURITY;
