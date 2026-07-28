-- Per-estate activity log: who invited whom, who approved/edited what.
-- Modeled as a real table with an estate_id FK (matching the convention used
-- by invitations/stay_requests/estate_availability_rules), not a jsonb blob
-- (the estate_events.messages jsonb array was a one-off for comment threads,
-- not a general precedent). Rows are inserted explicitly from client store
-- actions, matching this codebase's existing style of client-driven writes
-- and SECURITY DEFINER RPCs -- there is no trigger-based automation anywhere
-- else in this schema, so none is introduced here either.

create table public.estate_activity_log (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references public.estates(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index estate_activity_log_estate_id_idx on public.estate_activity_log (estate_id);

alter table public.estate_activity_log enable row level security;

-- Append-only: no update/delete policies at all.

create policy "estate_activity_log_select_owner"
on public.estate_activity_log
for select
to authenticated
using (
  exists (
    select 1 from public.estates e
    where e.id = estate_activity_log.estate_id
      and e.owner_id = auth.uid()
  )
);

create policy "estate_activity_log_select_accepted_guest"
on public.estate_activity_log
for select
to authenticated
using (
  exists (
    select 1 from public.invitations i
    where i.estate_id = estate_activity_log.estate_id
      and i.guest_id = auth.uid()
      and i.status = 'accepted'
  )
);

create policy "estate_activity_log_insert_owner"
on public.estate_activity_log
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.estates e
    where e.id = estate_activity_log.estate_id
      and e.owner_id = auth.uid()
  )
);

create policy "estate_activity_log_insert_accepted_guest"
on public.estate_activity_log
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1 from public.invitations i
    where i.estate_id = estate_activity_log.estate_id
      and i.guest_id = auth.uid()
      and i.status = 'accepted'
  )
);
