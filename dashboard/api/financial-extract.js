// Extract line items from a financial report using Claude.
//
// Single-period mode (backward compat):
//   Body:   { snapshot_id, report_type, text }
//   Return: { data, line_item_id }
//   Side effect: upserts one financial_line_items row.
//
// Multi-period mode (new):
//   Body:   { client_id, report_type, text, period_hint? }
//   Return: { periods: [{ period_month: 'YYYY-MM-01', data: {...field map...} }] }
//   No DB writes — frontend creates snapshots + line items per period.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const MODEL = 'claude-sonnet-4-6';

const SCHEMAS = {
  balance_sheet: {
    fields: [
      'current_assets', 'cash', 'accounts_receivable', 'inventory', 'total_assets',
      'current_liabilities', 'accounts_payable', 'total_liabilities', 'total_equity',
    ],
    description: 'a Balance Sheet',
  },
  profit_loss: {
    fields: [
      'revenue', 'cogs', 'gross_profit', 'operating_expenses', 'operating_income',
      'sales_marketing_expense',
      'interest_expense', 'tax', 'net_income', 'depreciation', 'amortization',
    ],
    description: 'a Profit & Loss (Income Statement)',
  },
  cashflow: {
    fields: [
      'operating_cashflow', 'investing_cashflow', 'financing_cashflow', 'capex', 'net_cash_change',
    ],
    description: 'a Statement of Cashflows',
  },
};

function cleanValues(fields, raw) {
  const clean = {};
  for (const f of fields) {
    const v = raw?.[f];
    if (v == null || v === '') clean[f] = null;
    else {
      const n = Number(v);
      clean[f] = Number.isFinite(n) ? n : null;
    }
  }
  return clean;
}

function normalizePeriodMonth(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{4})-(\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, '0')}-01`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { snapshot_id, client_id, report_type, text, period_hint } = req.body ?? {};
  if (!report_type || !text) {
    return res.status(400).json({ error: 'report_type and text required' });
  }
  if (!snapshot_id && !client_id) {
    return res.status(400).json({ error: 'either snapshot_id (single-period) or client_id (multi-period) required' });
  }
  const schema = SCHEMAS[report_type];
  if (!schema) return res.status(400).json({ error: 'invalid report_type' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // If snapshot_id was passed (legacy/single-period flow), confirm RLS access.
  if (snapshot_id) {
    const { data: snap, error: snapErr } = await supabase
      .from('financial_snapshots')
      .select('id, period_month')
      .eq('id', snapshot_id)
      .single();
    if (snapErr || !snap) return res.status(404).json({ error: 'Snapshot not found or inaccessible' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables → Production, then redeploy.',
    });
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Tool: returns one or more periods. Each period is the same field map.
  const valueProps = {};
  for (const f of schema.fields) {
    valueProps[f] = { type: ['number', 'null'], description: `${f.replace(/_/g, ' ')} for this period` };
  }
  const tool = {
    name: 'record_periods',
    description: `Record one or more periods of extracted ${schema.description} values. Return ONE period per distinct column/month in the source file.`,
    input_schema: {
      type: 'object',
      properties: {
        periods: {
          type: 'array',
          minItems: 1,
          description: 'One entry per distinct period found in the file. If the file is single-period, return an array of length 1.',
          items: {
            type: 'object',
            properties: {
              period_month: {
                type: 'string',
                description: 'ISO date for the first day of the month this period covers (e.g. "2026-03-01"). If the file uses month names only and the year is ambiguous, use the most recent plausible year given context.',
              },
              values: {
                type: 'object',
                properties: valueProps,
                required: schema.fields,
              },
            },
            required: ['period_month', 'values'],
          },
        },
      },
      required: ['periods'],
    },
  };

  const hintLine = period_hint
    ? `If the file is single-period, set period_month to "${period_hint}". If multi-period, ignore this hint and use the actual months in the file.`
    : 'If the file is single-period and the period is unclear, use the most recently completed month.';

  const systemPrompt = `You extract line items from accounting-software exports (Xero, QuickBooks, MYOB) and return them via the record_periods tool.

LAYOUT DETECTION (do this first):
- If the file has ONE column of values (e.g. a single month's P&L), return a single period.
- If the file has MULTIPLE columns of values (e.g. one column per month for a YTD report, or "Apr 2025 / May 2025 / ... / Mar 2026"), return ONE period entry per column.
- Ignore columns labeled "Total", "Average", "Variance", "% change", "YTD" — those are summaries, not periods.

PERIOD INFERENCE:
- ${hintLine}
- For month-name-only headers ("November / December / January"), pick the year so the months are chronological and end no later than the current month.
- Always emit period_month as the first day of the month: "2025-04-01".

NUMBER HANDLING:
- Strip commas and currency symbols. Parentheses mean negative: "(1,234)" → -1234.
- Use null (not 0) when a field is genuinely absent and cannot be derived.

BROKEN TOTALS (Xero issue):
- If a "Total …" row is 0 but its underlying line items are non-zero, IGNORE the total and SUM the line items.
- For parent:child account notation (e.g. "Payroll:Superannuation"), prefer the parent row; sum children only if no parent.

DERIVATIONS:
- Service business with no COGS section: set cogs = 0 and gross_profit = revenue.
- If operating_income isn't explicit but gross_profit and operating_expenses are known: operating_income = gross_profit - operating_expenses.
- If net_income isn't explicit: net_income = operating_income - (interest_expense or 0) - (tax or 0).

sales_marketing_expense (P&L only):
- Sum every line item whose account name matches Advertising, Marketing, Promotion, PR, Sales commission, Campaign, Brand, Sponsorship, SEO/SEM, Lead generation, Affiliate, Trade show, or similar customer-acquisition spend.
- Exclude general office, rent, salaries (unless explicitly sales/marketing), accounting, software unless clearly a marketing tool.
- If no acquisition lines exist, return 0. Return null only if you genuinely can't tell.`;

  const userPrompt = `Extract every period from this ${schema.description} and call record_periods with one entry per period.

File content:
\`\`\`
${text.slice(0, 60000)}
\`\`\``;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'record_periods' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'record_periods');
  if (!toolUse) {
    return res.status(422).json({
      error: 'LLM did not return structured tool output',
      raw: JSON.stringify(response.content).slice(0, 800),
    });
  }
  const rawPeriods = Array.isArray(toolUse.input?.periods) ? toolUse.input.periods : [];
  const periods = [];
  for (const p of rawPeriods) {
    const pm = normalizePeriodMonth(p?.period_month);
    if (!pm) continue;
    periods.push({ period_month: pm, data: cleanValues(schema.fields, p?.values) });
  }
  // Dedupe: if two periods share the same period_month, keep the last one.
  const byPeriod = new Map();
  for (const p of periods) byPeriod.set(p.period_month, p);
  const uniquePeriods = [...byPeriod.values()].sort((a, b) => a.period_month.localeCompare(b.period_month));

  if (uniquePeriods.length === 0) {
    return res.status(422).json({ error: 'No periods extracted from the file.' });
  }

  // Backward-compat single-period mode: if snapshot_id was provided AND we found
  // exactly one period, write that period's line items directly and return the
  // legacy { data, line_item_id } shape.
  if (snapshot_id && uniquePeriods.length === 1) {
    const clean = uniquePeriods[0].data;
    const { data: itemRow, error: itemErr } = await supabase
      .from('financial_line_items')
      .upsert({
        snapshot_id,
        report_type,
        data: clean,
        extraction_model: MODEL,
      }, { onConflict: 'snapshot_id,report_type' })
      .select()
      .single();
    if (itemErr) return res.status(500).json({ error: itemErr.message });
    return res.status(200).json({ data: clean, line_item_id: itemRow.id, periods: uniquePeriods });
  }

  // Multi-period mode (or single-period without snapshot_id): return the periods
  // array. Frontend handles snapshot creation + line item writes.
  return res.status(200).json({ periods: uniquePeriods });
}
