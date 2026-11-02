-- ============================================================
-- KIM / CSCTICAO - Migration 012 : cache des traductions automatiques
-- Tout texte saisi par l'administration (en français) est traduit automatiquement par Kim pour les visiteurs.
-- La clé est l'empreinte du texte d'origine : si l'administration modifie un texte, l'ancienne traduction
-- n'est plus utilisée et la nouvelle est produite automatiquement. Aucune donnée insérée ici.
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

CREATE TABLE IF NOT EXISTS CONTENT_TRANSLATIONS (
  SOURCE_HASH  VARCHAR(64)  NOT NULL,
  LANGUAGE     VARCHAR(5)   NOT NULL,
  TRANSLATION  TEXT         NOT NULL,
  CREATED_AT   TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (SOURCE_HASH, LANGUAGE)
);

ALTER TABLE CONTENT_TRANSLATIONS ENABLE ROW LEVEL SECURITY;
