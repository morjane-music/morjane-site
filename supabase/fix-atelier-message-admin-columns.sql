alter table public.atelier_messages
  add column if not exists admin_status text not null default 'new' check (admin_status in ('new', 'processed')),
  add column if not exists admin_note text,
  add column if not exists processed_at timestamptz,
  add column if not exists processed_by uuid references auth.users(id) on delete set null;

create index if not exists idx_atelier_messages_status_created
  on public.atelier_messages(admin_status, created_at desc);
