-- Seed the 5 Questions of Business Health + starter indicators.
-- Safe to re-run: uses conflict handling on slugs/names.

insert into areas (slug, title, short_label, description, display_order) values
  ('acquisition', 'How well are we growing our customer base?',
   'Customer Acquisition',
   'Measures relevance in the market. Are you winning new business consistently? Are your offers resonating with the right people?', 1),
  ('care', 'How well are we looking after our customers?',
   'Customer Care',
   'Retention, satisfaction, and advocacy show whether you''re creating real value. Growth is meaningless if it leaks out the bottom.', 2),
  ('team', 'How strong is the team?',
   'Team Strength',
   'A business is just a group of people working toward shared goals. Engagement, capability, and accountability.', 3),
  ('systems', 'How reliable are our systems?',
   'Systems Reliability',
   'Consistency creates trust. Reliable systems ensure promises made to customers are consistently kept.', 4),
  ('finance', 'How strong is our financial position?',
   'Financial Position',
   'Profit and cash flow are the scoreboard of truth. Financial strength shows whether your model is sustainable and scalable.', 5)
on conflict (slug) do update
  set title = excluded.title,
      short_label = excluded.short_label,
      description = excluded.description,
      display_order = excluded.display_order;

-- Starter master indicator pick-list (client_id = null)
-- Each is attached to an area by slug lookup.
with a as (select id, slug from areas)
insert into indicators (area_id, client_id, name, unit, direction, target_cadence, description)
select a.id, null, i.name, i.unit, i.direction, i.cadence, i.description
from a
join (values
  -- Customer Acquisition
  ('acquisition', 'New leads',                'count', 'higher_better', 'weekly',  'New qualified leads captured this period'),
  ('acquisition', 'New customers',            'count', 'higher_better', 'monthly', 'First-time paying customers this period'),
  ('acquisition', 'Cost per acquisition',     '$',     'lower_better',  'monthly', 'Total marketing spend / new customers'),
  ('acquisition', 'Lead-to-customer %',       '%',     'higher_better', 'monthly', 'Conversion rate from lead to paying customer'),

  -- Customer Care
  ('care',        'Net Promoter Score',       'score', 'higher_better', 'quarterly', 'Likelihood customers would recommend you (-100 to +100)'),
  ('care',        'Churn rate',               '%',     'lower_better',  'monthly',  '% of customers lost this period'),
  ('care',        'Customer retention %',     '%',     'higher_better', 'monthly',  '% of customers retained from prior period'),
  ('care',        'Support tickets resolved', 'count', 'higher_better', 'weekly',   'Number of support issues closed this period'),

  -- Team Strength
  ('team',        'Team engagement score',    'score', 'higher_better', 'quarterly', 'Pulse survey result (0-10)'),
  ('team',        'Voluntary turnover %',     '%',     'lower_better',  'quarterly', '% of team who left voluntarily'),
  ('team',        'Open roles',               'count', 'lower_better',  'monthly',   'Unfilled positions'),
  ('team',        '1:1s completed',           'count', 'higher_better', 'weekly',    'Manager-direct-report 1:1s held this period'),

  -- Systems Reliability
  ('systems',     'On-time delivery %',       '%',     'higher_better', 'weekly',  '% of commitments delivered on time'),
  ('systems',     'Defect rate',              '%',     'lower_better',  'monthly', '% of output with quality issues'),
  ('systems',     'Process documentation %',  '%',     'higher_better', 'quarterly','% of key processes documented'),
  ('systems',     'Incidents',                'count', 'lower_better',  'weekly',  'Unplanned outages or process failures'),

  -- Financial Position
  ('finance',     'Revenue',                  '$',     'higher_better', 'monthly', 'Total revenue for the period'),
  ('finance',     'Gross margin %',           '%',     'higher_better', 'monthly', '(Revenue - COGS) / Revenue'),
  ('finance',     'Cash balance',             '$',     'higher_better', 'monthly', 'Cash on hand at period end'),
  ('finance',     'Runway (months)',          'count', 'higher_better', 'monthly', 'Cash / average monthly burn'),
  ('finance',     'Accounts receivable days', 'count', 'lower_better',  'monthly', 'Average days to collect receivables')
) as i(area_slug, name, unit, direction, cadence, description) on a.slug = i.area_slug
on conflict do nothing;
