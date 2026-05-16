-- Sync history per CSV import. One row per sync attempt. Powers the per-import "Last 10 runs"
-- panel in Integrations and gives us a trail to debug failed nightly syncs.

create table csv_sync_runs (
  id uuid primary key default gen_random_uuid(),
  csv_import_id uuid not null references csv_imports(id) on delete cascade,
  trigger text not null check (trigger in ('manual', 'cron')),
  started_at timestamptz default now(),
  finished_at timestamptz,
  rows_written int,
  rows_seen int,
  error_message text,
  duration_ms int
);
create index csv_sync_runs_import_idx on csv_sync_runs(csv_import_id, started_at desc);

alter table csv_sync_runs enable row level security;
create policy csv_sync_runs_all on csv_sync_runs
  for all using (
    exists (select 1 from csv_imports i where i.id = csv_import_id and public.can_access_client(i.client_id))
  ) with check (
    exists (select 1 from csv_imports i where i.id = csv_import_id and public.can_access_client(i.client_id))
  );
