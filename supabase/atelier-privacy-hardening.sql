-- Atelier privacy hardening — apply explicitly in Supabase after review.
-- Invoked hourly by the scheduled atelier-privacy-maintenance function.

create table if not exists public.atelier_track_play_daily (
  day date not null,
  track_id uuid not null references public.atelier_tracks(id) on delete cascade,
  play_count bigint not null default 0 check (play_count >= 0),
  listener_count bigint not null default 0 check (listener_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, track_id)
);

alter table public.atelier_profiles
  add column if not exists last_activity_at timestamptz;

update public.atelier_profiles p
set last_activity_at = greatest(
  p.updated_at,
  coalesce((select max(m.created_at) from public.atelier_messages m where m.user_id = p.id), p.created_at),
  coalesce((select max(v.created_at) from public.atelier_votes v where v.user_id = p.id), p.created_at),
  coalesce((select max(l.created_at) from public.atelier_track_likes l where l.user_id = p.id), p.created_at),
  coalesce((select max(pl.created_at) from public.atelier_track_plays pl where pl.user_id = p.id), p.created_at)
)
where p.last_activity_at is null;

create or replace function public.atelier_touch_member_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.atelier_profiles set last_activity_at = now() where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists atelier_votes_touch_member_activity on public.atelier_votes;
create trigger atelier_votes_touch_member_activity after insert or update on public.atelier_votes
for each row execute function public.atelier_touch_member_activity();
drop trigger if exists atelier_track_likes_touch_member_activity on public.atelier_track_likes;
create trigger atelier_track_likes_touch_member_activity after insert or update on public.atelier_track_likes
for each row execute function public.atelier_touch_member_activity();
drop trigger if exists atelier_messages_touch_member_activity on public.atelier_messages;
create trigger atelier_messages_touch_member_activity after insert or update on public.atelier_messages
for each row execute function public.atelier_touch_member_activity();
drop trigger if exists atelier_track_plays_touch_member_activity on public.atelier_track_plays;
create trigger atelier_track_plays_touch_member_activity after insert on public.atelier_track_plays
for each row execute function public.atelier_touch_member_activity();

alter table public.atelier_track_play_daily enable row level security;
drop policy if exists atelier_track_play_daily_select_admin on public.atelier_track_play_daily;
create policy atelier_track_play_daily_select_admin
on public.atelier_track_play_daily for select to authenticated
using (public.atelier_is_admin(auth.uid()));

-- Members only need their own individual activity rows.
drop policy if exists atelier_track_likes_select_members on public.atelier_track_likes;
drop policy if exists atelier_track_likes_select_own_or_admin on public.atelier_track_likes;
create policy atelier_track_likes_select_own_or_admin
on public.atelier_track_likes for select to authenticated
using (auth.uid() = user_id or public.atelier_is_admin(auth.uid()));

drop policy if exists atelier_track_plays_select_member on public.atelier_track_plays;
drop policy if exists atelier_track_plays_select_own_or_admin on public.atelier_track_plays;
create policy atelier_track_plays_select_own_or_admin
on public.atelier_track_plays for select to authenticated
using (auth.uid() = user_id or public.atelier_is_admin(auth.uid()));

-- admin_note is server/admin-only.
revoke select on public.atelier_profiles from authenticated;
grant select (
  id, email, role, member_status, audience_status, audience_segment,
  source, access_source, access_wave, last_admin_action_at, created_at, updated_at
) on public.atelier_profiles to authenticated;
revoke all on public.atelier_track_play_daily from anon;
grant select on public.atelier_track_play_daily to authenticated;

-- Manual monthly queue: Auth account deletion is deliberately reviewed.
create or replace view public.atelier_inactive_account_review
with (security_invoker = true)
as
select
  p.id, p.email, p.member_status, p.audience_status,
  coalesce(p.last_activity_at, p.updated_at, p.created_at) as last_activity_at,
  case
    when p.member_status in ('blocked', 'pending', 'none')
      and p.created_at < now() - interval '3 months' then 'access_request_expired'
    else 'inactive_24_months'
  end as review_reason
from public.atelier_profiles p
where p.role <> 'admin'
  and (
    (p.member_status in ('blocked', 'pending', 'none') and p.created_at < now() - interval '3 months')
    or coalesce(p.last_activity_at, p.updated_at, p.created_at) < now() - interval '24 months'
  );

revoke all on public.atelier_inactive_account_review from public, anon, authenticated;
grant select on public.atelier_inactive_account_review to service_role;

create or replace function public.atelier_apply_privacy_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  aggregated_rows bigint := 0;
  deleted_plays bigint := 0;
  deleted_presence bigint := 0;
  deleted_magic_links bigint := 0;
  deleted_function_events bigint := 0;
  deleted_votes bigint := 0;
  deleted_likes bigint := 0;
  deleted_messages bigint := 0;
  deleted_admin_audits bigint := 0;
  cleared_invitation_claims bigint := 0;
  cleared_admin_notes bigint := 0;
begin
  -- Raw listening history: 90 days maximum, then anonymous daily aggregates.
  insert into public.atelier_track_play_daily (day, track_id, play_count, listener_count, updated_at)
  select timezone('UTC', created_at)::date, track_id, count(*)::bigint,
    count(distinct user_id)::bigint, now()
  from public.atelier_track_plays
  where created_at < now() - interval '90 days'
  group by timezone('UTC', created_at)::date, track_id
  on conflict (day, track_id) do update set
    play_count = excluded.play_count,
    listener_count = excluded.listener_count,
    updated_at = excluded.updated_at;
  get diagnostics aggregated_rows = row_count;

  delete from public.atelier_track_plays where created_at < now() - interval '90 days';
  get diagnostics deleted_plays = row_count;
  delete from public.atelier_emotional_events
  where event_type = 'play' and created_at < now() - interval '90 days';

  -- Presence is ephemeral.
  delete from public.atelier_presence where last_seen_at < now() - interval '5 minutes';
  get diagnostics deleted_presence = row_count;

  delete from public.atelier_magic_link_events where created_at < now() - interval '3 months';
  get diagnostics deleted_magic_links = row_count;
  delete from public.atelier_function_events where created_at < now() - interval '3 months';
  get diagnostics deleted_function_events = row_count;
  delete from public.atelier_admin_audit_logs where created_at < now() - interval '12 months';
  get diagnostics deleted_admin_audits = row_count;

  -- Feedback rows: 24 months unless account erasure happens sooner.
  delete from public.atelier_emotional_events
  where event_type in ('vote', 'message') and created_at < now() - interval '24 months';
  delete from public.atelier_votes where created_at < now() - interval '24 months';
  get diagnostics deleted_votes = row_count;
  delete from public.atelier_track_likes where created_at < now() - interval '24 months';
  get diagnostics deleted_likes = row_count;
  delete from public.atelier_messages where created_at < now() - interval '24 months';
  get diagnostics deleted_messages = row_count;

  -- Invitation identity and secrets: 3 months.
  update public.atelier_invitation_keys
  set claimed_by = null, claimed_email = null, claimed_at = null,
    claim_token_hash = null, claim_token_expires_at = null, admin_note = null
  where claimed_at < now() - interval '3 months';
  get diagnostics cleared_invitation_claims = row_count;
  update public.atelier_invitation_keys
  set claim_token_hash = null, claim_token_expires_at = null
  where claim_token_expires_at < now() and claim_token_hash is not null;

  -- Administrative notes expire after 12 months without administrative use.
  update public.atelier_profiles
  set admin_note = null
  where admin_note is not null
    and coalesce(last_admin_action_at, updated_at, created_at) < now() - interval '12 months';
  get diagnostics cleared_admin_notes = row_count;

  return jsonb_build_object(
    'aggregated_days', aggregated_rows,
    'deleted_raw_plays', deleted_plays,
    'deleted_presence', deleted_presence,
    'deleted_magic_link_events', deleted_magic_links,
    'deleted_function_events', deleted_function_events,
    'deleted_admin_audits', deleted_admin_audits,
    'deleted_votes', deleted_votes,
    'deleted_likes', deleted_likes,
    'deleted_messages', deleted_messages,
    'cleared_invitation_claims', cleared_invitation_claims,
    'cleared_admin_notes', cleared_admin_notes
  );
end;
$$;

revoke all on function public.atelier_apply_privacy_retention() from public, anon, authenticated;
grant execute on function public.atelier_apply_privacy_retention() to service_role;

-- Manual V1 erasure helper. Run it with a verified UUID/email, then delete
-- the Supabase Auth user so foreign-key cascades remove profile-owned rows.
create or replace function public.atelier_scrub_account_references(target_user_id uuid, target_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(target_email, '')));
  magic_rows bigint := 0;
  function_rows bigint := 0;
  audit_rows bigint := 0;
  invitation_rows bigint := 0;
begin
  if target_user_id is null or normalized_email = '' then
    raise exception 'target_user_id and target_email are required';
  end if;

  delete from public.atelier_magic_link_events
  where lower(trim(coalesce(email, ''))) = normalized_email;
  get diagnostics magic_rows = row_count;
  delete from public.atelier_function_events
  where strpos(lower(meta::text), normalized_email) > 0;
  get diagnostics function_rows = row_count;
  delete from public.atelier_admin_audit_logs
  where target_id = target_user_id::text
     or strpos(lower(details::text), normalized_email) > 0;
  get diagnostics audit_rows = row_count;
  update public.atelier_invitation_keys
  set claimed_by = null, claimed_email = null, claimed_at = null,
    claim_token_hash = null, claim_token_expires_at = null, admin_note = null
  where claimed_by = target_user_id
     or lower(trim(coalesce(claimed_email, ''))) = normalized_email;
  get diagnostics invitation_rows = row_count;

  return jsonb_build_object(
    'deleted_magic_link_events', magic_rows,
    'deleted_function_events', function_rows,
    'deleted_admin_audits', audit_rows,
    'cleared_invitation_claims', invitation_rows
  );
end;
$$;

revoke all on function public.atelier_scrub_account_references(uuid, text) from public, anon, authenticated;
grant execute on function public.atelier_scrub_account_references(uuid, text) to service_role;
