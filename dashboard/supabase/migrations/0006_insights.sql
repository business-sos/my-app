-- Cross-area Insights — top-of-dashboard panel.
-- One run produces a headline + N specific insights. We cache the latest per client
-- so the UI loads instantly without re-running the LLM on every view.

create table insights (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  headline text,
  insights jsonb not null,           -- [{title, metric, dollar_impact, evidence, severity, action}]
  input_snapshot jsonb,              -- exact data we sent to the LLM, for audit / cache key
  model text,
  generated_for_period date,         -- latest measurement period included; lets us invalidate when new data lands
  created_at timestamptz default now()
);
create index insights_client_idx on insights(client_id, created_at desc);

alter table insights enable row level security;
create policy insights_all on insights
  for all using (public.can_access_client(client_id))
  with check (public.can_access_client(client_id));
