-- Atelier access simplification.
-- Prepare locally, then apply before deploying the matching Netlify Functions.

alter table public.atelier_profiles
  add column if not exists adult_confirmed_at timestamptz;

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
    where p.id = uid
      and (p.role = 'admin' or p.member_status in ('member', 'founder', 'priority'))
  );
$$;

create or replace function public.atelier_claim_invitation_key(
  target_key_hash text,
  target_claim_token_hash text,
  target_claim_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key_row public.atelier_invitation_keys%rowtype;
begin
  select * into key_row
  from public.atelier_invitation_keys
  where key_hash = target_key_hash
  for update;

  if key_row.id is null
    or not key_row.is_active
    or (key_row.expires_at is not null and key_row.expires_at <= now())
    or key_row.uses_count >= key_row.max_uses
    or (key_row.claim_token_hash is not null and key_row.claim_token_expires_at > now())
  then
    return jsonb_build_object('ok', false);
  end if;

  update public.atelier_invitation_keys
  set claim_token_hash = target_claim_token_hash,
      claim_token_expires_at = target_claim_expires_at
  where id = key_row.id;

  return jsonb_build_object(
    'ok', true,
    'id', key_row.id,
    'label', coalesce(key_row.label, 'Cle Atelier'),
    'member_status', key_row.member_status,
    'audience_segment', key_row.audience_segment
  );
end;
$$;

create or replace function public.atelier_consume_invitation_claim(
  target_claim_token_hash text,
  target_user_id uuid,
  target_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key_row public.atelier_invitation_keys%rowtype;
  granted_status text;
begin
  select * into key_row
  from public.atelier_invitation_keys
  where claim_token_hash = target_claim_token_hash
  for update;

  if key_row.id is null
    or not key_row.is_active
    or (key_row.expires_at is not null and key_row.expires_at <= now())
    or key_row.claim_token_expires_at is null
    or key_row.claim_token_expires_at <= now()
    or key_row.uses_count >= key_row.max_uses
  then
    return jsonb_build_object('ok', false);
  end if;

  granted_status := case when key_row.member_status = 'priority' then 'priority' else 'member' end;

  update public.atelier_invitation_keys
  set uses_count = uses_count + 1,
      claimed_by = target_user_id,
      claimed_email = target_email,
      claimed_at = now(),
      claim_token_hash = null,
      claim_token_expires_at = null
  where id = key_row.id;

  insert into public.atelier_profiles (
    id, email, role, member_status, audience_status, audience_segment,
    source, access_source, access_wave, last_activity_at
  ) values (
    target_user_id,
    target_email,
    'member',
    granted_status,
    case when granted_status = 'priority' then 'vip' else 'approved' end,
    key_row.audience_segment,
    'invitation',
    'invitation',
    'key:' || coalesce(key_row.label, key_row.id::text),
    now()
  )
  on conflict (id) do update set
    email = coalesce(atelier_profiles.email, excluded.email),
    member_status = case
      when atelier_profiles.member_status in ('member', 'founder', 'priority') then atelier_profiles.member_status
      else excluded.member_status
    end,
    audience_status = case
      when atelier_profiles.member_status in ('member', 'founder', 'priority') then atelier_profiles.audience_status
      else excluded.audience_status
    end,
    audience_segment = coalesce(excluded.audience_segment, atelier_profiles.audience_segment),
    source = coalesce(atelier_profiles.source, excluded.source),
    access_source = excluded.access_source,
    access_wave = excluded.access_wave,
    last_activity_at = now();

  return jsonb_build_object(
    'ok', true,
    'id', key_row.id,
    'label', coalesce(key_row.label, 'Cle Atelier'),
    'member_status', granted_status,
    'audience_segment', key_row.audience_segment,
    'uses_count', key_row.uses_count + 1,
    'max_uses', key_row.max_uses
  );
end;
$$;

revoke all on function public.atelier_claim_invitation_key(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.atelier_consume_invitation_claim(text, uuid, text) from public, anon, authenticated;
grant execute on function public.atelier_claim_invitation_key(text, text, timestamptz) to service_role;
grant execute on function public.atelier_consume_invitation_claim(text, uuid, text) to service_role;
