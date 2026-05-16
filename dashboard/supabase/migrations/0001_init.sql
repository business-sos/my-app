-- Business Coaching Dashboard — initial schema
-- All tenant-scoped tables use RLS driven by client ownership.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tables
-- ============================================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id),
  role text not null check (role in ('coach', 'client')),
  display_name text,
  created_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_user_id uuid references auth.users(id),
  company_name text not null,
  created_at timestamptz default now()
);
create index clients_owner_idx on clients(owner_user_id);
create index clients_org_idx on clients(organization_id);

create table areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_label text not null,
  description text,
  display_order int not null default 0
);

create table indicators (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id),
  client_id uuid references clients(id) on delete cascade,  -- null = master pick-list
  name text not null,
  unit text,
  direction text not null check (direction in ('higher_better', 'lower_better')),
  target_cadence text not null check (target_cadence in ('weekly', 'monthly', 'quarterly')),
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index indicators_area_idx on indicators(area_id);
create index indicators_client_idx on indicators(client_id);

create table tracked_indicators (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  indicator_id uuid not null references indicators(id) on delete cascade,
  target_value numeric,
  started_at timestamptz default now(),
  unique (client_id, indicator_id)
);

create table measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  indicator_id uuid not null references indicators(id) on delete cascade,
  value numeric not null,
  period_start date not null,
  period_end date not null,
  source text not null check (source in ('manual', 'google_sheets', 'api')),
  source_ref text,
  notes text,
  entered_by uuid references auth.users(id),
  entered_at timestamptz default now(),
  unique (client_id, indicator_id, period_start)
);
create index measurements_client_period_idx on measurements(client_id, period_start desc);
create index measurements_indicator_idx on measurements(indicator_id, period_start desc);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  provider text not null check (provider in ('google_sheets')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  scope text,
  connected_at timestamptz default now(),
  last_synced_at timestamptz,
  unique (client_id, provider)
);

create table sheet_mappings (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  indicator_id uuid not null references indicators(id) on delete cascade,
  spreadsheet_id text not null,
  date_column_a1 text not null,
  value_column_a1 text not null,
  created_at timestamptz default now()
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  indicator_id uuid references indicators(id) on delete cascade,
  rule_code text not null,
  severity text not null check (severity in ('info', 'warn', 'critical')),
  message text not null,
  period_start date,
  acknowledged_at timestamptz,
  created_at timestamptz default now()
);
create index alerts_client_idx on alerts(client_id, created_at desc);

create table recommendations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  area_id uuid not null references areas(id),
  period_start date not null,
  body_md text not null,
  input_snapshot jsonb,
  model text,
  created_at timestamptz default now()
);
create index recommendations_lookup_idx on recommendations(client_id, area_id, period_start desc);

-- ============================================================================
-- Auth trigger: create profile row on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  intended_role text;
  org_name text;
  new_org_id uuid;
  target_client_id uuid;
begin
  -- raw_user_meta_data.role = 'coach' | 'client' (default client)
  -- Coaches: also create an organizations row using organization_name metadata.
  -- Clients invited by a coach: carry client_id metadata so we can claim that client row.
  intended_role := coalesce(new.raw_user_meta_data->>'role', 'client');

  if intended_role = 'coach' then
    org_name := coalesce(new.raw_user_meta_data->>'organization_name', split_part(new.email, '@', 2));
    insert into public.organizations (name) values (org_name) returning id into new_org_id;
    insert into public.profiles (id, role, display_name, organization_id)
    values (
      new.id, 'coach',
      coalesce(new.raw_user_meta_data->>'display_name', new.email),
      new_org_id
    );
  else
    target_client_id := nullif(new.raw_user_meta_data->>'client_id', '')::uuid;
    insert into public.profiles (id, role, display_name)
    values (
      new.id, 'client',
      coalesce(new.raw_user_meta_data->>'display_name', new.email)
    );
    if target_client_id is not null then
      update public.clients
         set owner_user_id = new.id
       where id = target_client_id and owner_user_id is null;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table areas enable row level security;
alter table indicators enable row level security;
alter table tracked_indicators enable row level security;
alter table measurements enable row level security;
alter table integrations enable row level security;
alter table sheet_mappings enable row level security;
alter table alerts enable row level security;
alter table recommendations enable row level security;

-- Helper: is the current user a coach in the given org?
create or replace function public.is_coach_in_org(org_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid()
      and role = 'coach'
      and organization_id = org_id
  );
$$;

-- Helper: can current user see the given client?
create or replace function public.can_access_client(target_client_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from clients c
    where c.id = target_client_id
      and (c.owner_user_id = auth.uid() or public.is_coach_in_org(c.organization_id))
  );
$$;

-- areas: public read, no write
create policy areas_read on areas for select using (true);

-- organizations: members can read
create policy orgs_read on organizations for select using (
  exists (select 1 from profiles where id = auth.uid() and organization_id = organizations.id)
);

-- profiles: user sees own profile; coaches see all profiles in their org
-- Uses the SECURITY DEFINER helper `is_coach_in_org` to avoid recursion into this very policy.
create policy profiles_read on profiles for select using (
  id = auth.uid()
  or public.is_coach_in_org(organization_id)
);
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- clients: owner or coach in same org
create policy clients_read on clients for select using (
  owner_user_id = auth.uid() or public.is_coach_in_org(organization_id)
);
create policy clients_write on clients for insert with check (public.is_coach_in_org(organization_id));
create policy clients_update on clients for update using (
  owner_user_id = auth.uid() or public.is_coach_in_org(organization_id)
);

-- indicators: master items public read; custom items follow client access
create policy indicators_read on indicators for select using (
  client_id is null or public.can_access_client(client_id)
);
create policy indicators_write on indicators for insert with check (
  client_id is not null and public.can_access_client(client_id)
);
create policy indicators_update on indicators for update using (
  client_id is not null and public.can_access_client(client_id)
);
create policy indicators_delete on indicators for delete using (
  client_id is not null and public.can_access_client(client_id)
);

-- tracked_indicators, measurements, alerts, recommendations, integrations, sheet_mappings
-- all follow can_access_client
create policy tracked_all on tracked_indicators for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
create policy measurements_all on measurements for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
create policy alerts_all on alerts for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
create policy recommendations_all on recommendations for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
create policy integrations_all on integrations for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
create policy sheet_mappings_all on sheet_mappings for all using (
  exists (select 1 from integrations i where i.id = sheet_mappings.integration_id and public.can_access_client(i.client_id))
) with check (
  exists (select 1 from integrations i where i.id = sheet_mappings.integration_id and public.can_access_client(i.client_id))
);
