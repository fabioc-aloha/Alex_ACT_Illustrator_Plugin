# 2026-07-24 — Heart Chart demo (report)

Self-contained output from the `flint-chart` plugin's `/render-chart` prompt, run with the argument _"with a big red heart in the middle"_.

## Files

- [`report.html`](report.html) — open in a browser. Renders the chart via Vega-Embed (CDN); no local install required.
- [`chart-input.json`](chart-input.json) — the `ChartAssemblyInput` (Flint spec) that produced the chart.

## Reproducing

1. `Ctrl+Shift+P` → _Developer: Reload Window_ so the `flint` MCP server spawns from workspace-root `.mcp.json`.
2. Open a fresh Copilot Chat.
3. `/render-chart with a big red heart in the middle`
4. Expected: `create_chart_view` opens an interactive panel matching the report.

## Notes

- Report folder `.reports/` is gitignored via `.git/info/exclude` — nothing here will commit to `microsoft/flint-chart`.
- HTML uses jsdelivr CDNs for Vega / Vega-Lite / Vega-Embed. Offline copy: replace the three `<script src=...>` tags with local files if needed.
