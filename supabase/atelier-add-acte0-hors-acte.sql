-- Add the reserved Atelier sections.
-- ACTE 0 and HORS ACTE are visible to proches, priority, and founder profiles only.

insert into public.atelier_seasons (slug, title, description, status, sort_order)
values
  ('acte-0', 'ACTE 0', 'Les premieres fissures.', 'active', 0),
  ('hors-acte', 'HORS ACTE', 'Les chansons qui gravitent autour du seuil.', 'active', 40)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  sort_order = excluded.sort_order;

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
      and (cardinality(t.allowed_member_statuses) = 0 or p.member_status = any(t.allowed_member_statuses))
      and (cardinality(t.allowed_audience_segments) = 0 or public.atelier_normalized_segment(p.audience_segment) = any(t.allowed_audience_segments))
      and (
        s.slug not in ('acte-0', 'hors-acte')
        or public.atelier_normalized_segment(p.audience_segment) = 'proche'
        or p.member_status in ('priority', 'founder')
      )
  );
$$;
