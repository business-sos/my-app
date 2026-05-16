-- Financial Analysis feature — tables, Storage bucket, RLS policies.
-- Depends on can_access_client() from 0001_init.sql.

-- ============================================================================
-- Tables
-- ============================================================================

create table financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  period_month date not null,
  reports_included text[] not null default '{}',
  status text not null check (status in ('draft', 'confirmed')) default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  unique (client_id, period_month)
);
create index financial_snapshots_client_period_idx on financial_snapshots(client_id, period_month desc);

create table financial_files (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references financial_snapshots(id) on delete cascade,
  report_type text not null check (report_type in ('balance_sheet', 'profit_loss', 'cashflow')),
  storage_path text not null,
  original_filename text,
  size_bytes int,
  uploaded_at timestamptz default now(),
  unique (snapshot_id, report_type)
);

create table financial_line_items (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references financial_snapshots(id) on delete cascade,
  report_type text not null check (report_type in ('balance_sheet', 'profit_loss', 'cashflow')),
  data jsonb not null,
  extraction_model text,
  created_at timestamptz default now(),
  unique (snapshot_id, report_type)
);

create table financial_analyses (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references financial_snapshots(id) on delete cascade,
  ratios jsonb not null,
  narrative_md text,
  concerns jsonb default '[]'::jsonb,
  model text,
  created_at timestamptz default now()
);
create index financial_analyses_snapshot_idx on financial_analyses(snapshot_id, created_at desc);

-- ============================================================================
-- RLS
-- ============================================================================

alter table financial_snapshots enable row level security;
alter table financial_files enable row level security;
alter table financial_line_items enable row level security;
alter table financial_analyses enable row level security;

create policy fin_snapshots_all on financial_snapshots
  for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));

create policy fin_files_all on financial_files
  for all using (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  ) with check (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  );

create policy fin_items_all on financial_line_items
  for all using (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  ) with check (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  );

create policy fin_analyses_all on financial_analyses
  for all using (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  ) with check (
    exists (select 1 from financial_snapshots s where s.id = snapshot_id and public.can_access_client(s.client_id))
  );

-- ============================================================================
-- Storage bucket + policies
-- Files stored at: {client_id}/{snapshot_id}/{report_type}.{ext}
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('financial-uploads', 'financial-uploads', false)
on conflict (id) do nothing;

-- Users can upload/read/delete only under client_ids they can access.
create policy fin_storage_read on storage.objects
  for select using (
    bucket_id = 'financial-uploads'
    and public.can_access_client((string_to_array(name, '/'))[1]::uuid)
  );

create policy fin_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'financial-uploads'
    and public.can_access_client((string_to_array(name, '/'))[1]::uuid)
  );

create policy fin_storage_update on storage.objects
  for update using (
    bucket_id = 'financial-uploads'
    and public.can_access_client((string_to_array(name, '/'))[1]::uuid)
  );

create policy fin_storage_delete on storage.objects
  for delete using (
    bucket_id = 'financial-uploads'
    and public.can_access_client((string_to_array(name, '/'))[1]::uuid)
  );
