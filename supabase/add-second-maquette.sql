-- Ajoute une deuxieme maquette active dans l'Atelier.
-- A adapter si vous voulez un autre titre ou un autre chemin de fichier audio.
--
-- Prerequis :
-- 1. Une saison active doit exister dans public.atelier_seasons
-- 2. Le fichier audio doit etre present dans le bucket prive "atelier-audio"
--
-- Fichier detecte actuellement dans le bucket :
-- - season-1/track02.mp3

insert into public.atelier_tracks (season_id, title, storage_path, status, influence_mode)
select
  s.id,
  'Cosmos',
  'season-1/track02.mp3',
  'active',
  'open'
from public.atelier_seasons s
where s.status = 'active'
and not exists (
  select 1
  from public.atelier_tracks t
  where t.storage_path = 'season-1/track02.mp3'
);

-- Verification rapide
select id, title, storage_path, status, created_at
from public.atelier_tracks
where status = 'active'
order by created_at desc;
