-- ============================================
-- Script de création de la base de données
-- Series Tracker
-- ============================================

-- Table principale : toutes les séries/films/mangas
create table if not exists titles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  type text not null check (type in ('serie', 'serie_animee', 'film', 'manga')),
  status text not null check (status in ('a_voir', 'en_cours', 'vu')) default 'a_voir',
  added_by uuid references auth.users(id) on delete set null,
  added_by_email text,
  created_at timestamp with time zone default now()
);

-- Active la Row Level Security (obligatoire pour la sécurité avec Supabase Auth)
alter table titles enable row level security;

-- Politique : tous les utilisateurs connectés peuvent tout lire
create policy "Les utilisateurs connectés peuvent tout voir"
on titles for select
to authenticated
using (true);

-- Politique : tous les utilisateurs connectés peuvent ajouter
create policy "Les utilisateurs connectés peuvent ajouter"
on titles for insert
to authenticated
with check (true);

-- Politique : tous les utilisateurs connectés peuvent modifier (changer le statut, etc.)
create policy "Les utilisateurs connectés peuvent modifier"
on titles for update
to authenticated
using (true);

-- Politique : tous les utilisateurs connectés peuvent supprimer
create policy "Les utilisateurs connectés peuvent supprimer"
on titles for delete
to authenticated
using (true);
