-- Upsert the current Atelier tracks after renaming files in Storage.
-- Storage files must exist in the atelier-audio bucket with the exact paths below.

create or replace function pg_temp.upsert_atelier_track_by_title(
  target_season_slug text,
  target_title text,
  target_storage_path text,
  target_sort_order integer
)
returns void
language plpgsql
set search_path = public
as $$
declare
  target_season_id bigint;
  existing_track_id uuid;
begin
  select id into target_season_id
  from public.atelier_seasons
  where slug = target_season_slug
  limit 1;

  if target_season_id is null then
    raise exception 'Missing atelier season: %', target_season_slug;
  end if;

  select id into existing_track_id
  from public.atelier_tracks
  where season_id = target_season_id
    and lower(title) = lower(target_title)
  order by created_at asc
  limit 1;

  if existing_track_id is null then
    insert into public.atelier_tracks (
      season_id,
      title,
      storage_path,
      status,
      decision_status,
      sort_order
    )
    values (
      target_season_id,
      target_title,
      target_storage_path,
      'active',
      'testing',
      target_sort_order
    );
  else
    update public.atelier_tracks
    set
      storage_path = target_storage_path,
      status = 'active',
      sort_order = target_sort_order
    where id = existing_track_id;
  end if;
end;
$$;

select pg_temp.upsert_atelier_track_by_title('acte-i', 'Cosmos', 'Acte I/Cosmos.mp3', 1);
select pg_temp.upsert_atelier_track_by_title('acte-i', 'En bas', 'Acte I/En bas.m4a', 2);
select pg_temp.upsert_atelier_track_by_title('acte-i', 'Vérité coupée', 'Acte I/Verite coupee.mp3', 3);
select pg_temp.upsert_atelier_track_by_title('acte-i', 'Là où j''me sens vraie', 'Acte I/Outro - La ou je me sens vraie.mp3', 4);

select pg_temp.upsert_atelier_track_by_title('acte-ii', 'Métisse', 'Acte II/Metisse.mp3', 1);
select pg_temp.upsert_atelier_track_by_title('acte-ii', 'Sous contrôle', 'Acte II/Sous controle.mp3', 2);

select pg_temp.upsert_atelier_track_by_title('acte-0', 'Diadème', 'Acte 0/Diadème.mp3', 1);
select pg_temp.upsert_atelier_track_by_title('acte-0', 'En boucle', 'Acte 0/En boucle.mp3', 2);
