// Pure ratio computation + concern detection.
// No I/O. Shared between the frontend (for live re-render) and the analyze endpoint (for persistence).
//
// Input shape:
//   lineItems = {
//     profit_loss?: { revenue, cogs, gross_profit, operating_expenses, operating_income,
//                     interest_expense, tax, net_income, depreciation, amortization, capex? },
//     balance_sheet?: { current_assets, cash, inventory, accounts_receivable, total_assets,
//                       current_liabilities, accounts_payable, total_liabilities, total_equity },
//     cashflow?: { operating_cashflow, investing_cashflow, financing_cashflow, capex }
//   }
//   history = [{ period_month: 'YYYY-MM-01', ratios: {...} }, ...]  -- prior snapshots, newest first

export const RATIO_CATALOG = [
  // Profitability (requires P&L)
  { key: 'gross_margin_pct',     label: 'Gross margin',     family: 'Profitability', format: 'pct',    higherBetter: true,  requires: ['profit_loss'] },
  { key: 'operating_margin_pct', label: 'Operating margin', family: 'Profitability', format: 'pct',    higherBetter: true,  requires: ['profit_loss'] },
  { key: 'net_margin_pct',       label: 'Net margin',       family: 'Profitability', format: 'pct',    higherBetter: true,  requires: ['profit_loss'] },
  { key: 'ebitda',               label: 'EBITDA',           family: 'Profitability', format: 'money',  higherBetter: true,  requires: ['profit_loss'] },
  { key: 'ebitda_margin_pct',    label: 'EBITDA margin',    family: 'Profitability', format: 'pct',    higherBetter: true,  requires: ['profit_loss'] },

  // Liquidity (requires BS)
  { key: 'current_ratio',        label: 'Current ratio',    family: 'Liquidity',     format: 'ratio',  higherBetter: true,  requires: ['balance_sheet'] },
  { key: 'quick_ratio',          label: 'Quick ratio',      family: 'Liquidity',     format: 'ratio',  higherBetter: true,  requires: ['balance_sheet'] },

  // Solvency
  { key: 'debt_to_equity',       label: 'Debt-to-equity',   family: 'Solvency',      format: 'ratio',  higherBetter: false, requires: ['balance_sheet'] },
  { key: 'interest_coverage',    label: 'Interest coverage',family: 'Solvency',      format: 'ratio',  higherBetter: true,  requires: ['profit_loss'] },

  // Efficiency (requires BS + P&L)
  { key: 'ar_days',              label: 'AR days',          family: 'Efficiency',    format: 'days',   higherBetter: false, requires: ['balance_sheet', 'profit_loss'] },
  { key: 'ap_days',              label: 'AP days',          family: 'Efficiency',    format: 'days',   higherBetter: true,  requires: ['balance_sheet', 'profit_loss'] },
  { key: 'inventory_days',       label: 'Inventory days',   family: 'Efficiency',    format: 'days',   higherBetter: false, requires: ['balance_sheet', 'profit_loss'] },
  { key: 'cash_conversion_cycle',label: 'Cash conversion cycle', family: 'Efficiency', format: 'days', higherBetter: false, requires: ['balance_sheet', 'profit_loss'] },

  // Cashflow
  { key: 'operating_cf_to_net_income', label: 'Operating CF / Net income', family: 'Cashflow', format: 'ratio', higherBetter: true, requires: ['cashflow', 'profit_loss'] },
  { key: 'free_cashflow',        label: 'Free cashflow',    family: 'Cashflow',      format: 'money',  higherBetter: true,  requires: ['cashflow'] },
  { key: 'cash_runway_months',   label: 'Cash runway (months)', family: 'Cashflow',  format: 'months', higherBetter: true,  requires: ['balance_sheet', 'profit_loss'] },

  // Acquisition — derived from P&L (sales_marketing_expense) + New customers measurement
  { key: 'cac',                  label: 'Customer acquisition cost', family: 'Acquisition', format: 'money', higherBetter: false, requires: ['profit_loss'] },
];

function num(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function div(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export function computeRatios(lineItems) {
  const pl = lineItems.profit_loss ?? {};
  const bs = lineItems.balance_sheet ?? {};
  const cf = lineItems.cashflow ?? {};

  const revenue           = num(pl.revenue);
  const cogs              = num(pl.cogs);
  const grossProfit       = num(pl.gross_profit) ?? (revenue != null && cogs != null ? revenue - cogs : null);
  const operatingIncome   = num(pl.operating_income);
  const netIncome         = num(pl.net_income);
  const interestExpense   = num(pl.interest_expense);
  const depreciation      = num(pl.depreciation) ?? 0;
  const amortization      = num(pl.amortization) ?? 0;

  const currentAssets     = num(bs.current_assets);
  const cash              = num(bs.cash);
  const inventory         = num(bs.inventory) ?? 0;
  const ar                = num(bs.accounts_receivable);
  const currentLiabs      = num(bs.current_liabilities);
  const ap                = num(bs.accounts_payable);
  const totalLiabs        = num(bs.total_liabilities);
  const totalEquity       = num(bs.total_equity);

  const opCashflow        = num(cf.operating_cashflow);
  const capex             = num(cf.capex) ?? num(pl.capex);

  const ebitda = operatingIncome != null ? operatingIncome + depreciation + amortization : null;

  const ratios = {
    gross_margin_pct:     grossProfit != null && revenue ? (grossProfit / revenue) * 100 : null,
    operating_margin_pct: div(operatingIncome, revenue) != null ? div(operatingIncome, revenue) * 100 : null,
    net_margin_pct:       div(netIncome, revenue) != null ? div(netIncome, revenue) * 100 : null,
    ebitda,
    ebitda_margin_pct:    div(ebitda, revenue) != null ? div(ebitda, revenue) * 100 : null,

    current_ratio:        div(currentAssets, currentLiabs),
    quick_ratio:          currentAssets != null && currentLiabs ? (currentAssets - inventory) / currentLiabs : null,
    debt_to_equity:       div(totalLiabs, totalEquity),
    interest_coverage:    interestExpense ? div(operatingIncome, interestExpense) : null,

    ar_days:              ar != null && revenue ? (ar / revenue) * 30 : null,
    ap_days:              ap != null && cogs ? (ap / cogs) * 30 : null,
    inventory_days:       inventory != null && cogs ? (inventory / cogs) * 30 : null,
    cash_conversion_cycle: null, // filled below

    operating_cf_to_net_income: netIncome ? div(opCashflow, netIncome) : null,
    free_cashflow:        opCashflow != null ? opCashflow - (capex ?? 0) : null,
    cash_runway_months:   null, // filled below (needs history for burn)
  };

  if (ratios.ar_days != null && ratios.inventory_days != null && ratios.ap_days != null) {
    ratios.cash_conversion_cycle = ratios.ar_days + ratios.inventory_days - ratios.ap_days;
  }

  return { ratios, raw: { revenue, cogs, grossProfit, operatingIncome, netIncome, interestExpense, depreciation, amortization, currentAssets, cash, inventory, ar, currentLiabs, ap, totalLiabs, totalEquity, opCashflow, capex, ebitda } };
}

/** Cash runway uses current cash ÷ trailing 3-month average monthly burn (where burn = -net_income when negative). */
export function computeRunway(currentCash, history) {
  if (currentCash == null) return null;
  const recentBurns = (history ?? [])
    .slice(0, 3)
    .map(h => {
      const ni = h?.ratios?._net_income ?? null;
      return ni != null && ni < 0 ? -ni : 0;
    })
    .filter(b => b > 0);
  if (!recentBurns.length) return null; // profitable — runway infinite
  const avgBurn = recentBurns.reduce((a, b) => a + b, 0) / recentBurns.length;
  if (avgBurn <= 0) return null;
  return currentCash / avgBurn;
}

/** Deterministic concern detection. history = prior confirmed snapshots, newest first, each { period_month, ratios }. */
export function detectConcerns(current, history) {
  const concerns = [];

  // Threshold-based (current only)
  if (current.current_ratio != null && current.current_ratio < 1) {
    concerns.push({ key: 'current_ratio', severity: 'critical',
      message: `Current ratio is ${current.current_ratio.toFixed(2)} — current liabilities exceed current assets.` });
  }
  if (current.cash_runway_months != null && current.cash_runway_months < 6) {
    concerns.push({ key: 'cash_runway_months', severity: 'critical',
      message: `Cash runway is ${current.cash_runway_months.toFixed(1)} months at current burn.` });
  }
  if (current.debt_to_equity != null && current.debt_to_equity > 3) {
    concerns.push({ key: 'debt_to_equity', severity: 'warn',
      message: `Debt-to-equity is ${current.debt_to_equity.toFixed(2)} — leverage is high.` });
  }
  if (current.interest_coverage != null && current.interest_coverage < 2) {
    concerns.push({ key: 'interest_coverage', severity: 'warn',
      message: `Interest coverage is ${current.interest_coverage.toFixed(2)}x — servicing debt is tight.` });
  }
  if (current.operating_cf_to_net_income != null && current.operating_cf_to_net_income < 0.5) {
    concerns.push({ key: 'operating_cf_to_net_income', severity: 'warn',
      message: `Operating cashflow is only ${(current.operating_cf_to_net_income * 100).toFixed(0)}% of net income — earnings aren't converting to cash.` });
  }

  // Trend-based (vs prior history)
  if (history?.length >= 3) {
    const last3 = history.slice(0, 3).map(h => h.ratios?.gross_margin_pct).filter(v => v != null);
    if (last3.length === 3 && current.gross_margin_pct != null) {
      const avg = last3.reduce((a, b) => a + b, 0) / last3.length;
      if (current.gross_margin_pct < avg - 5) {
        concerns.push({ key: 'gross_margin_pct', severity: 'warn',
          message: `Gross margin dropped ${(avg - current.gross_margin_pct).toFixed(1)} pts below the 3-month average (${avg.toFixed(1)}%).` });
      }
    }
  }

  if (history?.length >= 2) {
    const [p1, p2] = history; // newest first
    // AR days up 2 periods in a row (vs current = worsening)
    if (current.ar_days != null && p1?.ratios?.ar_days != null && p2?.ratios?.ar_days != null) {
      if (current.ar_days > p1.ratios.ar_days && p1.ratios.ar_days > p2.ratios.ar_days) {
        concerns.push({ key: 'ar_days', severity: 'warn',
          message: `AR days rising for three consecutive months (${p2.ratios.ar_days.toFixed(0)} → ${p1.ratios.ar_days.toFixed(0)} → ${current.ar_days.toFixed(0)}) — collections slowing.` });
      }
    }
  }

  return concerns;
}

export function formatRatio(key, value) {
  if (value == null) return '—';
  const meta = RATIO_CATALOG.find(r => r.key === key);
  if (!meta) return String(value);
  switch (meta.format) {
    case 'pct': return `${value.toFixed(1)}%`;
    case 'ratio': return value.toFixed(2);
    case 'days': return `${value.toFixed(0)}`;
    case 'months': return value.toFixed(1);
    case 'money': return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    default: return String(value);
  }
}

/** Does this snapshot have the input data required for this ratio? */
export function ratioAvailable(ratioKey, reportsIncluded) {
  const meta = RATIO_CATALOG.find(r => r.key === ratioKey);
  if (!meta) return false;
  return meta.requires.every(r => reportsIncluded?.includes(r));
}
