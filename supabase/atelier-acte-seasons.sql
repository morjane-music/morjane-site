alter table public.atelier_seasons
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists sort_order integer not null default 0;

alter table public.atelier_tracks
  add column if not exists sort_order integer not null default 0;

insert into public.atelier_seasons (slug, title, description, status, sort_order)
values
  ('acte-i', 'ACTE I', 'Les morceaux du premier seuil.', 'active', 10),
  ('acte-ii', 'ACTE II', 'Les chansons qui arrivent.', 'active', 20)
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

with audio as (
  select name
  from storage.objects
  where bucket_id = 'atelier-audio'
    and (
      name ilike 'season-1/track01%'
      or name ilike 'acte-i/track01%'
      or name ilike 'acte_i/track01%'
      or name ilike 'acte i/track01%'
      or name ilike 'acte1/track01%'
      or name ilike 'acte 1/track01%'
      or name ilike 'acte-1/track01%'
      or name ilike 'acte_1/track01%'
      or name ilike '%en%bas%'
      or name ilike '%track01%'
      or name ilike '%track-01%'
      or name ilike '%track_01%'
    )
  order by
    case
      when name ilike '%en%bas%' then 0
      when name ilike 'acte i/track01%' then 1
      when name ilike 'acte-i/track01%' then 2
      when name ilike 'acte1/track01%' then 3
      when name ilike 'season-1/track01%' then 4
      else 5
    end,
    name
  limit 1
)
update public.atelier_tracks
set
  storage_path = audio.name,
  status = 'active',
  sort_order = case when sort_order = 0 then 10 else sort_order end
from audio
where lower(title) in ('en bas', 'track 01', 'track01', 'track test 01');

update public.atelier_tracks
set
  title = 'Vérité coupée',
  season_id = (select id from public.atelier_seasons where slug = 'acte-i'),
  status = 'active',
  sort_order = case when sort_order = 0 then 30 else sort_order end
where lower(title) in ('track 03', 'track03', 'track test 03', 'track 3', 'track3', 'track test 3', 'vérité coupée', 'verite coupee')
   or storage_path ilike '%track03.%'
   or storage_path ilike '%track-03.%'
   or storage_path ilike '%track_03.%'
   or storage_path ilike '%track 03.%';

with audio as (
  select name
  from storage.objects
  where bucket_id = 'atelier-audio'
    and (
      name ilike 'season-1/track02%'
      or name ilike 'acte-i/track02%'
      or name ilike 'acte_i/track02%'
      or name ilike 'acte i/track02%'
      or name ilike 'acte-1/track02%'
      or name ilike 'acte_1/track02%'
      or name ilike '%cosmos%'
      or name ilike '%track02%'
      or name ilike '%track-02%'
      or name ilike '%track_02%'
    )
  order by
    case
      when name ilike '%cosmos%' then 0
      when name ilike 'acte i/track02%' then 1
      when name ilike 'acte-i/track02%' then 2
      when name ilike 'season-1/track02%' then 3
      else 4
    end,
    name
  limit 1
)
update public.atelier_tracks
set
  storage_path = audio.name,
  status = 'active',
  sort_order = case when sort_order = 0 then 20 else sort_order end
from audio
where lower(title) = 'cosmos';

with acte_i as (
  select id from public.atelier_seasons where slug = 'acte-i' limit 1
),
audio as (
  select name
  from storage.objects
  where bucket_id = 'atelier-audio'
    and (
      name ilike 'season-1/track03%'
      or name ilike 'season-1/track-03%'
      or name ilike 'season-1/track_03%'
      or name ilike '%track03%'
      or name ilike '%track-03%'
      or name ilike '%track_03%'
    )
  order by name
  limit 1
)
insert into public.atelier_tracks (season_id, title, storage_path, status, influence_mode, sort_order)
select
  acte_i.id,
  'Vérité coupée',
  audio.name,
  'active',
  'open',
  30
from acte_i, audio
where not exists (
  select 1
  from public.atelier_tracks t
  where lower(t.title) in ('vérité coupée', 'verite coupee')
     or t.storage_path = audio.name
);

update public.atelier_tracks
set
  title = 'Là où j''me sens vraie',
  season_id = (select id from public.atelier_seasons where slug = 'acte-i'),
  status = 'active',
  sort_order = case when sort_order = 0 then 40 else sort_order end
where lower(title) in ('track 04', 'track04', 'track test 04', 'track 4', 'track4', 'track test 4', 'là où j''me sens vraie', 'la ou j''me sens vraie')
   or storage_path ilike '%track04.%'
   or storage_path ilike '%track-04.%'
   or storage_path ilike '%track_04.%'
   or storage_path ilike '%track 04.%';

with acte_i as (
  select id from public.atelier_seasons where slug = 'acte-i' limit 1
),
audio as (
  select name
  from storage.objects
  where bucket_id = 'atelier-audio'
    and (
      name ilike 'season-1/track04%'
      or name ilike 'acte-i/track04%'
      or name ilike 'acte_i/track04%'
      or name ilike 'acte i/track04%'
      or name ilike 'acte1/track04%'
      or name ilike 'acte 1/track04%'
      or name ilike '%track04%'
      or name ilike '%track-04%'
      or name ilike '%track_04%'
      or name ilike '%vraie%'
    )
  order by name
  limit 1
)
insert into public.atelier_tracks (season_id, title, storage_path, status, influence_mode, sort_order)
select
  acte_i.id,
  'Là où j''me sens vraie',
  audio.name,
  'active',
  'open',
  40
from acte_i, audio
where not exists (
  select 1
  from public.atelier_tracks t
  where lower(t.title) in ('là où j''me sens vraie', 'la ou j''me sens vraie')
     or t.storage_path = audio.name
);

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
   or (
    lower(title) in ('track01', 'track 01', 'track test 01')
    and exists (
      select 1
      from public.atelier_seasons s
      where s.id = atelier_tracks.season_id
        and (s.slug = 'acte-ii' or lower(coalesce(s.title, '')) in ('acte ii', 'acte 2'))
    )
   )
   or storage_path ilike '%acte-ii%track01%'
   or storage_path ilike '%acte_ii%track01%'
   or storage_path ilike '%acte ii%track01%'
   or storage_path ilike '%acte2%track01%'
   or storage_path ilike '%acte-2%track01%'
   or storage_path ilike '%acte_2%track01%'
   or storage_path ilike '%season-2/track01%'
   or storage_path ilike '%season-2\\track01%';

with acte_ii as (
  select id from public.atelier_seasons where slug = 'acte-ii' limit 1
),
audio as (
  select name
  from storage.objects
  where bucket_id = 'atelier-audio'
    and (
      name ilike 'season-2/track01%'
      or name ilike 'acte-ii/track01%'
      or name ilike 'acte_ii/track01%'
      or name ilike 'acte ii/track01%'
      or name ilike 'acte-2/track01%'
      or name ilike 'acte_2/track01%'
      or name ilike '%acte-ii%track01%'
      or name ilike '%acte_ii%track01%'
      or name ilike '%acte ii%track01%'
      or name ilike '%acte-2%track01%'
      or name ilike '%acte_2%track01%'
      or name ilike '%sous%controle%'
      or name ilike '%sous%contrôle%'
    )
  order by name
  limit 1
)
insert into public.atelier_tracks (season_id, title, storage_path, status, influence_mode, sort_order)
select
  acte_ii.id,
  'Sous contrôle',
  audio.name,
  'active',
  'open',
  10
from acte_ii, audio
where not exists (
  select 1
  from public.atelier_tracks t
  where lower(t.title) in ('sous contrôle', 'sous controle')
     or t.storage_path = audio.name
);
