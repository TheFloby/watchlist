-- ============================================
-- Script de MIGRATION n°5
-- Pour la mise à jour "3 critères de notation + page dédiée"
-- À lancer une fois dans Supabase (SQL Editor → New query → Run)
-- ============================================

-- On ajoute les 3 nouvelles colonnes de notation détaillée.
alter table ratings add column if not exists score_general numeric(3,1);
alter table ratings add column if not exists score_scenario numeric(3,1);
alter table ratings add column if not exists score_personnages numeric(3,1);

-- Pour les notes déjà existantes (créées avec l'ancien système à 1 seule note "score"),
-- on reporte cette ancienne note sur les 3 nouveaux critères, pour ne rien perdre.
-- Si la colonne "score" n'existe pas (base jamais utilisée avec l'ancien système), cette
-- étape ne fait rien.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'ratings' and column_name = 'score') then
    update ratings
    set score_general = score, score_scenario = score, score_personnages = score
    where score_general is null;
  end if;
end $$;

-- On rend les 3 colonnes obligatoires maintenant qu'elles sont remplies, et on ajoute
-- les contraintes de validité (0.5 à 10, par pas de 0.5 grâce aux demi-étoiles).
alter table ratings alter column score_general set not null;
alter table ratings alter column score_scenario set not null;
alter table ratings alter column score_personnages set not null;

alter table ratings add constraint ratings_score_general_check check (score_general >= 0.5 and score_general <= 10);
alter table ratings add constraint ratings_score_scenario_check check (score_scenario >= 0.5 and score_scenario <= 10);
alter table ratings add constraint ratings_score_personnages_check check (score_personnages >= 0.5 and score_personnages <= 10);

-- On retire l'ancienne colonne "score" et son ancienne contrainte, devenue inutile.
alter table ratings drop column if exists score;
