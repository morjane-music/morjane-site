create extension if not exists pgcrypto;

create table if not exists public.atelier_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'founder', 'admin')),
  member_status text not null default 'none' check (member_status in ('none', 'member', 'founder')),
  audience_status text not null default 'new' check (audience_status in ('new', 'waiting', 'approved', 'vip', 'refused', 'archived')),
  audience_segment text check (audience_segment in ('listener', 'pro', 'press', 'creator', 'friend', 'team')),
  access_source text,
  access_wave text,
  admin_note text,
  last_admin_action_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.atelier_seasons (
  id bigserial primary key,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.atelier_tracks (
  id uuid primary key default gen_random_uuid(),
  season_id bigint not null references public.atelier_seasons(id) on delete cascade,
  title text not null,
  storage_path text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  influence_mode text not null default 'open',
  intent_note text,
  feedback_question text,
  decision_status text not null default 'testing' check (decision_status in ('testing', 'kept', 'rework', 'paused', 'released', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.atelier_votes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.atelier_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('develop', 'revise', 'leave')),
  created_at timestamptz not null default now(),
  unique (track_id, user_id)
);

create table if not exists public.atelier_track_likes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.atelier_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (track_id, user_id)
);

create table if not exists public.atelier_messages (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.atelier_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create or replace function public.atelier_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.atelier_is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_profiles p
    where p.id = uid and p.member_status in ('member', 'founder')
  );
$$;

create or replace function public.atelier_is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.atelier_profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'atelier_profiles_set_updated_at'
  ) then
    create trigger atelier_profiles_set_updated_at
    before update on public.atelier_profiles
    for each row execute function public.atelier_set_updated_at();
  end if;
end
$$;

create table if not exists public.atelier_track_plays (
  id bigserial primary key,
  track_id uuid not null references public.atelier_tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_atelier_track_plays_track_created
  on public.atelier_track_plays(track_id, created_at desc);

create index if not exists idx_atelier_track_plays_user_track_created
  on public.atelier_track_plays(user_id, track_id, created_at desc);

drop view if exists public.atelier_track_play_counts;

create view public.atelier_track_play_counts as
select track_id, count(*)::bigint as play_count
from public.atelier_track_plays
group by track_id;

alter table public.atelier_track_plays enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_track_plays' and policyname = 'atelier_track_plays_insert_member_own'
  ) then
    create policy atelier_track_plays_insert_member_own
    on public.atelier_track_plays
    for insert to authenticated
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_track_plays' and policyname = 'atelier_track_plays_select_member'
  ) then
    create policy atelier_track_plays_select_member
    on public.atelier_track_plays
    for select to authenticated
    using (public.atelier_is_member(auth.uid()));
  end if;
end
$$;

alter table public.atelier_messages
  add column if not exists admin_status text not null default 'new' check (admin_status in ('new', 'processed')),
  add column if not exists admin_note text,
  add column if not exists admin_reply text,
  add column if not exists feedback_tags text[] not null default '{}'::text[],
  add column if not exists processed_at timestamptz,
  add column if not exists processed_by uuid references auth.users(id) on delete set null;

alter table public.atelier_tracks
  add column if not exists intent_note text,
  add column if not exists feedback_question text,
  add column if not exists decision_status text not null default 'testing' check (decision_status in ('testing', 'kept', 'rework', 'paused', 'released', 'archived'));

alter table public.atelier_profiles
  add column if not exists audience_status text not null default 'new' check (audience_status in ('new', 'waiting', 'approved', 'vip', 'refused', 'archived')),
  add column if not exists audience_segment text check (audience_segment in ('listener', 'pro', 'press', 'creator', 'friend', 'team')),
  add column if not exists access_source text,
  add column if not exists access_wave text,
  add column if not exists admin_note text,
  add column if not exists last_admin_action_at timestamptz;

create index if not exists idx_atelier_profiles_audience_status
  on public.atelier_profiles(audience_status, created_at desc);

create index if not exists idx_atelier_messages_status_created
  on public.atelier_messages(admin_status, created_at desc);

create table if not exists public.atelier_admin_audit_logs (
  id bigserial primary key,
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_atelier_admin_audit_logs_created
  on public.atelier_admin_audit_logs(created_at desc);

alter table public.atelier_admin_audit_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_admin_audit_logs' and policyname = 'atelier_admin_audit_logs_select_admin'
  ) then
    create policy atelier_admin_audit_logs_select_admin
    on public.atelier_admin_audit_logs
    for select to authenticated
    using (public.atelier_is_admin(auth.uid()));
  end if;
end
$$;

create table if not exists public.atelier_function_events (
  id bigserial primary key,
  function_name text not null,
  status text not null check (status in ('ok', 'error')),
  error_code text,
  latency_ms integer,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_atelier_function_events_created
  on public.atelier_function_events(created_at desc);

create index if not exists idx_atelier_function_events_name_created
  on public.atelier_function_events(function_name, created_at desc);

alter table public.atelier_function_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_function_events' and policyname = 'atelier_function_events_select_admin'
  ) then
    create policy atelier_function_events_select_admin
    on public.atelier_function_events
    for select to authenticated
    using (public.atelier_is_admin(auth.uid()));
  end if;
end
$$;

create table if not exists public.atelier_magic_link_events (
  id bigserial primary key,
  email text,
  result text not null check (result in ('sent', 'error')),
  error_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_atelier_magic_link_events_created
  on public.atelier_magic_link_events(created_at desc);

alter table public.atelier_magic_link_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_magic_link_events' and policyname = 'atelier_magic_link_events_select_admin'
  ) then
    create policy atelier_magic_link_events_select_admin
    on public.atelier_magic_link_events
    for select to authenticated
    using (public.atelier_is_admin(auth.uid()));
  end if;
end
$$;

create table if not exists public.atelier_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  track_id uuid references public.atelier_tracks(id) on delete set null,
  is_listening boolean not null default false,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_atelier_presence_listening_seen
  on public.atelier_presence(is_listening, last_seen_at desc);

alter table public.atelier_presence enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_presence' and policyname = 'atelier_presence_select_own_or_admin'
  ) then
    create policy atelier_presence_select_own_or_admin
    on public.atelier_presence
    for select to authenticated
    using (auth.uid() = user_id or public.atelier_is_admin(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_presence' and policyname = 'atelier_presence_insert_own'
  ) then
    create policy atelier_presence_insert_own
    on public.atelier_presence
    for insert to authenticated
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_presence' and policyname = 'atelier_presence_update_own'
  ) then
    create policy atelier_presence_update_own
    on public.atelier_presence
    for update to authenticated
    using (auth.uid() = user_id and public.atelier_is_member(auth.uid()))
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

alter table public.atelier_profiles enable row level security;
alter table public.atelier_seasons enable row level security;
alter table public.atelier_tracks enable row level security;
alter table public.atelier_votes enable row level security;
alter table public.atelier_track_likes enable row level security;
alter table public.atelier_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_profiles' and policyname = 'atelier_profiles_select_own_or_admin'
  ) then
    create policy atelier_profiles_select_own_or_admin
    on public.atelier_profiles
    for select to authenticated
    using (auth.uid() = id or public.atelier_is_admin(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_track_likes' and policyname = 'atelier_track_likes_select_members'
  ) then
    create policy atelier_track_likes_select_members
    on public.atelier_track_likes
    for select to authenticated
    using (public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_track_likes' and policyname = 'atelier_track_likes_insert_own'
  ) then
    create policy atelier_track_likes_insert_own
    on public.atelier_track_likes
    for insert to authenticated
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_track_likes' and policyname = 'atelier_track_likes_delete_own'
  ) then
    create policy atelier_track_likes_delete_own
    on public.atelier_track_likes
    for delete to authenticated
    using (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

drop view if exists public.atelier_track_like_counts;

create view public.atelier_track_like_counts as
select track_id, count(*)::bigint as like_count
from public.atelier_track_likes
group by track_id;

revoke insert, update on public.atelier_profiles from authenticated;
grant insert (id, email) on public.atelier_profiles to authenticated;
grant update (id, email) on public.atelier_profiles to authenticated;

drop policy if exists atelier_profiles_insert_own on public.atelier_profiles;
create policy atelier_profiles_insert_own
on public.atelier_profiles
for insert to authenticated
with check (
  auth.uid() = id
  and role = 'member'
  and member_status = 'none'
);

drop policy if exists atelier_profiles_update_own on public.atelier_profiles;
create policy atelier_profiles_update_own
on public.atelier_profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_seasons' and policyname = 'atelier_seasons_select_members'
  ) then
    create policy atelier_seasons_select_members
    on public.atelier_seasons
    for select to authenticated
    using (public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_tracks' and policyname = 'atelier_tracks_select_members_active'
  ) then
    create policy atelier_tracks_select_members_active
    on public.atelier_tracks
    for select to authenticated
    using (
      public.atelier_is_member(auth.uid())
      and status = 'active'
      and exists (
        select 1 from public.atelier_seasons s
        where s.id = atelier_tracks.season_id and s.status = 'active'
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_votes' and policyname = 'atelier_votes_select_own'
  ) then
    create policy atelier_votes_select_own
    on public.atelier_votes
    for select to authenticated
    using (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_votes' and policyname = 'atelier_votes_insert_own'
  ) then
    create policy atelier_votes_insert_own
    on public.atelier_votes
    for insert to authenticated
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_votes' and policyname = 'atelier_votes_update_own'
  ) then
    create policy atelier_votes_update_own
    on public.atelier_votes
    for update to authenticated
    using (auth.uid() = user_id and public.atelier_is_member(auth.uid()))
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_messages' and policyname = 'atelier_messages_insert_member_own'
  ) then
    create policy atelier_messages_insert_member_own
    on public.atelier_messages
    for insert to authenticated
    with check (auth.uid() = user_id and public.atelier_is_member(auth.uid()));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'atelier_messages' and policyname = 'atelier_messages_select_admin_only'
  ) then
    create policy atelier_messages_select_admin_only
    on public.atelier_messages
    for select to authenticated
    using (public.atelier_is_admin(auth.uid()));
  end if;
end
$$;
