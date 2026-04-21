-- Renomme la premiere maquette pour remplacer l'ancien titre technique.

update public.atelier_tracks
set title = 'En bas'
where storage_path = 'season-1/track01.m4a'
  and title <> 'En bas';

-- Verification rapide
select id, title, storage_path, status, created_at
from public.atelier_tracks
where storage_path in ('season-1/track01.m4a', 'season-1/track02.mp3')
order by created_at desc;
