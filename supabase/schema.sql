-- Extensions
create extension if not exists pgcrypto;

-- Core tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'member' check (role in ('member', 'founder', 'admin')),
  member_status text not null default 'none' check (member_status in ('none', 'member', 'founder')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id bigserial primary key,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  season_id bigint not null references public.seasons(id) on delete cascade,
  title text not null,
  storage_path text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  influence_mode text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('develop', 'revise', 'leave')),
  created_at timestamptz not null default now(),
  unique (track_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Helpers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.member_status in ('member', 'founder')
  );
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'admin'
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.tracks enable row level security;
alter table public.votes enable row level security;
alter table public.messages enable row level security;

-- profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- seasons policies
drop policy if exists "seasons_select_members" on public.seasons;
create policy "seasons_select_members"
on public.seasons
for select
to authenticated
using (public.is_member(auth.uid()));

-- tracks policies
drop policy if exists "tracks_select_members_active" on public.tracks;
create policy "tracks_select_members_active"
on public.tracks
for select
to authenticated
using (
  public.is_member(auth.uid())
  and status = 'active'
  and exists (
    select 1
    from public.seasons s
    where s.id = tracks.season_id
      and s.status = 'active'
  )
);

-- votes policies
drop policy if exists "votes_select_own" on public.votes;
create policy "votes_select_own"
on public.votes
for select
to authenticated
using (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "votes_insert_own" on public.votes;
create policy "votes_insert_own"
on public.votes
for insert
to authenticated
with check (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "votes_update_own" on public.votes;
create policy "votes_update_own"
on public.votes
for update
to authenticated
using (auth.uid() = user_id and public.is_member(auth.uid()))
with check (auth.uid() = user_id and public.is_member(auth.uid()));

-- messages policies
drop policy if exists "messages_insert_member_own" on public.messages;
create policy "messages_insert_member_own"
on public.messages
for insert
to authenticated
with check (auth.uid() = user_id and public.is_member(auth.uid()));

drop policy if exists "messages_select_admin_only" on public.messages;
create policy "messages_select_admin_only"
on public.messages
for select
to authenticated
using (public.is_admin(auth.uid()));
