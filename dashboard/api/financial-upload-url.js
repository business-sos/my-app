// Returns a signed upload URL for Supabase Storage and creates/upserts the
// corresponding financial_snapshots + financial_files rows in `draft` state.
//
// Body: { client_id, period_month, report_type }
// Returns: { snapshot_id, file_id, upload: { url, token, path } }

import { createClient } from '@supabase/supabase-js';

const ALLOWED_REPORTS = ['balance_sheet', 'profit_loss', 'cashflow'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { client_id, period_month, report_type } = req.body ?? {};
  if (!client_id || !period_month || !report_type) {
    return res.status(400).json({ error: 'client_id, period_month, report_type required' });
  }
  if (!ALLOWED_REPORTS.includes(report_type)) {
    return res.status(400).json({ error: 'invalid report_type' });
  }

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });

  // Upsert the snapshot
  const { data: snap, error: snapErr } = await supabase
    .from('financial_snapshots')
    .upsert({
      client_id,
      period_month,
      status: 'draft',
      created_by: user.id,
    }, { onConflict: 'client_id,period_month' })
    .select()
    .single();
  if (snapErr) return res.status(403).json({ error: snapErr.message });

  // Add report_type to reports_included (idempotent)
  if (!snap.reports_included?.includes(report_type)) {
    await supabase
      .from('financial_snapshots')
      .update({ reports_included: [...(snap.reports_included ?? []), report_type] })
      .eq('id', snap.id);
  }

  const path = `${client_id}/${snap.id}/${report_type}`;

  // Create/update the financial_files row
  const { data: fileRow, error: fileErr } = await supabase
    .from('financial_files')
    .upsert({
      snapshot_id: snap.id,
      report_type,
      storage_path: path,
    }, { onConflict: 'snapshot_id,report_type' })
    .select()
    .single();
  if (fileErr) return res.status(500).json({ error: fileErr.message });

  // Issue a signed upload URL from Storage (user JWT + RLS gates access)
  const { data: uploadInfo, error: uploadErr } = await supabase.storage
    .from('financial-uploads')
    .createSignedUploadUrl(path, { upsert: true });
  if (uploadErr) return res.status(500).json({ error: uploadErr.message });

  return res.status(200).json({
    snapshot_id: snap.id,
    file_id: fileRow.id,
    upload: uploadInfo,
    path,
  });
}
