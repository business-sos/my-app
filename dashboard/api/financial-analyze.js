// Compute ratios + generate narrative + persist financial_analyses row.
// Body: { snapshot_id, edits? }  -- edits optional: per-report user-edited line items
// Returns: { analysis }

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { computeRatios, detectConcerns, RATIO_CATALOG, formatRatio } from '../src/lib/financial.js';
import { deriveAfterWrite } from './_derive.js';

const MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { snapshot_id, edits } = req.body ?? {};
  if (!snapshot_id) return res.status(400).json({ error: 'snapshot_id required' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Load the snapshot + its line items
  const { data: snap, error: snapErr } = await supabase
    .from('financial_snapshots')
    .select('id, client_id, period_month, reports_included')
    .eq('id', snapshot_id)
    .single();
  if (snapErr || !snap) return res.status(404).json({ error: 'Snapshot not found' });

  // Apply edits if provided
  if (edits && typeof edits === 'object') {
    for (const [report_type, data] of Object.entries(edits)) {
      await supabase
        .from('financial_line_items')
        .upsert({ snapshot_id, report_type, data }, { onConflict: 'snapshot_id,report_type' });
    }
  }

  const { data: items } = await supabase
    .from('financial_line_items')
    .select('report_type, data')
    .eq('snapshot_id', snapshot_id);

  const lineItems = {};
  for (const i of items ?? []) lineItems[i.report_type] = i.data;

  const { ratios } = computeRatios(lineItems);

  // Stash net_income into ratios payload so history-based runway detection can see it
  const pl = lineItems.profit_loss ?? {};
  ratios._net_income = pl.net_income ?? null;
  ratios._cash = lineItems.balance_sheet?.cash ?? null;

  // --- Base-input measurements from the P&L ---
  // Push the P&L's raw numbers into the corresponding base-input indicators
  // (revenue, cogs, marketing_spend, wages, net_profit). The derivation runner
  // then auto-computes any derived metric that depends on them (CAC, gross
  // margin %, net margin %, wages % of sales, profit per employee, etc.).
  const periodStart = snap.period_month;
  const [py, pm] = periodStart.split('-').map(Number);
  const periodEnd = new Date(Date.UTC(py, pm, 0)).toISOString().slice(0, 10);
  const { data: { user } } = await supabase.auth.getUser();

  const SLUG_FROM_PL = {
    revenue: pl.revenue,
    cogs: pl.cogs,
    marketing_spend: pl.sales_marketing_expense,
    wages: pl.salaries_wages ?? pl.wages,
    net_profit: pl.net_income,
  };
  const baseInputRows = Object.entries(SLUG_FROM_PL)
    .filter(([_slug, v]) => v != null && Number.isFinite(Number(v)));

  let derivationStats = { computed: 0 };
  if (baseInputRows.length > 0) {
    const { data: inds } = await supabase
      .from('indicators')
      .select('id, slug')
      .is('client_id', null)
      .in('slug', baseInputRows.map(([s]) => s));
    const idBySlug = new Map((inds ?? []).map(i => [i.slug, i.id]));

    const writes = [];
    for (const [slug, raw] of baseInputRows) {
      const indId = idBySlug.get(slug);
      if (!indId) continue;
      writes.push({
        client_id: snap.client_id,
        indicator_id: indId,
        value: Number(raw),
        period_start: periodStart,
        period_end: periodEnd,
        source: 'api',
        source_ref: `pl:snapshot=${snapshot_id}`,
        notes: `Auto-pushed from P&L (${slug})`,
        entered_by: user?.id,
      });
    }
    if (writes.length > 0) {
      // Make sure each base-input indicator is tracked (so it's visible in
      // Data Entry → Inputs and pickable in the Raw data view).
      await supabase
        .from('tracked_indicators')
        .upsert(
          writes.map(w => ({ client_id: w.client_id, indicator_id: w.indicator_id })),
          { onConflict: 'client_id,indicator_id' }
        );
      await supabase
        .from('measurements')
        .upsert(writes, { onConflict: 'client_id,indicator_id,period_start' });

      derivationStats = await deriveAfterWrite({
        supabase,
        rows: writes.map(w => ({ client_id: w.client_id, indicator_id: w.indicator_id, period_start: w.period_start })),
        userId: user?.id,
      });
    }
  }
  // Surface the derived CAC into the ratios snapshot so the narrative can reference it.
  if (derivationStats.computed > 0) {
    const { data: cacRow } = await supabase
      .from('indicators')
      .select('id')
      .is('client_id', null)
      .eq('slug', 'cac')
      .maybeSingle();
    if (cacRow?.id) {
      const { data: cacMeas } = await supabase
        .from('measurements')
        .select('value')
        .eq('client_id', snap.client_id)
        .eq('indicator_id', cacRow.id)
        .eq('period_start', periodStart)
        .maybeSingle();
      if (cacMeas?.value != null) ratios.cac = Number(cacMeas.value);
    }
  }

  // Fetch prior confirmed snapshots for this client (oldest to newest for trend, we'll reverse)
  const { data: historyRaw } = await supabase
    .from('financial_snapshots')
    .select('period_month, financial_analyses(ratios)')
    .eq('client_id', snap.client_id)
    .eq('status', 'confirmed')
    .lt('period_month', snap.period_month)
    .order('period_month', { ascending: false })
    .limit(6);

  const history = (historyRaw ?? [])
    .map(h => ({ period_month: h.period_month, ratios: h.financial_analyses?.[0]?.ratios ?? {} }))
    .filter(h => Object.keys(h.ratios).length > 0);

  const concerns = detectConcerns(ratios, history);

  // Narrative via Claude
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables → Production, then redeploy.',
    });
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = `You are a business coach reviewing a monthly financial snapshot for a client. You are pragmatic, specific, and opinionated. You reference actual numbers. You flag what the coach should address in the next session. Keep total response under 300 words. Use markdown with short bullet points.`;

  const userPrompt = `Period: ${snap.period_month}
Reports included: ${snap.reports_included.join(', ') || 'none'}

Current ratios (null = not computable this month):
${RATIO_CATALOG.map(r => `- ${r.label}: ${formatRatio(r.key, ratios[r.key])}`).join('\n')}

Prior 6 months (newest first) for trend context:
${history.length ? history.map(h => `- ${h.period_month}: ${Object.entries(h.ratios).filter(([k]) => !k.startsWith('_')).map(([k,v]) => `${k}=${v==null?'—':Number(v).toFixed(2)}`).join(', ')}`).join('\n') : '(no prior snapshots)'}

Deterministic concerns already flagged:
${concerns.length ? concerns.map(c => `- [${c.severity}] ${c.message}`).join('\n') : '(none)'}

Write a short coaching commentary for this month. Structure:
- **Bottom line** — one sentence assessment.
- **What's working** — 1-2 bullets, if anything is.
- **What needs attention** — 1-3 bullets tied to the actual numbers (reference the concerns above where relevant, but add your own if the data shows something the deterministic rules missed).
- **Suggested coach questions** — 2-3 questions for the next coaching session.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const narrative = response.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();

  // Persist
  const { data: analysis, error: persistErr } = await supabase
    .from('financial_analyses')
    .insert({
      snapshot_id,
      ratios,
      narrative_md: narrative,
      concerns,
      model: MODEL,
    })
    .select()
    .single();
  if (persistErr) return res.status(500).json({ error: persistErr.message });

  // Mark snapshot confirmed
  await supabase
    .from('financial_snapshots')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', snapshot_id);

  return res.status(200).json({ analysis });
}
