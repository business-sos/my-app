// Manual trigger for the derivation runner.
// Body: { client_id, periods: string[], changed_slugs?: string[] }
// Auth: end-user JWT (RLS applies).
//
// Use this after writing base-input measurements through the regular client.

import { createClient } from '@supabase/supabase-js';
import { deriveForClient } from './_derive.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { client_id, periods, changed_slugs } = req.body ?? {};
  if (!client_id || !Array.isArray(periods) || periods.length === 0) {
    return res.status(400).json({ error: 'client_id and periods[] required' });
  }
  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const changedSet = Array.isArray(changed_slugs) && changed_slugs.length > 0
    ? new Set(changed_slugs)
    : undefined;

  try {
    const result = await deriveForClient({
      supabase,
      clientId: client_id,
      periods,
      changedSlugs: changedSet,
      userId: user?.id ?? null,
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
