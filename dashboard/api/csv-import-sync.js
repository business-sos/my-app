// User-triggered CSV import sync. Validates the JWT, then defers to the shared
// runner so the same logic runs from the nightly cron too.
//
// Body: { csv_import_id }

import { createClient } from '@supabase/supabase-js';
import { runSync } from './_sync-runner.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { csv_import_id } = req.body ?? {};
  if (!csv_import_id) return res.status(400).json({ error: 'csv_import_id required' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();

  try {
    const result = await runSync(supabase, csv_import_id, 'manual', user?.id);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
