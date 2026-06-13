drop policy if exists atelier_messages_insert_member_own on public.atelier_messages;
revoke insert, update, delete on public.atelier_messages from authenticated;

create table if not exists public.atelier_emotional_events (
  id bigserial primary key,
  event_type text not null check (event_type in ('vote', 'play', 'message')),
  track_id uuid references public.atelier_tracks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  source_id text,
  signal text,
  weight integer not null default 1,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_atelier_emotional_events_track_created
  on public.atelier_emotional_events(track_id, created_at desc);

create index if not exists idx_atelier_emotional_events_type_created
  on public.atelier_emotional_events(event_type, created_at desc);

create unique index if not exists idx_atelier_emotional_events_unique_source
  on public.atelier_emotional_events(event_type, source_id)
  where source_id is not null;

alter table public.atelier_emotional_events enable row level security;

drop policy if exists atelier_emotional_events_select_admin on public.atelier_emotional_events;
create policy atelier_emotional_events_select_admin
on public.atelier_emotional_events
for select to authenticated
using (public.atelier_is_admin(auth.uid()));

create or replace function public.atelier_log_emotional_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'atelier_votes' then
    insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal, meta)
    values ('vote', new.track_id, new.user_id, new.id::text, new.choice, jsonb_build_object('choice', new.choice));
  elsif tg_table_name = 'atelier_track_plays' then
    insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal)
    values ('play', new.track_id, new.user_id, new.id::text, 'listen');
  elsif tg_table_name = 'atelier_messages' then
    insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal, meta)
    values (
      'message',
      new.track_id,
      new.user_id,
      new.id::text,
      coalesce((new.feedback_tags)[1], 'trace'),
      jsonb_build_object('tags', coalesce(new.feedback_tags, '{}'::text[]))
    );
  end if;
  return new;
end;
$$;

drop trigger if exists atelier_votes_emotional_event on public.atelier_votes;
create trigger atelier_votes_emotional_event
after insert or update on public.atelier_votes
for each row execute function public.atelier_log_emotional_event();

drop trigger if exists atelier_track_plays_emotional_event on public.atelier_track_plays;
create trigger atelier_track_plays_emotional_event
after insert on public.atelier_track_plays
for each row execute function public.atelier_log_emotional_event();

drop trigger if exists atelier_messages_emotional_event on public.atelier_messages;
create trigger atelier_messages_emotional_event
after insert on public.atelier_messages
for each row execute function public.atelier_log_emotional_event();

insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal, meta, created_at)
select 'vote', v.track_id, v.user_id, v.id::text, v.choice, jsonb_build_object('choice', v.choice), v.created_at
from public.atelier_votes v
on conflict (event_type, source_id) where source_id is not null do nothing;

insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal, created_at)
select 'play', p.track_id, p.user_id, p.id::text, 'listen', p.created_at
from public.atelier_track_plays p
on conflict (event_type, source_id) where source_id is not null do nothing;

insert into public.atelier_emotional_events(event_type, track_id, user_id, source_id, signal, meta, created_at)
select
  'message',
  m.track_id,
  m.user_id,
  m.id::text,
  coalesce((m.feedback_tags)[1], 'trace'),
  jsonb_build_object('tags', coalesce(m.feedback_tags, '{}'::text[])),
  m.created_at
from public.atelier_messages m
on conflict (event_type, source_id) where source_id is not null do nothing;
