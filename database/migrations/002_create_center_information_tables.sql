-- ============================================================
-- KIM / CSCTICAO - Migration 002 : informations du Centre connues de Kim
-- CENTER_INFORMATION : contacts, missions, vision, présentation... (une ligne = un
--                      sujet que Kim peut citer, avec sa source officielle)
-- OPENING_HOURS      : horaires d'ouverture (1 = lundi ... 7 = dimanche ;
--                      un jour sans ligne = Centre fermé ce jour-là)
-- Ces tables sont créées VIDES : tout le contenu est saisi et modifié par
-- l'administration depuis l'interface, sans intervention sur le code.
-- ============================================================

CREATE TABLE IF NOT EXISTS CENTER_INFORMATION (
  ID            VARCHAR(36)   DEFAULT UUID_STRING() PRIMARY KEY,
  CATEGORY      VARCHAR(40)   NOT NULL,            -- ex : institution, contact, salles (texte libre)
  TITLE         VARCHAR(200)  NOT NULL,
  CONTENT       VARCHAR(4000) NOT NULL,
  SOURCE_LABEL  VARCHAR(200),
  SOURCE_URL    VARCHAR(500),
  UPDATED_AT    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS OPENING_HOURS (
  DAY_OF_WEEK   NUMBER(1,0)   PRIMARY KEY,
  OPEN_TIME     TIME          NOT NULL,
  CLOSE_TIME    TIME          NOT NULL
);
