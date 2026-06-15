alter table public.atelier_seasons
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0;

alter table public.atelier_tracks
  add column if not exists sort_order integer not null default 0;

insert into public.atelier_seasons (slug, title, description, status, sort_order)
values
  ('acte-i', 'ACTE I', 'Les morceaux du premier seuil.', 'active', 10),
  ('acte-ii', 'ACTE II', 'Les fragments qui arrivent.', 'active', 20)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

update public.atelier_tracks
set
  season_id = (select id from public.atelier_seasons where slug = 'acte-i'),
  sort_order = coalesce(sort_order, 0)
where not exists (
  select 1
  from public.atelier_seasons s
  where s.id = atelier_tracks.season_id
    and s.slug = 'acte-ii'
);

update public.atelier_tracks
set
  title = 'Vérité coupée',
  season_id = (select id from public.atelier_seasons where slug = 'acte-i'),
  status = 'active',
  sort_order = case when sort_order = 0 then 30 else sort_order end
where lower(title) in ('track 03', 'track03', 'track test 03')
   or storage_path ilike '%track03.%'
   or storage_path ilike '%track-03.%';

update public.atelier_tracks
set
  title = case
    when lower(title) in ('track01', 'track 01', 'track test 01') then 'Sous contrôle'
    else title
  end,
  season_id = (select id from public.atelier_seasons where slug = 'acte-ii'),
  status = 'active',
  sort_order = case when sort_order = 0 then 10 else sort_order end
where lower(title) in ('sous contrôle', 'sous controle')
   or storage_path ilike '%acte-ii%track01%'
   or storage_path ilike '%acte_ii%track01%'
   or storage_path ilike '%acte2%track01%'
   or storage_path ilike '%acte-2%track01%'
   or storage_path ilike '%season-2/track01%'
   or storage_path ilike '%season-2\\track01%';
