-- CSV imports: lightweight Google-Sheet-via-published-CSV ingestion.
-- A client pastes a "publish to web → CSV" URL, AI proposes column↔indicator mappings,
-- the user confirms, and `/api/csv-import-sync` upserts measurements on demand.

create table csv_imports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  csv_url text not null,
  status text not null check (status in ('draft', 'active', 'disabled')) default 'draft',
  last_synced_at timestamptz,
  last_sync_rows int,
  last_sync_error text,
  created_at timestamptz default now()
);
create index csv_imports_client_idx on csv_imports(client_id);

create table csv_import_mappings (
  id uuid primary key default gen_random_uuid(),
  csv_import_id uuid not null references csv_imports(id) on delete cascade,
  indicator_id uuid not null references indicators(id) on delete cascade,
  value_column text not null,
  date_column text not null,
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly')) default 'monthly',
  unique (csv_import_id, indicator_id)
);
create index csv_import_mappings_import_idx on csv_import_mappings(csv_import_id);

alter table csv_imports enable row level security;
alter table csv_import_mappings enable row level security;

create policy csv_imports_all on csv_imports
  for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

create policy csv_import_mappings_all on csv_import_mappings
  for all using (
    exists (select 1 from csv_imports i where i.id = csv_import_id and public.can_access_client(i.client_id))
  ) with check (
    exists (select 1 from csv_imports i where i.id = csv_import_id and public.can_access_client(i.client_id))
  );
