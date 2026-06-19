-- Fix Supabase Advisor warning:
-- Security Definer View on atelier_track_play_counts / atelier_track_like_counts.
--
-- This keeps the views, keeps the data, and makes them respect the querying
-- user's permissions/RLS context.

alter view public.atelier_track_play_counts set (security_invoker = true);
alter view public.atelier_track_like_counts set (security_invoker = true);

grant select on public.atelier_track_play_counts to authenticated;
grant select on public.atelier_track_like_counts to authenticated;
