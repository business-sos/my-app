-- Add layout awareness to CSV imports.
--   'long'  = one row per (period, value); columns are indicators (the original assumption)
--   'wide'  = one row per indicator; columns are periods. Common in business KPI dashboards.

alter table csv_imports
  add column if not exists layout text not null check (layout in ('long', 'wide')) default 'long',
  add column if not exists label_column text,   -- wide only: which column holds the indicator label (defaults to first column)
  add column if not exists header_row int default 1;  -- wide only: 1-indexed row that contains period headers

-- For wide layout, csv_import_mappings.value_column holds the **row label** (cell value in label_column).
-- For wide layout, csv_import_mappings.date_column is unused (null).
-- We relax the not-null on date_column to allow this.
alter table csv_import_mappings alter column date_column drop not null;
