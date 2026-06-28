-- ============================================
-- Script de MIGRATION n°4
-- Pour la mise à jour "système de notation et fiche détaillée"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

-- Nouvelle colonne sur titles
alter table titles add column if not exists has_been_in_progress boolean not null default false;

-- Pour les titres déjà en base : on marque comme "déjà en cours" tout ce qui est
-- actuellement en_cours, vu, ou jamais_fini (puisque par définition ils ont forcément
-- été en cours à un moment donné).
update titles
set has_been_in_progress = true
where status in ('en_cours', 'vu', 'jamais_fini');

-- Nouvelle table des notes/avis
create table if not exists ratings (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references titles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  score numeric(3,1) not null check (score >= 0.5 and score <= 10),
  comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (title_id, user_email)
);

alter table ratings enable row level security;

create policy "Les utilisateurs connectés peuvent voir toutes les notes"
on ratings for select
to authenticated
using (true);

create policy "Chacun peut ajouter sa propre note"
on ratings for insert
to authenticated
with check (true);

create policy "Chacun peut modifier sa propre note"
on ratings for update
to authenticated
using (true);

create policy "Chacun peut supprimer sa propre note"
on ratings for delete
to authenticated
using (true);
