import TileShell from '../shared/TileShell.jsx';
import { formatValue } from '../shared/format.js';
import { currentStatus } from '../resolver.js';

// Status pill leads. Used for: any metric in Watch/Critical state, OR a healthy metric whose
// shape is purely status-defined (no target, no range, no comparison).

const SEV_CLASS = {
  Healthy: 'tile-pill-healthy',
  Watch: 'tile-pill-watch',
  Critical: 'tile-pill-critical',
};

export default function StatusFraming({ metric }) {
  const status = currentStatus(metric) ?? 'Healthy';
  const context = metric.comparison?.previousLabel ?? null;

  return (
    <TileShell
      label={metric.label}
      topRight={<span className={`tile-pill ${SEV_CLASS[status]}`}>{status}</span>}
    >
      <div className="tile-value">{formatValue(metric.value, metric.unit, metric.currency)}</div>
      {context && <div className="muted tile-foot">{context}</div>}
    </TileShell>
  );
}
