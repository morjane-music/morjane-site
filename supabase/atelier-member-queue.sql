alter table public.atelier_profiles
  add column if not exists audience_status text not null default 'new' check (audience_status in ('new', 'waiting', 'approved', 'vip', 'refused', 'archived')),
  add column if not exists audience_segment text check (audience_segment in ('listener', 'pro', 'press', 'creator', 'friend', 'team')),
  add column if not exists access_source text,
  add column if not exists access_wave text,
  add column if not exists admin_note text,
  add column if not exists last_admin_action_at timestamptz;

create index if not exists idx_atelier_profiles_audience_status
  on public.atelier_profiles(audience_status, created_at desc);

update public.atelier_profiles
set audience_status = case
  when member_status = 'founder' or role = 'founder' then 'vip'
  when member_status = 'member' or role = 'admin' then 'approved'
  else coalesce(audience_status, 'new')
end
where audience_status is null
   or audience_status = 'new';
