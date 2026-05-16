-- When a wide-layout sheet has year-less month headers (e.g. "November, December, January..."),
-- period_overrides supplies the actual date for each period column.
-- Keyed by column index (string): { "2": "2025-11-01", "3": "2025-12-01", ... }
alter table csv_imports add column if not exists period_overrides jsonb;
