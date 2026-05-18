// Extract line items from a single financial report using Claude.
// Body: { snapshot_id, report_type, text }
// Returns: { data, line_item_id }

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { snapshot_id, report_type, text } = req.body ?? {};
  if (!snapshot_id || !report_type || !text) {
    return res.status(400).json({ error: 'snapshot_id, report_type, text required' });
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

  // Confirm the snapshot is visible to the caller (RLS will block otherwise)
  const { data: snap, error: snapErr } = await supabase
    .from('financial_snapshots')
    .select('id, period_month')
    .eq('id', snapshot_id)
    .single();
  if (snapErr || !snap) return res.status(404).json({ error: 'Snapshot not found or inaccessible' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables → Production, then redeploy.',
    });
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build the tool's input schema from the report's expected fields
  const properties = {};
  for (const f of schema.fields) {
    properties[f] = { type: ['number', 'null'], description: `${f.replace(/_/g, ' ')} line item value` };
  }
  const tool = {
    name: 'record_line_items',
    description: `Record the extracted line items from ${schema.description}`,
    input_schema: {
      type: 'object',
      properties,
      required: schema.fields,
    },
  };

  const systemPrompt = `You extract line items from accounting-software exports (Xero, QuickBooks, MYOB). You will call the record_line_items tool with the extracted values.

Number handling:
- Strip commas and currency symbols. Parentheses mean negative: "(1,234)" → -1234.
- Use null (not 0) when a field is genuinely absent and cannot be derived from other rows.

Handling broken totals (common with Xero):
- If a "Total …" row is 0 but its underlying line items are non-zero, IGNORE the total and SUM the line items yourself.
- For parent:child account notation (e.g. "Payroll:Superannuation"), the parent row usually already includes its children. Prefer the parent row; only sum children when no parent row exists.

Derivations:
- Service business with no COGS section: set cogs = 0 and gross_profit = revenue.
- If operating_income isn't explicit but gross_profit and operating_expenses are known: operating_income = gross_profit - operating_expenses.
- If net_income isn't explicit: net_income = operating_income - (interest_expense or 0) - (tax or 0).

sales_marketing_expense (P&L only):
- Sum every line item whose account name matches Advertising, Marketing, Promotion, PR, Sales commission, Campaign, Brand, Sponsorship, SEO/SEM, Lead generation, Affiliate, Trade show, or similar customer-acquisition spend. Include parent rows and avoid double-counting children.
- Exclude general office, rent, salaries (unless line is explicitly "Sales salaries"/"Marketing salaries"), accounting, software unless clearly a marketing tool, recruitment, training, travel (unless explicitly sales travel).
- If no acquisition lines exist, return 0. Return null only if you genuinely can't tell.`;

  const userPrompt = `Extract the line items from this ${schema.description} and call record_line_items.

File content:
\`\`\`
${text.slice(0, 40000)}
\`\`\``;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'record_line_items' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'record_line_items');
  if (!toolUse) {
    return res.status(422).json({
      error: 'LLM did not return structured tool output',
      raw: JSON.stringify(response.content).slice(0, 800),
    });
  }
  const data = toolUse.input;

  // Only keep known fields, coerce to numbers where possible
  const clean = {};
  for (const f of schema.fields) {
    const v = data[f];
    if (v == null || v === '') clean[f] = null;
    else {
      const n = Number(v);
      clean[f] = Number.isFinite(n) ? n : null;
    }
  }

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

  return res.status(200).json({ data: clean, line_item_id: itemRow.id });
}
