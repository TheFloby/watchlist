-- ============================================
-- Script de MIGRATION n°8
-- Pour la mise à jour "journal d'activité caché"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  action text not null,
  title_name text not null,
  details text,
  created_at timestamp with time zone default now()
);

alter table activity_log enable row level security;

create policy "Les utilisateurs connectés peuvent voir le journal"
on activity_log for select
to authenticated
using (true);

create policy "Les utilisateurs connectés peuvent ajouter au journal"
on activity_log for insert
to authenticated
with check (true);
