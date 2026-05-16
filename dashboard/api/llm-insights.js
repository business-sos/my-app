// Cross-area Insights endpoint.
// Looks at every tracked indicator + last 12 months of measurements + deterministic concerns,
// asks Claude (via a tool-call so the output is always structured) for 5–8 specific,
// dollar-quantified, action-tied insights. Persists to `insights`.
//
// Body: { client_id, regenerate? }   - regenerate=true bypasses cache
// Returns: { insight }   - the row from the insights table

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { evaluateAllRules } from '../src/lib/rules.js';
import { computeRatios, detectConcerns as detectFinancialConcerns, RATIO_CATALOG } from '../src/lib/financial.js';

const MODEL = 'claude-sonnet-4-6';
const MONTHS_OF_HISTORY = 12;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { client_id, regenerate = false } = req.body ?? {};
  if (!client_id) return res.status(400).json({ error: 'client_id required' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // 1. Pull the data
  const [tracked, measurementsRes, alertsRes, latestSnapshotRes] = await Promise.all([
    supabase
      .from('tracked_indicators')
      .select('target_value, indicator:indicators(id, name, unit, direction, target_cadence, area_id, area:areas(short_label))')
      .eq('client_id', client_id),
    supabase
      .from('measurements')
      .select('indicator_id, value, period_start')
      .eq('client_id', client_id)
      .order('period_start', { ascending: false })
      .limit(2000),
    supabase
      .from('alerts')
      .select('indicator_id, rule_code, severity, message, period_start')
      .eq('client_id', client_id)
      .is('acknowledged_at', null),
    // Most recent financial snapshot (for ratio context). Optional.
    supabase
      .from('financial_snapshots')
      .select('id, period_month, financial_line_items(report_type, data)')
      .eq('client_id', client_id)
      .eq('status', 'confirmed')
      .order('period_month', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const trackedRows = tracked.data ?? [];
  const measurements = measurementsRes.data ?? [];
  const alerts = alertsRes.data ?? [];

  if (trackedRows.length === 0) {
    return res.status(400).json({ error: 'No indicators tracked yet for this client.' });
  }

  // 2. Cache: if a confirmed `insights` row already exists for the latest measurement period
  // and the caller didn't ask to regenerate, return it.
  const latestPeriod = measurements[0]?.period_start ?? null;
  if (!regenerate) {
    const { data: cached } = await supabase
      .from('insights')
      .select('*')
      .eq('client_id', client_id)
      .eq('generated_for_period', latestPeriod)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) return res.status(200).json({ insight: cached, cached: true });
  }

  // 3. Compute deterministic concerns
  const ruleAlerts = evaluateAllRules(trackedRows, measurements);

  // Optional financial ratio concerns from the latest snapshot
  let ratioConcerns = [];
  let latestRatios = null;
  const snap = latestSnapshotRes.data;
  if (snap?.financial_line_items) {
    const lineItems = {};
    for (const it of snap.financial_line_items) lineItems[it.report_type] = it.data;
    const { ratios } = computeRatios(lineItems);
    latestRatios = ratios;
    ratioConcerns = detectFinancialConcerns(ratios, []);
  }

  // 4. Build a compact indicator summary for the LLM
  const byInd = new Map();
  for (const m of measurements) {
    if (!byInd.has(m.indicator_id)) byInd.set(m.indicator_id, []);
    byInd.get(m.indicator_id).push(m);
  }
  const summarised = trackedRows.map(t => {
    const ms = (byInd.get(t.indicator.id) ?? [])
      .slice(0, MONTHS_OF_HISTORY)
      .reverse()                          // oldest→newest
      .map(m => ({ period: m.period_start, value: Number(m.value) }));
    return {
      name: t.indicator.name,
      unit: t.indicator.unit,
      direction: t.indicator.direction,
      area: t.indicator.area?.short_label,
      target: t.target_value,
      recent: ms,
    };
  }).filter(s => s.recent.length > 0);

  // 5. Tool-call Claude
  const tool = {
    name: 'record_insights',
    description: 'Record 5–8 specific, dollar-quantified, action-tied business insights derived from the data.',
    input_schema: {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: 'One-sentence overarching summary of the client\'s situation right now (max 12 words).',
        },
        insights: {
          type: 'array',
          description: '5 to 8 insights. Each is independently actionable.',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short title (max 8 words) of the issue or opportunity.' },
              metric: { type: 'string', description: 'Which indicator this is about (exact name from the catalog).' },
              dollar_impact: { type: 'string', description: 'A concrete dollar or percent statement of why this matters. Reference actual numbers from the data. Examples: "$20k of marketing spend leaking into unqualified leads", "Members 29→24 in 2 months erases ~$15k MRR".' },
              evidence: { type: 'string', description: 'The factual basis: cite the specific numbers and periods.' },
              severity: { type: 'string', enum: ['critical', 'warn', 'opportunity', 'info'], description: 'critical = act this week; warn = fix this month; opportunity = upside lever; info = noteworthy but lower priority.' },
              action: { type: 'string', description: 'Concrete next step the business owner could take this week. Imperative voice. Specific, not generic. Max 18 words.' },
            },
            required: ['title', 'metric', 'dollar_impact', 'evidence', 'severity', 'action'],
          },
        },
      },
      required: ['headline', 'insights'],
    },
  };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a sharp business operator looking at a coaching client's KPI dashboard. You write insights that make the owner say "I need to act on that this week."

Rules:
- Reference ACTUAL numbers from the data in evidence and dollar_impact. Calculate them yourself; do not invent.
- Quantify the dollar or percent stakes wherever possible. If the data doesn't allow exact dollar math, say "approximately" with your best estimate and reasoning.
- Be specific. NO generic advice. NO "review your funnel". YES "audit the MQL→SQL handoff this week — conversion fell from 1.4% to 0.88%".
- Mix critical issues with opportunities. The owner should see both threats and levers.
- Treat patterns across multiple indicators as one insight when they share a root cause (e.g. CAC up + Conversion down + Members down = "acquisition efficiency crashing").
- Severity:
  * critical: needs action this week, real money/customers leaking
  * warn: needs action this month, trend is hostile
  * opportunity: an upside lever the owner can pull
  * info: noteworthy context, lower priority
- 5–8 insights total. Quality over quantity.
- Use the deterministic concerns provided as a starting point, but add cross-metric pattern recognition the rules engine wouldn't catch.`;

  const userPrompt = `Client: ${client_id}
Latest measurement period: ${latestPeriod ?? 'n/a'}
Today's date: ${new Date().toISOString().slice(0, 10)}

Tracked indicators with the last ${MONTHS_OF_HISTORY} months of values (oldest → newest):
${JSON.stringify(summarised, null, 2)}

Active deterministic alerts already flagged:
${(ruleAlerts.length || alerts.length)
  ? [...ruleAlerts, ...alerts].map(a => `- [${a.severity}] ${a.message ?? `${a.rule_code} on indicator ${a.indicator_id}`}`).join('\n')
  : '(none — but trust the numbers, not the rules)'}

${latestRatios ? `Latest financial ratios (from a financial snapshot):
${RATIO_CATALOG.map(r => `- ${r.label}: ${latestRatios[r.key] == null ? '—' : Number(latestRatios[r.key]).toFixed(2)}`).join('\n')}` : ''}

${ratioConcerns.length ? `Detected ratio concerns:
${ratioConcerns.map(c => `- [${c.severity}] ${c.message}`).join('\n')}` : ''}

Call record_insights with 5–8 entries.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'record_insights' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'record_insights');
  if (!toolUse) {
    return res.status(422).json({
      error: 'LLM did not return tool output',
      raw: JSON.stringify(response.content).slice(0, 600),
    });
  }
  const result = toolUse.input;

  // 6. Persist + return
  const { data: saved, error: saveErr } = await supabase
    .from('insights')
    .insert({
      client_id,
      headline: result.headline,
      insights: result.insights,
      input_snapshot: { tracked_count: trackedRows.length, latest_period: latestPeriod, deterministic_alerts: ruleAlerts.length + alerts.length },
      model: MODEL,
      generated_for_period: latestPeriod,
    })
    .select()
    .single();
  if (saveErr) return res.status(500).json({ error: saveErr.message });

  return res.status(200).json({ insight: saved, cached: false });
}
