-- Optional cleanup after deploying get-track-counts Netlify Function.
-- The Atelier no longer reads these views from the browser.

drop view if exists public.atelier_track_play_counts;
drop view if exists public.atelier_track_like_counts;
