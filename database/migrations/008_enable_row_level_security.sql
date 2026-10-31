-- ============================================================
-- KIM / CSCTICAO - Migration 008 : sécurité Supabase (Row Level Security)
-- Supabase expose automatiquement les tables du schéma « public » via une API REST
-- publique (clé « anon »). Sans RLS, n'importe qui pourrait lire ou modifier les
-- données (demandes, conversations, e-mails, téléphones...).
-- RLS activé SANS aucune règle = l'API publique Supabase est totalement bloquée.
-- Le backend Kim se connecte directement à PostgreSQL (DATABASE_URL) avec un rôle
-- qui contourne RLS : il continue de fonctionner normalement.
-- Idempotente : peut être rejouée sans risque.
-- ============================================================

ALTER TABLE USERS                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ROOMS                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ACTIVITIES             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ROOM_REQUESTS          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ACTIVITY_REGISTRATIONS ENABLE ROW LEVEL SECURITY;
ALTER TABLE PARTNERSHIP_REQUESTS   ENABLE ROW LEVEL SECURITY;
ALTER TABLE CHAT_LOGS              ENABLE ROW LEVEL SECURITY;
ALTER TABLE CENTER_INFORMATION     ENABLE ROW LEVEL SECURITY;
ALTER TABLE OPENING_HOURS          ENABLE ROW LEVEL SECURITY;
ALTER TABLE CHAT_TAKEOVERS         ENABLE ROW LEVEL SECURITY;
ALTER TABLE HUMAN_MESSAGES         ENABLE ROW LEVEL SECURITY;
