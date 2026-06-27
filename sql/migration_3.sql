-- ============================================
-- Script de MIGRATION n°3
-- Pour la mise à jour "date de sortie des prochaines saisons annoncées"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

alter table titles add column if not exists upcoming_season_date date;
alter table titles add column if not exists upcoming_season_number int;
