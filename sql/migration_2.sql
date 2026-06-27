-- ============================================
-- Script de MIGRATION n°2
-- Pour la mise à jour "vérification automatique des nouvelles saisons"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

alter table titles add column if not exists tmdb_id int;
alter table titles add column if not exists new_season_available boolean not null default false;
