-- ============================================
-- Script de création de la base de données
-- Watchlist TFCU
-- ============================================
-- Si tu avais déjà lancé une ancienne version de ce script,
-- exécute d'abord : drop table if exists titles cascade;

create table if not exists titles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  type text not null check (type in ('serie', 'serie_animee', 'film', 'manga')),

  -- Statut dans le workflow :
  -- proposition -> refusee | a_voir -> en_cours -> vu | jamais_fini
  status text not null check (
    status in ('proposition', 'refusee', 'a_voir', 'en_cours', 'vu', 'jamais_fini')
  ) default 'proposition',

  -- Nombre total de saisons (rempli automatiquement via TMDB pour les séries/séries animées)
  total_seasons int,

  -- Saison actuelle (où on s'est arrêté). Conservée même si on abandonne (jamais_fini),
  -- pour pouvoir reprendre exactement où on en était.
  current_season int,

  -- Identifiant TMDB de la série (permet de revérifier le nombre de saisons plus tard).
  -- Vide pour les films, mangas, ou séries ajoutées à la main.
  tmdb_id int,

  -- Vrai si une nouvelle saison est sortie depuis qu'on a marqué le titre "Terminé"
  -- (détecté automatiquement une fois par jour, voir /api/check-new-seasons)
  new_season_available boolean not null default false,

  -- Date de sortie d'une prochaine saison ANNONCÉE mais pas encore diffusée
  -- (ex: TMDB sait qu'une saison 10 existe et sortira le 12/09, mais elle n'est pas
  -- encore disponible). Différent de new_season_available, qui lui veut dire que la
  -- saison est déjà sortie et prête à être regardée.
  upcoming_season_date date,
  upcoming_season_number int,

  -- Qui a ajouté/proposé ce titre
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
