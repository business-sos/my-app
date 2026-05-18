// Inline edit affordances shown on each tile when the Dashboard is in Setup mode.
// - Target value field (writes to tracked_indicators.target_value)
// - Untrack button (deletes the tracked_indicators row; standard indicators
//   re-appear after the next auto-track call but for now we just remove from view)

import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function TileSetupControls({ tracked, onChanged }) {
  const [target, setTarget] = useState(tracked.target_value ?? '');
  const [saving, setSaving] = useState(false);

  async function saveTarget() {
    setSaving(true);
    const v = target === '' || target == null ? null : Number(target);
    const { error } = await supabase
      .from('tracked_indicators')
      .update({ target_value: v })
      .eq('id', tracked.id);
    setSaving(false);
    if (error) {
      alert(`Failed to save target: ${error.message}`);
      return;
    }
    onChanged?.();
  }

  async function untrack() {
    if (!confirm(`Stop tracking "${tracked.indicator.name}" on the Dashboard?`)) return;
    const { error } = await supabase
      .from('tracked_indicators')
      .delete()
      .eq('id', tracked.id);
    if (error) {
      alert(`Failed to untrack: ${error.message}`);
      return;
    }
    onChanged?.();
  }

  return (
    <div className="tile-setup-row">
      <input
        type="number"
        placeholder="Target"
        value={target ?? ''}
        onChange={e => setTarget(e.target.value)}
      />
      <button onClick={saveTarget} disabled={saving}>{saving ? '…' : 'Save'}</button>
      <button onClick={untrack} className="danger" title="Stop tracking">×</button>
    </div>
  );
}
