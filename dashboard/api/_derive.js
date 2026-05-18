// Server-side derivation runner. Invoked after any base-input measurement is
// written (manual entry, CSV sync, P&L extract). For each affected period,
// recomputes derived indicators that depend on the changed slug and upserts
// them as measurements with source='derived'.
//
// Pure I/O wrapper around src/lib/formulas.js — same evaluator runs in browser
// and server.
//
// Usage:
//   import { deriveForClient } from './_derive.js';
//   await deriveForClient({ supabase, clientId, periods: ['2026-04-01', ...], changedSlugs?: Set });

import { evalFormula, inputSlugs, derivationOrder } from '../src/lib/formulas.js';

/**
 * Run derivation for one client across a set of periods.
 *
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   clientId: string,
 *   periods: string[],       // YYYY-MM-DD strings (period_start)
 *   changedSlugs?: Set<string>,  // optional filter; if set, only derived metrics
 *                                // whose formula references one of these slugs
 *                                // are recomputed
 *   userId?: string,         // for entered_by; null in cron context
 * }} args
 */
export async function deriveForClient({ supabase, clientId, periods, changedSlugs, userId = null }) {
  if (!periods || periods.length === 0) return { computed: 0 };

  // 1. Fetch all master indicators (we only derive against master/standard slugs).
  const { data: indicators, error: indErr } = await supabase
    .from('indicators')
    .select('id, slug, name, unit, formula, target_cadence')
    .is('client_id', null);
  if (indErr) throw indErr;

  const bySlug = new Map(indicators.filter(i => i.slug).map(i => [i.slug, i]));
  const derived = indicators.filter(i => i.slug && i.formula);

  // 2. Determine which derived metrics need recomputing.
  const targets = (changedSlugs && changedSlugs.size > 0)
    ? derived.filter(d => {
        const inputs = inputSlugs(d.formula);
        for (const s of inputs) if (changedSlugs.has(s)) return true;
        return false;
      })
    : derived;
  if (targets.length === 0) return { computed: 0 };

  // 3. Topological order (so an indicator that depends on another derived value
  // sees the freshly-computed upstream).
  const order = derivationOrder(targets);
  const targetIds = new Set(targets.map(t => t.id));

  // 4. Fetch all measurements for this client across the affected periods so we
  // can evaluate locally without per-cell round trips.
  const { data: rows, error: mErr } = await supabase
    .from('measurements')
    .select('indicator_id, value, period_start, period_end')
    .eq('client_id', clientId)
    .in('period_start', periods);
  if (mErr) throw mErr;

  const indicatorBySlug = bySlug;
  const valueByPeriodSlug = new Map(); // `${period}|${slug}` -> number
  for (const r of rows) {
    // map indicator_id -> slug (only master indicators have slugs)
    const indById = indicators.find(i => i.id === r.indicator_id);
    if (!indById || !indById.slug) continue;
    valueByPeriodSlug.set(`${r.period_start}|${indById.slug}`, Number(r.value));
  }

  // 5. Evaluate each derived metric for each period.
  const upserts = [];
  for (const period of periods) {
    for (const slug of order) {
      const ind = indicatorBySlug.get(slug);
      if (!ind || !targetIds.has(ind.id)) continue;
      const getValue = (s) => valueByPeriodSlug.get(`${period}|${s}`);
      const value = evalFormula(ind.formula, getValue);
      if (value == null || !Number.isFinite(value)) continue;
      // Period end: derive monthly default (end of month). Caller already gave
      // us a YYYY-MM-DD period_start; we compute the matching month-end.
      const [y, m] = period.split('-').map(Number);
      const periodEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); // last day of month m (1-12)
      upserts.push({
        client_id: clientId,
        indicator_id: ind.id,
        value,
        period_start: period,
        period_end: periodEnd,
        source: 'derived',
        notes: 'Auto-derived from base inputs',
        entered_by: userId,
      });
      // Make the freshly-computed value visible to downstream derivations.
      valueByPeriodSlug.set(`${period}|${slug}`, value);
    }
  }

  if (upserts.length === 0) return { computed: 0 };

  const { error: upErr } = await supabase
    .from('measurements')
    .upsert(upserts, { onConflict: 'client_id,indicator_id,period_start' });
  if (upErr) throw upErr;

  return { computed: upserts.length };
}

/**
 * Convenience: given a set of measurement rows that were just written, derive
 * for the affected periods. Pulls clientId + changedSlugs out of the rows.
 *
 * @param {{ supabase, rows: Array<{ client_id, indicator_id, period_start }>, userId? }} args
 */
export async function deriveAfterWrite({ supabase, rows, userId = null }) {
  if (!rows || rows.length === 0) return { computed: 0 };

  const clientId = rows[0].client_id;
  if (!clientId) return { computed: 0 };

  // Find slugs for the indicator_ids in the written rows.
  const indicatorIds = [...new Set(rows.map(r => r.indicator_id))];
  const { data: inds } = await supabase
    .from('indicators')
    .select('id, slug')
    .in('id', indicatorIds);
  const changedSlugs = new Set((inds ?? []).filter(i => i.slug).map(i => i.slug));
  if (changedSlugs.size === 0) return { computed: 0 };

  const periods = [...new Set(rows.map(r => r.period_start))];
  return deriveForClient({ supabase, clientId, periods, changedSlugs, userId });
}
