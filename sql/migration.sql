-- ============================================
-- Script de MIGRATION (si tu as déjà des titres en base)
-- À lancer une seule fois si tu avais déjà utilisé l'ancienne version du site
-- ============================================

-- Ajoute les nouvelles colonnes
alter table titles add column if not exists total_seasons int;
alter table titles add column if not exists current_season int;

-- Retire l'ancienne contrainte sur les statuts (qui ne permettait que a_voir/en_cours/vu)
alter table titles drop constraint if exists titles_status_check;

-- Convertit l'ancien statut "a_voir" (qui voulait dire "proposé") vers le nouveau workflow.
-- Comme on ne peut pas deviner qui aurait validé une ancienne proposition,
-- on bascule tout ce qui était "à voir" directement en "à voir" validé (pas en proposition).
-- Si tu préfères repartir de zéro, tu peux ignorer cette ligne et vider la table à la place.

-- Ajoute la nouvelle contrainte avec tous les statuts du nouveau workflow
alter table titles add constraint titles_status_check
  check (status in ('proposition', 'refusee', 'a_voir', 'en_cours', 'vu', 'jamais_fini'));
