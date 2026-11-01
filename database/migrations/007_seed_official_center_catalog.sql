-- ============================================================
-- KIM / CSCTICAO - Migration 007 : catalogue officiel de départ (TDR §2)
-- Uniquement ce que le TDR et le site du Centre établissent : horaires, missions, vision, 6 espaces,
-- 5 formations et activités. Rien n'est inventé : capacités, places, âges, horaires de
-- sessions, tarifs et contacts restent à saisir par l'administration depuis /admin.
-- Exécutée UNE SEULE FOIS (suivi par `npm run migrate`) : ce qui est ensuite modifié ou supprimé
-- depuis /admin n'est jamais recréé ni écrasé.
-- ============================================================

INSERT INTO OPENING_HOURS (DAY_OF_WEEK, OPEN_TIME, CLOSE_TIME)
SELECT * FROM (
  SELECT 1::smallint AS DAY_OF_WEEK, '08:00'::time AS OPEN_TIME, '18:00'::time AS CLOSE_TIME
  UNION ALL SELECT 2, '08:00'::time, '18:00'::time
  UNION ALL SELECT 3, '08:00'::time, '18:00'::time
  UNION ALL SELECT 4, '08:00'::time, '18:00'::time
  UNION ALL SELECT 5, '08:00'::time, '18:00'::time
  UNION ALL SELECT 6, '09:00'::time, '13:00'::time
) AS DEFAULT_HOURS
WHERE NOT EXISTS (SELECT 1 FROM OPENING_HOURS);

INSERT INTO CENTER_INFORMATION (CATEGORY, TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL)
SELECT 'institution', 'Missions du Centre',
  $$Promouvoir la pratique sportive (notamment le Taekwondo et le sport pour tous), diffuser les technologies de l'information et de la communication (TIC) auprès des jeunes et renforcer la coopération culturelle entre la Côte d'Ivoire et la République de Corée.$$,
  'Site officiel du CSCTICAO', 'https://cscticao.ci'
WHERE NOT EXISTS (SELECT 1 FROM CENTER_INFORMATION WHERE TITLE = 'Missions du Centre');

INSERT INTO CENTER_INFORMATION (CATEGORY, TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL)
SELECT 'institution', 'Vision du Centre',
  $$Servir de pôle d'excellence d'insertion socioprofessionnelle, de promotion de la jeunesse et d'échange interculturel.$$,
  'Site officiel du CSCTICAO', 'https://cscticao.ci'
WHERE NOT EXISTS (SELECT 1 FROM CENTER_INFORMATION WHERE TITLE = 'Vision du Centre');

INSERT INTO ROOMS (NAME, SPACE_TYPE, EQUIPMENT, STATUS)
SELECT seed.NAME, seed.SPACE_TYPE, '[]'::jsonb, 'Disponible'
FROM (VALUES
  ($$Le Gymnase$$, $$Sport et événements$$),
  ($$La salle polyvalente$$, $$Polyvalente$$),
  ($$La salle multimédia$$, $$Multimédia$$),
  ($$La bibliothèque$$, $$Bibliothèque$$),
  ($$L'espace parking$$, $$Espace extérieur$$),
  ($$Salle de classe$$, $$Salle de classe$$)
) AS seed(NAME, SPACE_TYPE)
WHERE NOT EXISTS (SELECT 1 FROM ROOMS WHERE LOWER(NAME) = LOWER(seed.NAME));

INSERT INTO ACTIVITIES (TITLE, CATEGORY, AGE_RANGE_LABEL, DESCRIPTION)
SELECT $$Taekwondo (Initiation et Perfectionnement)$$, 'Sport', $$Enfants, adolescents et adultes$$,
  $$Initiation et perfectionnement au Taekwondo pour enfants, adolescents et adultes.$$
WHERE NOT EXISTS (SELECT 1 FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER($$Taekwondo (Initiation et Perfectionnement)$$));

INSERT INTO ACTIVITIES (TITLE, CATEGORY, DESCRIPTION)
SELECT $$Informatique de Base et Bureautique$$, 'TIC',
  $$Initiation à l'outil informatique, à la suite bureautique et à la navigation Internet.$$
WHERE NOT EXISTS (SELECT 1 FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER($$Informatique de Base et Bureautique$$));

INSERT INTO ACTIVITIES (TITLE, CATEGORY, AGE_RANGE_LABEL, DESCRIPTION)
SELECT $$Développement Web et Programmation Numérique$$, 'TIC', 'Jeunes',
  $$Apprentissage des bases du code et des métiers du numérique pour les jeunes.$$
WHERE NOT EXISTS (SELECT 1 FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER($$Développement Web et Programmation Numérique$$));

INSERT INTO ACTIVITIES (TITLE, CATEGORY, DESCRIPTION)
SELECT $$Cours de Langue et Culture Coréenne$$, 'Langue',
  $$Apprentissage du Hangeul, découverte des traditions et ateliers culturels.$$
WHERE NOT EXISTS (SELECT 1 FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER($$Cours de Langue et Culture Coréenne$$));

INSERT INTO ACTIVITIES (TITLE, CATEGORY, DESCRIPTION)
SELECT $$Ateliers et Hackathons Numériques (Hack for Humanity)$$, 'TIC',
  $$Événements technologiques et ateliers collaboratifs d'innovation.$$
WHERE NOT EXISTS (SELECT 1 FROM ACTIVITIES WHERE LOWER(TITLE) = LOWER($$Ateliers et Hackathons Numériques (Hack for Humanity)$$));
