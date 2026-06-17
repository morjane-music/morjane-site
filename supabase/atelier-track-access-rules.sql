-- Atelier track-level access rules.
-- Empty arrays mean visible to every validated member.

alter table public.atelier_tracks
  add column if not exists allowed_audience_segments text[] not null default '{}'::text[],
  add column if not exists allowed_member_statuses text[] not null default '{}'::text[];

alter table public.atelier_tracks
  drop constraint if exists atelier_tracks_allowed_audience_segments_check;

alter table public.atelier_tracks
  add constraint atelier_tracks_allowed_audience_segments_check
  check (allowed_audience_segments <@ array['public', 'proche', 'artiste', 'pro']::text[]);

alter table public.atelier_tracks
  drop constraint if exists atelier_tracks_allowed_member_statuses_check;

alter table public.atelier_tracks
  add constraint atelier_tracks_allowed_member_statuses_check
  check (allowed_member_statuses <@ array['member', 'priority', 'founder']::text[]);

create or replace function public.atelier_normalized_segment(value text)
returns text
language sql
immutable
as $$
  select case coalesce(value, 'public')
    when 'listener' then 'public'
    when 'friend' then 'proche'
    when 'creator' then 'artiste'
    when 'press' then 'pro'
    when 'team' then 'pro'
    when '' then 'public'
    else coalesce(value, 'public')
  end;
$$;

create or replace function public.atelier_can_access_track(uid uuid, target_track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_profiles p
    join public.atelier_tracks t on t.id = target_track_id
    join public.atelier_seasons s on s.id = t.season_id
    where p.id = uid
      and p.member_status in ('member', 'founder', 'priority')
      and t.status = 'active'
      and s.status = 'active'
      and (
        cardinality(t.allowed_member_statuses) = 0
        or p.member_status = any(t.allowed_member_statuses)
      )
      and (
        cardinality(t.allowed_audience_segments) = 0
        or public.atelier_normalized_segment(p.audience_segment) = any(t.allowed_audience_segments)
      )
      and (
        s.slug not in ('acte-0', 'hors-acte')
        or p.role = 'admin'
        or public.atelier_normalized_segment(p.audience_segment) = 'proche'
        or p.member_status in ('priority', 'founder')
      )
  );
$$;

drop policy if exists atelier_tracks_select_members_active on public.atelier_tracks;
create policy atelier_tracks_select_members_active
on public.atelier_tracks
for select to authenticated
using (public.atelier_can_access_track(auth.uid(), id));

drop policy if exists atelier_votes_select_own on public.atelier_votes;
create policy atelier_votes_select_own
on public.atelier_votes
for select to authenticated
using (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_votes_insert_own on public.atelier_votes;
create policy atelier_votes_insert_own
on public.atelier_votes
for insert to authenticated
with check (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_votes_update_own on public.atelier_votes;
create policy atelier_votes_update_own
on public.atelier_votes
for update to authenticated
using (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id))
with check (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_track_likes_select_members on public.atelier_track_likes;
create policy atelier_track_likes_select_members
on public.atelier_track_likes
for select to authenticated
using (public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_track_likes_insert_own on public.atelier_track_likes;
create policy atelier_track_likes_insert_own
on public.atelier_track_likes
for insert to authenticated
with check (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_track_likes_delete_own on public.atelier_track_likes;
create policy atelier_track_likes_delete_own
on public.atelier_track_likes
for delete to authenticated
using (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_track_plays_insert_member_own on public.atelier_track_plays;
create policy atelier_track_plays_insert_member_own
on public.atelier_track_plays
for insert to authenticated
with check (auth.uid() = user_id and public.atelier_can_access_track(auth.uid(), track_id));

drop policy if exists atelier_track_plays_select_member on public.atelier_track_plays;
create policy atelier_track_plays_select_member
on public.atelier_track_plays
for select to authenticated
using (public.atelier_can_access_track(auth.uid(), track_id));
