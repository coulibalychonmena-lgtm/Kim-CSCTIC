-- ============================================================
-- KIM / CSCTICAO - Migration 004 : mot de bienvenue du Directeur Général
-- Texte officiel fourni par le Centre. Il est inséré une seule fois
-- (rien n'est réécrit s'il existe déjà) puis reste modifiable par
-- l'administration depuis l'onglet « Informations et horaires ».
-- Affiché sur la page d'accueil (rubrique « direction ») et connu de Kim.
-- ============================================================

INSERT INTO CENTER_INFORMATION (CATEGORY, TITLE, CONTENT, SOURCE_LABEL, SOURCE_URL)
SELECT 'direction', 'Mot du Directeur Général', $$Chers partenaires, amis,

C'est avec une immense joie que je vous souhaite la bienvenue sur le site web du Centre Sportif, Culturel et des TIC Ivoiro-Coréen Alassane OUATTARA (CSCTICAO). Ce centre est né de la volonté de renforcer la coopération entre la Côte d'Ivoire et la Corée du Sud dans les domaines du sport, de la culture et des technologies de l'information et de la communication.

Notre ambition est de créer un espace de rencontre pour les jeunes ivoiriens et coréens, afin de favoriser les échanges culturels et sportifs entre nos deux pays, et de promouvoir le développement des technologies de l'information et de la communication en Côte d'Ivoire.

Nous sommes fiers de pouvoir offrir à nos partenaires des installations modernes et confortables pour la pratique du sport, de même que des espaces culturels pour la découverte et la promotion de la culture coréenne et ivoirienne ; sans oublier les équipements de pointe pour l'apprentissage des technologies de l'information et de la communication.

Nous espérons que le CSCTICAO deviendra un lieu de référence pour les jeunes ivoiriens et coréens, et que grâce à notre coopération, nous pourrons contribuer au développement harmonieux de nos deux pays.

Bien cordialement,
Patrice REMARCK - Directeur Général$$, 'Site officiel du CSCTICAO', 'https://cscticao.ci'
WHERE NOT EXISTS (SELECT 1 FROM CENTER_INFORMATION WHERE CATEGORY = 'direction' AND TITLE = 'Mot du Directeur Général');
