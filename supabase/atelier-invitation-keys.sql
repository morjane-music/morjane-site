-- Atelier invitation keys: additive only.
-- This does not modify or delete existing members/profiles.

create table if not exists public.atelier_invitation_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text,
  member_status text not null default 'member' check (member_status in ('member', 'priority')),
  audience_segment text not null default 'public' check (audience_segment in ('public', 'proche', 'artiste', 'pro')),
  source text not null default 'invitation',
  access_wave text,
  max_uses integer not null default 1 check (max_uses > 0 and max_uses <= 50),
  uses_count integer not null default 0 check (uses_count >= 0),
  is_active boolean not null default true,
  expires_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_email text,
  claimed_at timestamptz,
  claim_token_hash text,
  claim_token_expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_atelier_invitation_keys_active
  on public.atelier_invitation_keys(is_active, expires_at, uses_count);

create index if not exists idx_atelier_invitation_keys_claim_token
  on public.atelier_invitation_keys(claim_token_hash)
  where claim_token_hash is not null;

alter table public.atelier_invitation_keys enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'atelier_invitation_keys'
      and policyname = 'atelier_invitation_keys_select_admin'
  ) then
    create policy atelier_invitation_keys_select_admin
    on public.atelier_invitation_keys
    for select
    to authenticated
    using (public.atelier_is_admin(auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'atelier_invitation_keys'
      and policyname = 'atelier_invitation_keys_update_admin'
  ) then
    create policy atelier_invitation_keys_update_admin
    on public.atelier_invitation_keys
    for update
    to authenticated
    using (public.atelier_is_admin(auth.uid()))
    with check (public.atelier_is_admin(auth.uid()));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'atelier_invitation_keys'
      and policyname = 'atelier_invitation_keys_insert_admin'
  ) then
    create policy atelier_invitation_keys_insert_admin
    on public.atelier_invitation_keys
    for insert
    to authenticated
    with check (public.atelier_is_admin(auth.uid()));
  end if;
end $$;

drop trigger if exists atelier_invitation_keys_set_updated_at on public.atelier_invitation_keys;
create trigger atelier_invitation_keys_set_updated_at
before update on public.atelier_invitation_keys
for each row execute function public.atelier_set_updated_at();