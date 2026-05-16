// Nightly CSV import sync. Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`.
// Iterates every csv_imports row with status='active' and runs the shared sync function.
//
// Configured in dashboard/vercel.json crons section.

import { createClient } from '@supabase/supabase-js';
import { runSync } from './_sync-runner.js';

export default async function handler(req, res) {
  // Auth: Vercel Cron pattern
  const auth = req.headers.authorization ?? '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Service-role client — bypasses RLS so we can sync every client.
  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const { data: imports, error } = await admin
    .from('csv_imports')
    .select('id, client_id, name')
    .eq('status', 'active');
  if (error) return res.status(500).json({ error: error.message });

  const summary = { total: imports.length, succeeded: 0, failed: 0, runs: [] };
  for (const imp of imports) {
    try {
      const result = await runSync(admin, imp.id, 'cron');
      summary.succeeded++;
      summary.runs.push({ id: imp.id, name: imp.name, ok: true, ...result });
    } catch (err) {
      summary.failed++;
      summary.runs.push({ id: imp.id, name: imp.name, ok: false, error: err.message });
    }
  }
  return res.status(200).json(summary);
}
