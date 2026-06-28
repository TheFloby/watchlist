-- ============================================
-- Script de MIGRATION n°7
-- Pour la mise à jour "films pas encore sortis en salle"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

alter table titles add column if not exists release_date date;
