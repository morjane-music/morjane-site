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
