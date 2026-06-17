-- Atelier profile model: access status, listening profile, source.
-- Safe to run more than once. It does not delete members or tracks.

alter table public.atelier_profiles
  add column if not exists audience_status text not null default 'new',
  add column if not exists audience_segment text,
  add column if not exists source text,
  add column if not exists access_source text,
  add column if not exists access_wave text,
  add column if not exists admin_note text,
  add column if not exists last_admin_action_at timestamptz;

alter table public.atelier_profiles
  drop constraint if exists atelier_profiles_member_status_check;

alter table public.atelier_profiles
  add constraint atelier_profiles_member_status_check
  check (member_status in ('none', 'pending', 'member', 'founder', 'priority', 'blocked', 'archived'));

alter table public.atelier_profiles
  alter column member_status set default 'pending';

alter table public.atelier_profiles
  drop constraint if exists atelier_profiles_audience_status_check;

alter table public.atelier_profiles
  add constraint atelier_profiles_audience_status_check
  check (audience_status in ('new', 'waiting', 'approved', 'vip', 'refused', 'archived'));

alter table public.atelier_profiles
  drop constraint if exists atelier_profiles_audience_segment_check;

alter table public.atelier_profiles
  add constraint atelier_profiles_audience_segment_check
  check (audience_segment is null or audience_segment in ('public', 'proche', 'artiste', 'pro', 'listener', 'press', 'creator', 'friend', 'team'));

alter table public.atelier_profiles
  drop constraint if exists atelier_profiles_source_check;

alter table public.atelier_profiles
  add constraint atelier_profiles_source_check
  check (source is null or source in ('site', 'concert', 'instagram', 'email', 'invitation', 'bouche_a_oreille', 'autre'));

update public.atelier_profiles
set audience_status = case
  when member_status = 'founder' or role = 'founder' then 'vip'
  when member_status = 'priority' then 'vip'
  when member_status = 'member' or role = 'admin' then 'approved'
  else coalesce(audience_status, 'new')
end
where audience_status is null
   or audience_status = 'new';

update public.atelier_profiles
set member_status = 'pending'
where member_status = 'none'
  and audience_status in ('new', 'waiting');

update public.atelier_profiles
set audience_segment = case audience_segment
  when 'listener' then 'public'
  when 'friend' then 'proche'
  when 'creator' then 'artiste'
  when 'press' then 'pro'
  when 'team' then 'pro'
  else audience_segment
end
where audience_segment in ('listener', 'friend', 'creator', 'press', 'team');

update public.atelier_profiles
set source = case lower(coalesce(source, access_source, ''))
  when 'concert' then 'concert'
  when 'instagram' then 'instagram'
  when 'email' then 'email'
  when 'invitation' then 'invitation'
  when 'bouche_a_oreille' then 'bouche_a_oreille'
  when 'bouche à oreille' then 'bouche_a_oreille'
  when 'site' then 'site'
  when '' then 'site'
  else 'autre'
end
where source is null;

create index if not exists idx_atelier_profiles_audience_status
  on public.atelier_profiles(audience_status, created_at desc);

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
    where p.id = uid and p.member_status in ('member', 'founder', 'priority')
  );
$$;

drop policy if exists atelier_profiles_insert_own on public.atelier_profiles;
create policy atelier_profiles_insert_own
on public.atelier_profiles
for insert to authenticated
with check (
  auth.uid() = id
  and role = 'member'
  and member_status in ('none', 'pending')
);
