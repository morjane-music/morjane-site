alter table public.atelier_tracks
  add column if not exists announcement_enabled boolean not null default true,
  add column if not exists announcement_text text;

comment on column public.atelier_tracks.announcement_enabled is 'Whether this track should appear in member movement notices and generated admin announcements.';
comment on column public.atelier_tracks.announcement_text is 'Optional Morjane-facing copy used for quiet Atelier movement announcements.';