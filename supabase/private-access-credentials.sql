-- Migration locale uniquement. Ne pas appliquer sans validation du déploiement.
create extension if not exists pgcrypto;

create table if not exists public.private_access_credentials (
  scope text primary key check (scope in ('set', 'acte1')),
  password_hash text not null,
  session_version bigint not null default 1 check (session_version > 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.private_access_credentials enable row level security;
revoke all on table public.private_access_credentials from public, anon, authenticated;
grant select, insert, update, delete on table public.private_access_credentials to service_role;

create table if not exists public.private_access_rate_limits (
  scope text not null check (scope in ('set', 'acte1', 'admin_invite', 'activation', 'session_link')),
  identifier_hash text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (scope, identifier_hash)
);

alter table public.private_access_rate_limits enable row level security;
revoke all on table public.private_access_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.private_access_rate_limits to service_role;

create or replace function public.private_access_get_state(requested_scope text)
returns table(configured boolean, enabled boolean, session_version bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    credentials.scope is not null as configured,
    coalesce(credentials.enabled, false) as enabled,
    coalesce(credentials.session_version, 0)::bigint as session_version
  from (select 1) as singleton
  left join public.private_access_credentials credentials
    on credentials.scope = requested_scope
   and requested_scope in ('set', 'acte1');
$$;

revoke all on function public.private_access_get_state(text) from public;
grant execute on function public.private_access_get_state(text) to anon, authenticated, service_role;

create or replace function public.private_access_register_attempt(
  requested_scope text,
  requested_identifier_hash text,
  requested_max_attempts integer default 8,
  requested_window_seconds integer default 900,
  requested_block_seconds integer default 900
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.private_access_rate_limits%rowtype;
  current_time timestamptz := now();
begin
  if requested_scope not in ('set', 'acte1', 'admin_invite', 'activation', 'session_link')
     or length(requested_identifier_hash) < 32
     or requested_max_attempts < 1
     or requested_window_seconds < 60
     or requested_block_seconds < 60 then
    return false;
  end if;

  insert into public.private_access_rate_limits (scope, identifier_hash)
  values (requested_scope, requested_identifier_hash)
  on conflict (scope, identifier_hash) do nothing;

  select * into current_row
  from public.private_access_rate_limits
  where scope = requested_scope and identifier_hash = requested_identifier_hash
  for update;

  if current_row.blocked_until is not null and current_row.blocked_until > current_time then
    return false;
  end if;

  if current_row.window_started_at <= current_time - make_interval(secs => requested_window_seconds) then
    current_row.attempt_count := 0;
    current_row.window_started_at := current_time;
    current_row.blocked_until := null;
  end if;

  current_row.attempt_count := current_row.attempt_count + 1;
  if current_row.attempt_count > requested_max_attempts then
    update public.private_access_rate_limits
    set attempt_count = current_row.attempt_count,
        blocked_until = current_time + make_interval(secs => requested_block_seconds),
        updated_at = current_time
    where scope = requested_scope and identifier_hash = requested_identifier_hash;
    return false;
  end if;

  update public.private_access_rate_limits
  set attempt_count = current_row.attempt_count,
      window_started_at = current_row.window_started_at,
      blocked_until = null,
      updated_at = current_time
  where scope = requested_scope and identifier_hash = requested_identifier_hash;
  return true;
end;
$$;

create or replace function public.private_access_clear_attempts(requested_scope text, requested_identifier_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.private_access_rate_limits
  where scope = requested_scope and identifier_hash = requested_identifier_hash;
$$;

revoke all on function public.private_access_register_attempt(text, text, integer, integer, integer) from public;
revoke all on function public.private_access_clear_attempts(text, text) from public;
grant execute on function public.private_access_register_attempt(text, text, integer, integer, integer) to service_role;
grant execute on function public.private_access_clear_attempts(text, text) to service_role;

create or replace function public.private_access_set_password(
  requested_scope text,
  requested_password_hash text,
  requested_admin_user_id uuid
)
returns table(scope text, configured boolean, enabled boolean, session_version bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.private_access_credentials%rowtype;
begin
  if requested_scope not in ('set', 'acte1')
     or requested_password_hash not like 'scrypt$%'
     or requested_admin_user_id is null then
    raise exception 'invalid_private_access_change';
  end if;

  insert into public.private_access_credentials as credentials
    (scope, password_hash, session_version, enabled, updated_at, updated_by)
  values
    (requested_scope, requested_password_hash, 1, true, now(), requested_admin_user_id)
  on conflict (scope) do update
    set password_hash = excluded.password_hash,
        session_version = credentials.session_version + 1,
        enabled = true,
        updated_at = now(),
        updated_by = excluded.updated_by
  returning * into changed;

  insert into public.atelier_admin_audit_logs
    (admin_user_id, action, target_type, target_id, details)
  values
    (requested_admin_user_id, 'private_access_password_changed', 'private_access', requested_scope,
     jsonb_build_object('session_version', changed.session_version));

  return query select changed.scope, true, changed.enabled, changed.session_version, changed.updated_at;
end;
$$;

create or replace function public.private_access_revoke_sessions(requested_scope text, requested_admin_user_id uuid)
returns table(scope text, configured boolean, enabled boolean, session_version bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  changed public.private_access_credentials%rowtype;
begin
  if requested_scope not in ('set', 'acte1') or requested_admin_user_id is null then
    raise exception 'invalid_private_access_revocation';
  end if;

  update public.private_access_credentials
  set session_version = session_version + 1,
      updated_at = now(),
      updated_by = requested_admin_user_id
  where private_access_credentials.scope = requested_scope
  returning * into changed;

  if changed.scope is null then
    raise exception 'private_access_not_configured';
  end if;

  insert into public.atelier_admin_audit_logs
    (admin_user_id, action, target_type, target_id, details)
  values
    (requested_admin_user_id, 'private_access_sessions_revoked', 'private_access', requested_scope,
     jsonb_build_object('session_version', changed.session_version));

  return query select changed.scope, true, changed.enabled, changed.session_version, changed.updated_at;
end;
$$;

revoke all on function public.private_access_set_password(text, text, uuid) from public;
revoke all on function public.private_access_revoke_sessions(text, uuid) from public;
grant execute on function public.private_access_set_password(text, text, uuid) to service_role;
grant execute on function public.private_access_revoke_sessions(text, uuid) to service_role;

create table if not exists public.private_access_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  scopes text[] not null check (
    cardinality(scopes) between 1 and 2
    and scopes <@ array['set', 'acte1']::text[]
  ),
  token_hash text not null unique check (length(token_hash) = 64),
  status text not null default 'sent' check (status in ('sent', 'activated', 'revoked')),
  expires_at timestamptz,
  sent_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  invited_user_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  resend_count integer not null default 0 check (resend_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists idx_private_access_invitations_status
  on public.private_access_invitations(status, expires_at, sent_at desc);
create index if not exists idx_private_access_invitations_email
  on public.private_access_invitations(email);

alter table public.private_access_invitations enable row level security;
revoke all on table public.private_access_invitations from public, anon, authenticated;
grant select, insert, update, delete on table public.private_access_invitations to service_role;

create table if not exists public.private_access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  scope text not null check (scope in ('set', 'acte1')),
  invitation_id uuid references public.private_access_invitations(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  session_version bigint not null default 1 check (session_version > 0),
  expires_at timestamptz,
  activated_at timestamptz not null default now(),
  last_session_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, scope)
);

create index if not exists idx_private_access_grants_active
  on public.private_access_grants(status, expires_at, scope);

alter table public.private_access_grants enable row level security;
revoke all on table public.private_access_grants from public, anon, authenticated;
grant select, insert, update, delete on table public.private_access_grants to service_role;

create or replace function public.private_access_activate_invitation(
  requested_token_hash text,
  requested_user_id uuid,
  requested_email text
)
returns table(grant_id uuid, scope text, session_version bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.private_access_invitations%rowtype;
  requested_scope text;
  changed public.private_access_grants%rowtype;
begin
  select * into invitation
  from public.private_access_invitations
  where token_hash = requested_token_hash
  for update;

  if invitation.id is null
     or invitation.status <> 'sent'
     or (invitation.expires_at is not null and invitation.expires_at <= now())
     or invitation.email <> lower(trim(requested_email))
     or requested_user_id is null then
    return;
  end if;

  update public.private_access_invitations
  set status = 'activated', activated_at = now(), invited_user_id = requested_user_id,
      token_hash = encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'),
      updated_at = now()
  where id = invitation.id;

  foreach requested_scope in array invitation.scopes loop
    insert into public.private_access_grants as grants
      (user_id, email, scope, invitation_id, status, session_version, expires_at, activated_at, updated_at)
    values
      (requested_user_id, invitation.email, requested_scope, invitation.id, 'active', 1,
       invitation.expires_at, now(), now())
    on conflict (user_id, scope) do update
      set email = excluded.email,
          invitation_id = excluded.invitation_id,
          status = 'active',
          session_version = grants.session_version + 1,
          expires_at = excluded.expires_at,
          activated_at = now(),
          revoked_at = null,
          revoked_by = null,
          updated_at = now()
    returning * into changed;
    return query select changed.id, changed.scope, changed.session_version, changed.expires_at;
  end loop;

  insert into public.atelier_admin_audit_logs
    (admin_user_id, action, target_type, target_id, details)
  values
    (invitation.created_by, 'private_access_invitation_activated', 'private_access_invitation', invitation.id::text,
     jsonb_build_object('user_id', requested_user_id, 'scopes', invitation.scopes));
end;
$$;

create or replace function public.private_access_get_grant_state(requested_grant_id uuid, requested_scope text)
returns table(active boolean, session_version bigint, expires_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    (g.status = 'active' and (g.expires_at is null or g.expires_at > now())) as active,
    g.session_version,
    g.expires_at
  from public.private_access_grants g
  where g.id = requested_grant_id and g.scope = requested_scope;
$$;

create or replace function public.private_access_revoke_grant(
  requested_grant_id uuid,
  requested_admin_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.private_access_grants
  set status = 'revoked', session_version = session_version + 1,
      revoked_at = now(), revoked_by = requested_admin_user_id, updated_at = now()
  where id = requested_grant_id and status = 'active';
  get diagnostics changed_count = row_count;
  if changed_count > 0 then
    insert into public.atelier_admin_audit_logs
      (admin_user_id, action, target_type, target_id, details)
    values
      (requested_admin_user_id, 'private_access_grant_revoked', 'private_access_grant', requested_grant_id::text, '{}'::jsonb);
  end if;
  return changed_count > 0;
end;
$$;

revoke all on function public.private_access_activate_invitation(text, uuid, text) from public, anon, authenticated;
revoke all on function public.private_access_get_grant_state(uuid, text) from public;
revoke all on function public.private_access_revoke_grant(uuid, uuid) from public, anon, authenticated;
grant execute on function public.private_access_activate_invitation(text, uuid, text) to service_role;
grant execute on function public.private_access_get_grant_state(uuid, text) to anon, authenticated, service_role;
grant execute on function public.private_access_revoke_grant(uuid, uuid) to service_role;

create or replace function public.private_access_revoke_invitation(
  requested_invitation_id uuid,
  requested_admin_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.private_access_invitations
  set status = 'revoked', revoked_at = now(),
      token_hash = encode(digest(gen_random_uuid()::text || clock_timestamp()::text, 'sha256'), 'hex'),
      updated_at = now()
  where id = requested_invitation_id and status <> 'revoked';
  get diagnostics changed_count = row_count;

  update public.private_access_grants
  set status = 'revoked', session_version = session_version + 1,
      revoked_at = now(), revoked_by = requested_admin_user_id, updated_at = now()
  where invitation_id = requested_invitation_id and status = 'active';

  if changed_count > 0 then
    insert into public.atelier_admin_audit_logs
      (admin_user_id, action, target_type, target_id, details)
    values
      (requested_admin_user_id, 'private_access_invitation_revoked', 'private_access_invitation', requested_invitation_id::text, '{}'::jsonb);
  end if;
  return changed_count > 0;
end;
$$;

create or replace function public.private_access_extend_invitation(
  requested_invitation_id uuid,
  requested_expires_at timestamptz,
  requested_admin_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if requested_expires_at is not null and requested_expires_at <= now() then return false; end if;
  update public.private_access_invitations
  set expires_at = requested_expires_at, updated_at = now()
  where id = requested_invitation_id and status <> 'revoked';
  get diagnostics changed_count = row_count;
  update public.private_access_grants
  set expires_at = requested_expires_at, updated_at = now()
  where invitation_id = requested_invitation_id and status = 'active';
  if changed_count > 0 then
    insert into public.atelier_admin_audit_logs
      (admin_user_id, action, target_type, target_id, details)
    values
      (requested_admin_user_id, 'private_access_invitation_extended', 'private_access_invitation', requested_invitation_id::text,
       jsonb_build_object('expires_at', requested_expires_at));
  end if;
  return changed_count > 0;
end;
$$;

revoke all on function public.private_access_revoke_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.private_access_extend_invitation(uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.private_access_revoke_invitation(uuid, uuid) to service_role;
grant execute on function public.private_access_extend_invitation(uuid, timestamptz, uuid) to service_role;
