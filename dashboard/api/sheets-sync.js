// Pulls all configured sheet_mappings for a client (or all clients if run by cron)
// and upserts measurements. Also re-evaluates the rules engine and persists alerts.
//
// Invocation:
//   POST /api/sheets-sync         - requires bearer JWT, syncs current user's clients
//   GET  /api/sheets-sync?cron=1  - runs for all integrations (call from Vercel Cron with a secret)

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import crypto from 'node:crypto';
import { evaluateRules } from '../src/lib/rules.js';

const ALGO = 'aes-256-gcm';

function decrypt(blob, keyHex) {
  if (!blob) return null;
  const [ivB64, tagB64, encB64] = blob.split('.');
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

function periodBoundsFor(cadence, dateStr) {
  // All UTC to avoid timezone off-by-one.
  const d = new Date(dateStr);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const iso = x => x.toISOString().slice(0, 10);
  if (cadence === 'weekly') {
    const dow = d.getUTCDay();
    const start = new Date(Date.UTC(y, m, day - dow));
    const end = new Date(Date.UTC(y, m, day - dow + 6));
    return [iso(start), iso(end)];
  }
  if (cadence === 'monthly') {
    return [iso(new Date(Date.UTC(y, m, 1))), iso(new Date(Date.UTC(y, m + 1, 0)))];
  }
  const q = Math.floor(m / 3);
  return [iso(new Date(Date.UTC(y, q * 3, 1))), iso(new Date(Date.UTC(y, q * 3 + 3, 0)))];
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

async function syncOneIntegration(supabase, integration) {
  const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const refreshToken = decrypt(integration.refresh_token_encrypted, encKey);
  const tokens = await refreshAccessToken(refreshToken);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: tokens.access_token });
  const sheets = google.sheets({ version: 'v4', auth });

  const { data: mappings } = await supabase
    .from('sheet_mappings')
    .select('id, indicator_id, spreadsheet_id, date_column_a1, value_column_a1, indicator:indicators(target_cadence, direction, name)')
    .eq('integration_id', integration.id);

  let rowsWritten = 0;
  for (const m of mappings ?? []) {
    const resp = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: m.spreadsheet_id,
      ranges: [m.date_column_a1, m.value_column_a1],
    });
    const dates = resp.data.valueRanges?.[0]?.values ?? [];
    const values = resp.data.valueRanges?.[1]?.values ?? [];

    for (let i = 0; i < Math.min(dates.length, values.length); i++) {
      const dateStr = dates[i][0];
      const val = Number(values[i][0]);
      if (!dateStr || Number.isNaN(val)) continue;
      const [period_start, period_end] = periodBoundsFor(m.indicator.target_cadence, dateStr);
      const { error } = await supabase
        .from('measurements')
        .upsert({
          client_id: integration.client_id,
          indicator_id: m.indicator_id,
          value: val,
          period_start,
          period_end,
          source: 'google_sheets',
          source_ref: `${m.spreadsheet_id} ${m.value_column_a1}[${i}]`,
        }, { onConflict: 'client_id,indicator_id,period_start' });
      if (!error) rowsWritten++;
    }

    // Rule evaluation for this indicator
    const { data: allMs } = await supabase
      .from('measurements')
      .select('*')
      .eq('client_id', integration.client_id)
      .eq('indicator_id', m.indicator_id)
      .order('period_start', { ascending: true });
    const { data: tracked } = await supabase
      .from('tracked_indicators')
      .select('target_value')
      .eq('client_id', integration.client_id)
      .eq('indicator_id', m.indicator_id)
      .maybeSingle();
    const alerts = evaluateRules(m.indicator, allMs ?? [], tracked ?? {});
    for (const a of alerts) {
      await supabase
        .from('alerts')
        .upsert({
          client_id: integration.client_id,
          indicator_id: m.indicator_id,
          rule_code: a.rule_code,
          severity: a.severity,
          message: a.message,
          period_start: a.period_start,
        }, { onConflict: 'client_id,indicator_id,rule_code,period_start', ignoreDuplicates: true });
    }
  }

  await supabase
    .from('integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integration.id);

  return rowsWritten;
}

export default async function handler(req, res) {
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Cron path: all integrations. Vercel Cron sends Authorization: Bearer <CRON_SECRET>.
  if (req.method === 'GET' && req.query?.cron === '1') {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (req.headers.authorization !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { data: integrations } = await admin.from('integrations').select('*');
    let total = 0;
    for (const integ of integrations ?? []) {
      total += await syncOneIntegration(admin, integ);
    }
    return res.status(200).json({ rows: total, integrations: integrations?.length ?? 0 });
  }

  // User path: authenticated, sync current user's clients
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const userSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { client_id } = req.body ?? {};
  const query = userSupabase.from('integrations').select('*');
  const { data: visible } = client_id ? await query.eq('client_id', client_id) : await query;

  let total = 0;
  for (const integ of visible ?? []) {
    total += await syncOneIntegration(admin, integ); // admin client for writes; access was authorized via RLS read above
  }
  return res.status(200).json({ rows: total });
}
