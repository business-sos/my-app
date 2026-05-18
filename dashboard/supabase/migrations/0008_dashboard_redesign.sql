-- 0008_dashboard_redesign.sql
-- Dashboard redesign per Dashboard.docx spec:
--   - 4 areas (drop Systems Reliability)
--   - 17 standard indicators (some derived via JSON formulas)
--   - 6 base inputs (hidden from Dashboard, used by formulas)
--   - Auto-track all standard indicators for every new client
--   - New columns on indicators: slug, is_standard, is_input_only, formula, target_value_default
--
-- IN-PLACE upgrade: existing master indicators that match the new schema get their
-- slug + flags set; orphan masters (no tracked_indicators + no measurements) are
-- deleted. Existing client measurements + custom indicators are preserved.

---------------------------------------------------------------
-- 0. Allow 'derived' as a measurement source
---------------------------------------------------------------
alter table measurements drop constraint if exists measurements_source_check;
alter table measurements add constraint measurements_source_check
  check (source in ('manual', 'google_sheets', 'api', 'derived'));

---------------------------------------------------------------
-- 1. Extend indicators schema
---------------------------------------------------------------
alter table indicators
  add column if not exists slug text,
  add column if not exists is_standard boolean default false not null,
  add column if not exists is_input_only boolean default false not null,
  add column if not exists formula jsonb,
  add column if not exists target_value_default numeric;

-- Unique slug across the master pick-list (NULL client_id rows only).
create unique index if not exists indicators_master_slug_idx
  on indicators(slug) where client_id is null and slug is not null;

---------------------------------------------------------------
-- 2. Upgrade existing in-use master indicators in place
---------------------------------------------------------------
-- Map existing names -> new slugs so historical measurements survive.
update indicators set slug = 'revenue',          is_standard = true
  where client_id is null and name = 'Revenue';
update indicators set slug = 'new_customers',    is_standard = true
  where client_id is null and name = 'New customers';
update indicators set slug = 'churn',            is_standard = true
  where client_id is null and name = 'Churn rate';
update indicators set slug = 'cac',              is_standard = true,
  formula = '{"op":"divide","a":{"slug":"marketing_spend"},"b":{"slug":"new_customers"}}'::jsonb
  where client_id is null and name = 'Cost per acquisition';
update indicators set slug = 'conversion_rate',  is_standard = true
  where client_id is null and name = 'Lead-to-customer %';
update indicators set slug = 'nps',              is_standard = true
  where client_id is null and name = 'Net Promoter Score';
update indicators set slug = 'gross_margin_pct', is_standard = true,
  formula = '{"op":"divide","a":{"op":"subtract","a":{"slug":"revenue"},"b":{"slug":"cogs"}},"b":{"slug":"revenue"},"multiply":100}'::jsonb
  where client_id is null and name = 'Gross margin %';

---------------------------------------------------------------
-- 3. Delete orphan master indicators (no tracked, no measurements)
---------------------------------------------------------------
-- Includes all 4 Systems Reliability indicators (confirmed: 0 references).
delete from indicators
  where client_id is null
    and slug is null   -- only those we did NOT just upgrade above
    and id not in (select indicator_id from tracked_indicators where indicator_id is not null)
    and id not in (select indicator_id from measurements where indicator_id is not null);

---------------------------------------------------------------
-- 4. Drop Systems Reliability area (after its indicators are gone)
---------------------------------------------------------------
-- Sanity: if any indicators still point at it, fail loudly rather than cascade.
do $$
declare
  remaining int;
begin
  select count(*) into remaining from indicators
    where area_id = (select id from areas where slug = 'systems');
  if remaining > 0 then
    raise exception 'Cannot drop systems area: % indicators still reference it', remaining;
  end if;
end $$;
delete from areas where slug = 'systems';

---------------------------------------------------------------
-- 5. Insert remaining standard indicators + base inputs
---------------------------------------------------------------
-- Helper: get area ids by slug.
with a as (
  select slug, id from areas
)
insert into indicators (
  area_id, client_id, name, slug, unit, direction, target_cadence,
  is_standard, is_input_only, formula, description, is_active
)
select
  (select id from a where a.slug = src.area_slug),
  null,
  src.name, src.slug, src.unit, src.direction, src.cadence,
  src.is_standard, src.is_input_only, src.formula::jsonb,
  src.description, true
from (values
  -- ACQUISITION
  ('acquisition','Leads',                          'leads',            'count','higher_better','monthly',  true, false, null,                                                                                                                                              'Top-of-funnel volume.'),
  ('acquisition','Conversion Rate',                'conversion_rate',  '%',    'higher_better','monthly',  true, false, null,                                                                                                                                              'Lead-to-customer conversion.'),
  ('acquisition','New Customers',                  'new_customers',    'count','higher_better','monthly',  true, false, null,                                                                                                                                              'Customers won this period.'),
  ('acquisition','Current Customers',              'current_customers','count','higher_better','monthly',  true, false, null,                                                                                                                                              'Active customer count.'),
  ('acquisition','Customer Acquisition Cost',      'cac',              '$',    'lower_better', 'monthly',  true, false, '{"op":"divide","a":{"slug":"marketing_spend"},"b":{"slug":"new_customers"}}',                                                                       'Marketing spend per new customer.'),
  -- FINANCE
  ('finance',    'Revenue',                        'revenue',          '$',    'higher_better','monthly',  true, false, null,                                                                                                                                              'Top-line revenue.'),
  ('finance',    'Gross Margin',                   'gross_margin_pct', '%',    'higher_better','monthly',  true, false, '{"op":"divide","a":{"op":"subtract","a":{"slug":"revenue"},"b":{"slug":"cogs"}},"b":{"slug":"revenue"},"multiply":100}',                          'Gross profit as % of revenue.'),
  ('finance',    'Net Profit',                     'net_profit',       '$',    'higher_better','monthly',  true, false, null,                                                                                                                                              'Bottom-line profit after all costs.'),
  ('finance',    'Net Margin',                     'net_margin_pct',   '%',    'higher_better','monthly',  true, false, '{"op":"divide","a":{"slug":"net_profit"},"b":{"slug":"revenue"},"multiply":100}',                                                                  'Net profit as % of revenue.'),
  ('finance',    'Cashflow Forecast Low Point',    'cashflow_low_point','$',   'higher_better','monthly',  true, false, null,                                                                                                                                              'Lowest projected cash balance over the forward horizon (notes = forecast date).'),
  -- CARE
  ('care',       'Churn',                          'churn',            '%',    'lower_better', 'monthly',  true, false, null,                                                                                                                                              'Customer churn rate.'),
  ('care',       'Transactions per customer / yr', 'transactions_per_customer_year','count','higher_better','monthly', true, false, '{"op":"divide","a":{"slug":"transactions"},"b":{"slug":"current_customers"},"multiply":12}',                                            'Annualised transactions per active customer.'),
  ('care',       'Customer Lifetime Value',        'clv',              '$',    'higher_better','monthly',  true, false, null,                                                                                                                                              'Average revenue earned over a customer''s lifetime.'),
  ('care',       'Net Promoter Score',             'nps',              'score','higher_better','quarterly',true, false, null,                                                                                                                                              'Quarterly NPS survey result.'),
  ('care',       'Average $ Sale',                 'avg_sale',         '$',    'higher_better','monthly',  true, false, '{"op":"divide","a":{"slug":"revenue"},"b":{"slug":"transactions"}}',                                                                                'Revenue per transaction.'),
  -- TEAM
  ('team',       'Wages as % of Sales',            'wages_pct_sales',  '%',    'lower_better', 'monthly',  true, false, '{"op":"divide","a":{"op":"add","terms":[{"slug":"wages"},{"slug":"superannuation"}]},"b":{"slug":"revenue"},"multiply":100}',                      'Total labour cost as a share of revenue.'),
  ('team',       'Profit per employee',            'profit_per_employee','$',  'higher_better','monthly',  true, false, '{"op":"divide","a":{"slug":"net_profit"},"b":{"slug":"employee_count"}}',                                                                          'Productivity proxy.'),
  ('team',       'Staff Turnover',                 'staff_turnover',   '%',    'lower_better', 'quarterly',true, false, null,                                                                                                                                              'Voluntary + involuntary leavers as % of headcount.'),
  -- BASE INPUTS (hidden from Dashboard tile grid; visible only in Data Entry → Inputs)
  ('finance',    'Marketing spend',                'marketing_spend',  '$',    'lower_better', 'monthly',  false, true, null,                                                                                                                                              'Total marketing spend. Feeds CAC.'),
  ('finance',    'COGS',                           'cogs',             '$',    'lower_better', 'monthly',  false, true, null,                                                                                                                                              'Cost of goods sold. Feeds Gross Margin.'),
  ('team',       'Wages',                          'wages',            '$',    'lower_better', 'monthly',  false, true, null,                                                                                                                                              'Total wages bill. Feeds Wages % of Sales.'),
  ('team',       'Superannuation',                 'superannuation',   '$',    'lower_better', 'monthly',  false, true, null,                                                                                                                                              'Total superannuation contributions.'),
  ('team',       'Employee count',                 'employee_count',   'count','higher_better','monthly',  false, true, null,                                                                                                                                              'Total headcount including FTE-equivalents.'),
  ('care',       'Transactions',                   'transactions',     'count','higher_better','monthly',  false, true, null,                                                                                                                                              'Transactions completed in the period.')
) as src(area_slug, name, slug, unit, direction, cadence, is_standard, is_input_only, formula, description)
on conflict do nothing;  -- if a slug already exists from step 2, leave it alone

---------------------------------------------------------------
-- 6. Auto-track trigger: every new client gets all standard indicators
---------------------------------------------------------------
create or replace function auto_track_standard_indicators()
returns trigger language plpgsql as $$
begin
  insert into tracked_indicators (client_id, indicator_id, target_value)
  select new.id, i.id, i.target_value_default
  from indicators i
  where i.client_id is null and i.is_standard = true
  on conflict (client_id, indicator_id) do nothing;
  return new;
end $$;

drop trigger if exists trg_auto_track on clients;
create trigger trg_auto_track after insert on clients
  for each row execute procedure auto_track_standard_indicators();

---------------------------------------------------------------
-- 7. Backfill existing clients with the standard indicator set
---------------------------------------------------------------
-- Adds tracked_indicator rows for any (client, standard_indicator) pair not
-- already tracked. Does NOT touch existing tracked rows (preserves custom
-- target_values the user has set).
insert into tracked_indicators (client_id, indicator_id, target_value)
select c.id, i.id, i.target_value_default
from clients c
cross join indicators i
where i.client_id is null and i.is_standard = true
on conflict (client_id, indicator_id) do nothing;
