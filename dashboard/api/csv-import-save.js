// Persists a CSV import + its column→indicator mappings.
// Body: { client_id, name, csv_url, mappings: [{ indicator_id, value_column, date_column, cadence }] }
// Returns: { csv_import_id }

import { createClient } from '@supabase/supabase-js';
import { normalizeSheetUrl as sharedNormalize } from './_sheet-url.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    client_id, name, csv_url: rawUrl, mappings,
    csv_import_id: existingId,
    layout = 'long',
    label_column = null,
    header_row = 1,
    new_indicators = [], // [{ value_column, name, unit, direction, area_slug, cadence }]
  } = req.body ?? {};
  if (!client_id || !rawUrl || !Array.isArray(mappings) || mappings.length === 0) {
    return res.status(400).json({ error: 'client_id, csv_url, and at least one mapping required' });
  }
  const csv_url = sharedNormalize(rawUrl) ?? rawUrl;

  // Create any new custom indicators the user accepted from the unmatched-rows panel.
  // Returns a map from value_column → new indicator_id so we can splice them into mappings.
  const newIndIdByValueColumn = new Map();
  if (new_indicators.length > 0) {
    // Resolve area slugs → ids in one query
    const slugs = [...new Set(new_indicators.map(n => n.area_slug).filter(Boolean))];
    const { data: areas } = await supabase.from('areas').select('id, slug').in('slug', slugs);
    const areaIdBySlug = new Map((areas ?? []).map(a => [a.slug, a.id]));

    const toInsert = new_indicators
      .map(n => ({
        client_id,
        area_id: areaIdBySlug.get(n.area_slug),
        name: n.name,
        unit: n.unit ?? null,
        direction: n.direction ?? 'higher_better',
        target_cadence: n.cadence ?? 'monthly',
        description: n.description ?? null,
        is_active: true,
        _value_column: n.value_column, // not a column; we strip it below
      }))
      .filter(r => r.area_id && r.name);

    for (const row of toInsert) {
      const { _value_column, ...payload } = row;
      const { data: created, error } = await supabase
        .from('indicators')
        .insert(payload)
        .select('id, name')
        .single();
      if (error) return res.status(500).json({ error: `Couldn't create indicator "${payload.name}": ${error.message}` });
      newIndIdByValueColumn.set(_value_column, created.id);
    }
  }

  // Stitch new indicator IDs into the mappings array (where the caller used a sentinel like 'NEW:value_column')
  const resolvedMappings = mappings.map(m => {
    if (typeof m.indicator_id === 'string' && m.indicator_id.startsWith('NEW:')) {
      const vc = m.indicator_id.slice(4);
      const newId = newIndIdByValueColumn.get(vc);
      return newId ? { ...m, indicator_id: newId } : null;
    }
    return m;
  }).filter(Boolean);

  const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  let importId = existingId;

  if (importId) {
    // Update existing
    const { error } = await supabase
      .from('csv_imports')
      .update({ name: name ?? 'Google Sheet', csv_url, status: 'active', layout, label_column, header_row })
      .eq('id', importId);
    if (error) return res.status(500).json({ error: error.message });
    // Wipe old mappings
    await supabase.from('csv_import_mappings').delete().eq('csv_import_id', importId);
  } else {
    const { data, error } = await supabase
      .from('csv_imports')
      .insert({
        client_id,
        name: name ?? 'Google Sheet',
        csv_url,
        status: 'active',
        layout,
        label_column,
        header_row,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    importId = data.id;
  }

  // Insert mappings. date_column is null for wide layout.
  const rows = resolvedMappings.map(m => ({
    csv_import_id: importId,
    indicator_id: m.indicator_id,
    value_column: m.value_column,
    date_column: m.date_column ?? null,
    cadence: m.cadence ?? 'monthly',
  }));
  const { error: mapErr } = await supabase.from('csv_import_mappings').insert(rows);
  if (mapErr) return res.status(500).json({ error: mapErr.message });

  return res.status(200).json({ csv_import_id: importId });
}
