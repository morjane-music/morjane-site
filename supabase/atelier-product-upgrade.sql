alter table public.atelier_tracks
  add column if not exists intent_note text,
  add column if not exists feedback_question text,
  add column if not exists decision_status text not null default 'testing' check (decision_status in ('testing', 'kept', 'rework', 'paused', 'released', 'archived'));

alter table public.atelier_messages
  add column if not exists admin_reply text,
  add column if not exists feedback_tags text[] not null default '{}'::text[];
