// AI-assisted CSV → indicator mapping detection.
// Body: { client_id, csv_url }
// Returns: { columns, sample_rows, proposed_mappings: [{ indicator_id, indicator_name, value_column, date_column, cadence, confidence, reason }] }

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { normalizeSheetUrl as sharedNormalize } from './_sheet-url.js';

const MODEL = 'claude-sonnet-4-6';

// Use shared sharedNormalize() from ./_sheet-url.js. Local wrapper preserves
// previous behaviour of passing the original string through when normalization fails.
function normalizeSheetUrl(url) {
  return sharedNormalize(url) ?? url;
}

function humanizeFetchError(url, status) {
  const isGoogle = url.includes('docs.google.com') || url.includes('spreadsheets.google.com');
  if (status === 401 || status === 403) {
    if (isGoogle) {
      return [
        "Google rejected the request — the sheet isn't readable yet.",
        "Easiest fix: open the sheet → Share (top right) → set 'General access' to 'Anyone with the link' → Viewer → Done. Then click Detect columns again. (You can paste the same URL — no need to publish.)",
        "Or, if you'd rather keep the sheet private but make a public CSV link: File → Share → Publish to web → format Comma-separated values (.csv) → Publish.",
      ].join(' ');
    }
    return `Source rejected the request (${status}). The CSV URL must be publicly readable.`;
  }
  if (status === 404) return `Sheet not found (404). Check the URL.`;
  return `CSV fetch failed: HTTP ${status}`;
}

function parseCSV(text) {
  // Minimal CSV parser. Handles quoted fields, commas inside quotes, escaped quotes.
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { client_id, csv_url } = req.body ?? {};
  if (!client_id || !csv_url) return res.status(400).json({ error: 'client_id and csv_url required' });

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // 1. Load the indicator catalog the user can pick from
  const { data: indicators, error: indErr } = await supabase
    .from('indicators')
    .select('id, name, unit, direction, target_cadence, area_id, client_id')
    .or(`client_id.is.null,client_id.eq.${client_id}`)
    .eq('is_active', true);
  if (indErr) return res.status(500).json({ error: indErr.message });

  // 2. Fetch CSV (auto-normalize a regular Google Sheets share URL to its export form)
  const fetchUrl = normalizeSheetUrl(csv_url);
  let csvText;
  try {
    const csvRes = await fetch(fetchUrl, { redirect: 'follow' });
    if (!csvRes.ok) {
      throw new Error(humanizeFetchError(fetchUrl, csvRes.status));
    }
    const ct = csvRes.headers.get('content-type') ?? '';
    csvText = await csvRes.text();
    // Sometimes a non-public sheet redirects to an HTML login page that returns 200 + html.
    if (ct.includes('text/html') || csvText.trim().startsWith('<')) {
      throw new Error("That URL returned HTML, not CSV. The sheet probably isn't published. See the steps under '+ Connect Google Sheet'.");
    }
    if (csvText.length > 200_000) csvText = csvText.slice(0, 200_000) + '\n...';
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const rows = parseCSV(csvText);
  if (rows.length < 2) return res.status(400).json({ error: 'CSV has fewer than 2 rows' });

  // Send up to 25 rows (full width) so Claude can detect orientation and section headers.
  const sample = rows.slice(0, 25);
  const header = rows[0].map(h => h.trim());

  // 3. Call Claude with a tool that detects layout AND proposes mappings.
  const tool = {
    name: 'propose_mappings',
    description: 'Detect the CSV layout (long vs wide), then propose which rows/columns map to which app indicators.',
    input_schema: {
      type: 'object',
      properties: {
        layout: {
          type: 'string',
          enum: ['long', 'wide'],
          description: "'long' = each row is a period and columns are different indicators (typical data export). 'wide' = each row is one indicator with periods running across columns (typical KPI dashboard).",
        },
        // Long-layout fields
        date_column: {
          type: 'string',
          description: 'LONG only: the CSV column header that contains the period date.',
        },
        // Wide-layout fields
        label_column_index: {
          type: 'number',
          description: 'WIDE only: 0-indexed column number that contains the indicator names (usually 0).',
        },
        header_row_index: {
          type: 'number',
          description: 'WIDE only: 0-indexed row number that contains the period headers (the row with month names like "May 2023, June 2023, ...").',
        },
        period_column_indices: {
          type: 'array',
          items: { type: 'number' },
          description: 'WIDE only: the 0-indexed column numbers that contain actual period data. EXCLUDE derived columns like "MoM", "YoY", "QoQ", "Notes", and any obviously non-period columns.',
        },
        mappings: {
          type: 'array',
          description: "Mappings to EXISTING catalog indicators.\nLONG: { value_column = CSV column header, indicator_id, ... }.\nWIDE:  { value_column = the row label (cell value in label_column), indicator_id, ... }.",
          items: {
            type: 'object',
            properties: {
              value_column: { type: 'string', description: 'LONG: CSV column header. WIDE: the row label exactly as it appears in the label column.' },
              indicator_id: { type: 'string', description: 'UUID of the matched indicator (must come from the provided catalog).' },
              confidence: { type: 'number' },
              reason: { type: 'string' },
            },
            required: ['value_column', 'indicator_id', 'confidence', 'reason'],
          },
        },
        unmatched_rows: {
          type: 'array',
          description: "Rows/columns that LOOK like business KPIs (numeric time-series with a meaningful name) but DON'T match any existing catalog indicator. Suggest creating new custom indicators for them. Be conservative — only include things clearly trackable as metrics over time. SKIP section headers, totals, derived columns, free-text rows.",
          items: {
            type: 'object',
            properties: {
              value_column: { type: 'string', description: 'LONG: CSV column header. WIDE: the row label.' },
              suggested_name: { type: 'string', description: 'Concise indicator name to create. Title-case. Max 6 words.' },
              suggested_unit: { type: 'string', enum: ['$', '%', 'count', 'score', 'days', 'months'], description: 'Best-fit unit based on sample values.' },
              suggested_direction: { type: 'string', enum: ['higher_better', 'lower_better'] },
              suggested_area: { type: 'string', enum: ['acquisition', 'care', 'team', 'systems', 'finance'], description: 'Which of the 5 areas best fits this metric. acquisition=Customer Acquisition, care=Customer Care, team=Team Strength, systems=Systems Reliability, finance=Financial Position.' },
              suggested_cadence: { type: 'string', enum: ['weekly', 'monthly', 'quarterly'] },
              reason: { type: 'string', description: 'Why this looks like a KPI worth tracking.' },
            },
            required: ['value_column', 'suggested_name', 'suggested_unit', 'suggested_direction', 'suggested_area', 'suggested_cadence', 'reason'],
          },
        },
      },
      required: ['layout', 'mappings'],
    },
  };

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = `You map a user-supplied CSV (Google Sheet export) to a fixed catalog of business-health indicators. You return ONLY a tool call.

Step 1: detect the layout.
- LONG: each row is a period; columns are indicators. Typical for time-series exports.
- WIDE: each row is one indicator; periods (months/quarters) run across columns. Common in business KPI dashboards. Signals: row 1 or 2 contains period labels like "May 2023, June 2023, July 2023..."; rows below are metric names with numbers across.

Step 2: propose mappings AND surface unmatched rows.
- LONG mappings: value_column = the CSV column header (string).
- WIDE mappings: value_column = the exact text of the row label (cell value in the label column).
- Be conservative when matching to existing catalog indicators. Only map a row/column when name + sample values + unit clearly match.
- For WIDE, ignore section headers (rows like "ENROLMENTS", "REVENUE (P&L)" with no numbers), title rows, and derived/aggregate columns like "MoM", "YoY", "QoQ", "Notes".
- For WIDE, include in period_column_indices ONLY the columns that contain actual period values (typically all numeric data columns; exclude label, derived, and trailing-notes columns).
- Never map two rows/columns to the same indicator. If two could match the same indicator, pick the most specific.
- Indicator IDs MUST be exact UUIDs from the catalog. Do not invent IDs.

UNMATCHED ROWS — second-most important output.
- After matching to the catalog, look at the remaining rows/columns that DO have numeric time-series data but no good catalog match.
- For each, suggest a new custom indicator the user can create with one click. Give it a clean name, the right unit/direction/area/cadence.
- Examples of GOOD unmatched candidates: "MQL's Per Month" (count, acquisition, higher_better, monthly), "Average Order Value" ($, care, higher_better, monthly), "Email Open Rate" (%, acquisition, higher_better, weekly).
- Examples of BAD candidates (skip): section header rows ("Database"), totals already covered by another mapping, free-text annotations ("$21k (2 WKS)"), emoji rows.`;

  const userPrompt = `Indicator catalog (id — name — unit — cadence):
${indicators.map(i => `- ${i.id} — ${i.name} — ${i.unit ?? '(no unit)'} — ${i.target_cadence}`).join('\n')}

First ${sample.length} rows of the CSV (row index in []; cell index also in []):
${sample.map((r, ri) => `[row ${ri}] ${r.map((v, ci) => `[${ci}]${JSON.stringify(v)}`).join(' | ')}`).join('\n')}

Call propose_mappings with the layout, the relevant indices/headers, and one mapping per confidently-matched indicator.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'propose_mappings' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'propose_mappings');
  if (!toolUse) return res.status(422).json({ error: 'LLM did not return tool output' });

  const result = toolUse.input;
  const idMap = new Map(indicators.map(i => [i.id, i]));
  const enriched = (result.mappings ?? []).map(m => {
    const ind = idMap.get(m.indicator_id);
    return {
      ...m,
      indicator_name: ind?.name ?? '(unknown)',
      cadence: ind?.target_cadence ?? 'monthly',
    };
  }).filter(m => idMap.has(m.indicator_id));

  // Pass through unmatched_rows. Front-end will offer one-click "create + map" buttons.
  const unmatched = result.unmatched_rows ?? [];

  // For wide layout, build a preview of detected periods so the UI can show what we found.
  let periodPreview = null;
  if (result.layout === 'wide' && Number.isFinite(result.header_row_index) && Array.isArray(result.period_column_indices)) {
    const headerRow = rows[result.header_row_index] ?? [];
    periodPreview = result.period_column_indices.map(ci => ({ index: ci, label: headerRow[ci] }));
  }

  return res.status(200).json({
    columns: header,
    sample_rows: sample,
    layout: result.layout,
    // long-layout
    date_column: result.date_column ?? null,
    // wide-layout
    label_column_index: result.label_column_index ?? null,
    header_row_index: result.header_row_index ?? null,
    period_column_indices: result.period_column_indices ?? null,
    period_preview: periodPreview,
    proposed_mappings: enriched,
    unmatched_rows: unmatched,
    total_rows: rows.length - 1,
  });
}
