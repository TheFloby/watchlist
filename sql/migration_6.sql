-- ============================================
-- Script de MIGRATION n°6
-- Pour la mise à jour "système de tri (alphabétique, note, date, type)"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

alter table titles add column if not exists tmdb_vote_average numeric(3,1);
alter table titles add column if not exists release_year int;
