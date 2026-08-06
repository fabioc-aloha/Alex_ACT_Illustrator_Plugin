export function evaluateCompatibility(messages, specs, baseId) {
  const rows = specs.map((spec, index) => {
    const reply = messages.find((message) => message.id === baseId + index);
    const text = reply?.result?.content?.find((content) => content.type === 'text')?.text;
    if (!text) return { name: spec.name, verdict: 'NO REPLY', detail: '' };
    try {
      const result = JSON.parse(text);
      if (typeof result.valid !== 'boolean'
          || (result.errors !== undefined && !Array.isArray(result.errors))
          || (result.warnings !== undefined && !Array.isArray(result.warnings))) {
        return { name: spec.name, verdict: 'INVALID', detail: '  — invalid response shape' };
      }
      const notes = [...(result.errors ?? []), ...(result.warnings ?? [])];
      return {
        name: spec.name,
        verdict: result.valid === true ? 'valid' : 'INVALID',
        detail: notes.length ? `  — ${notes.join('; ')}` : '',
      };
    } catch {
      return { name: spec.name, verdict: 'INVALID', detail: '  — unparseable response' };
    }
  });
  return { rows, bad: rows.filter((row) => row.verdict !== 'valid').length };
}

export function parseCatalogEntries(messages) {
  const call = messages.find((message) => message.id === 3 && message.result?.content);
  const text = call?.result.content.find((content) => content.type === 'text')?.text;
  if (!text) throw new Error('list_chart_types returned no text content');
  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    throw new Error('could not parse list_chart_types output');
  }
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error('list_chart_types must return a nonempty backend array');
  }
  const backends = new Set();
  for (const entry of catalog) {
    const normalizedBackend = typeof entry?.backend === 'string'
      ? entry.backend.trim().toLowerCase()
      : '';
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
        || normalizedBackend === '' || entry.backend !== normalizedBackend
        || !Number.isInteger(entry.count) || entry.count < 0
        || !Array.isArray(entry.chartTypes) || entry.count !== entry.chartTypes.length) {
      throw new Error('list_chart_types returned an invalid backend entry');
    }
    if (backends.has(normalizedBackend)) {
      throw new Error(`list_chart_types returned duplicate backend: ${normalizedBackend}`);
    }
    backends.add(normalizedBackend);
  }
  return catalog;
}
