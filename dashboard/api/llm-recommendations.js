// Serverless endpoint: generate LLM coaching recommendation for a (client, area).
// Auth: requires Supabase JWT in Authorization header. RLS ensures the user can only
// request data for clients they're allowed to access.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { client_id, area_id } = req.body ?? {};
  if (!client_id || !area_id) return res.status(400).json({ error: 'client_id and area_id required' });

  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  // Client scoped to the end-user JWT — RLS applies.
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // Fetch area + tracked indicators + recent measurements + active alerts
  const [{ data: area }, { data: tracked }, { data: measurements }, { data: alerts }] = await Promise.all([
    supabase.from('areas').select('*').eq('id', area_id).single(),
    supabase
      .from('tracked_indicators')
      .select('target_value, indicator:indicators(id, name, unit, direction, target_cadence, area_id)')
      .eq('client_id', client_id),
    supabase
      .from('measurements')
      .select('indicator_id, value, period_start, period_end')
      .eq('client_id', client_id)
      .order('period_start', { ascending: false })
      .limit(500),
    supabase
      .from('alerts')
      .select('indicator_id, rule_code, severity, message, period_start')
      .eq('client_id', client_id)
      .is('acknowledged_at', null),
  ]);

  if (!area) return res.status(404).json({ error: 'Area not found or inaccessible' });

  const areaTracked = (tracked ?? []).filter(t => t.indicator.area_id === area_id);
  const areaIndicatorIds = new Set(areaTracked.map(t => t.indicator.id));
  const areaMeasurements = (measurements ?? []).filter(m => areaIndicatorIds.has(m.indicator_id));
  const areaAlerts = (alerts ?? []).filter(a => areaIndicatorIds.has(a.indicator_id));

  const snapshot = {
    area: { title: area.title, short_label: area.short_label },
    indicators: areaTracked.map(t => ({
      name: t.indicator.name,
      unit: t.indicator.unit,
      direction: t.indicator.direction,
      cadence: t.indicator.target_cadence,
      target: t.target_value,
      recent_values: areaMeasurements
        .filter(m => m.indicator_id === t.indicator.id)
        .slice(0, 6)
        .reverse()
        .map(m => ({ period: m.period_start, value: Number(m.value) })),
    })),
    active_alerts: areaAlerts.map(a => ({ rule: a.rule_code, severity: a.severity, message: a.message })),
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables → Production, then redeploy.',
    });
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systemPrompt = `You are a business coach helping small business owners improve their company health. You focus on practical, specific, actionable recommendations — not platitudes. You are opinionated. You reference specific numbers from the data. You keep responses under 250 words.`;

  const userPrompt = `A client is asking for coaching recommendations on this area of their business:

**${snapshot.area.short_label}** — ${snapshot.area.title}

Their tracked indicators and recent values:
${JSON.stringify(snapshot.indicators, null, 2)}

Active alerts:
${snapshot.active_alerts.length ? JSON.stringify(snapshot.active_alerts, null, 2) : '(none)'}

Write 2-4 specific recommendations in markdown. Lead with the most important. Reference the actual numbers. Suggest concrete next steps, not generic advice.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const body_md = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  // Persist via the user's RLS-scoped client — period_start = earliest of the latest values
  const periodStart = snapshot.indicators
    .flatMap(i => i.recent_values.map(v => v.period))
    .sort()
    .pop() ?? new Date().toISOString().slice(0, 10);

  const { data: saved, error: saveErr } = await supabase
    .from('recommendations')
    .insert({
      client_id,
      area_id,
      period_start: periodStart,
      body_md,
      input_snapshot: snapshot,
      model: MODEL,
    })
    .select()
    .single();

  if (saveErr) return res.status(500).json({ error: saveErr.message });

  return res.status(200).json({ recommendation: saved });
}
