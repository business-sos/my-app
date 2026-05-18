// Top-of-page sub-tab strip for the consolidated "Data entry" area.
// Rendered by MetricEntry, Integrations, FinancialAnalysis, and the new RawData page.

import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/entry',        label: 'Manual' },
  { to: '/integrations', label: 'Connections' },
  { to: '/financial',    label: 'Uploads' },
  { to: '/raw',          label: 'Raw data' },
];

export default function DataEntryNav() {
  return (
    <div className="mode-toggle" role="tablist" aria-label="Data entry sub-tabs" style={{ marginBottom: 16 }}>
      {TABS.map(t => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === '/entry'}
          className={({ isActive }) => isActive ? 'active' : ''}
          role="tab"
          style={{
            padding: '6px 14px', borderRadius: 999, fontSize: 12, color: 'var(--ink-mid)',
            letterSpacing: '0.04em', fontWeight: 500, textDecoration: 'none',
          }}
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}
