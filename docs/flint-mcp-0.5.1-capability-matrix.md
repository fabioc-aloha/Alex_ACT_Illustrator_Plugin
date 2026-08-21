# Flint MCP 0.5.1 Capability Matrix

**Runtime:** `flint-chart-mcp@0.5.1`
**Captured:** 2026-08-21 from a disposable runtime installed through the
configured npm registry
**Scope:** MCP capabilities only. Library-only outputs such as Plotly remain
outside this plugin's MCP contract.

## Runtime Contract

The disposable server negotiated protocol `2024-11-05` and exposed the same six
tools, ten themes, two authoring resources, and two authoring prompts as the
reviewed `0.5.0` runtime:

- Tools: `render_chart`, `compile_chart`, `validate_chart`,
  `list_chart_types`, `list_themes`, and `create_chart_view`.
- Resources: `flint://agent-skill` and `flint://theme-skill`.
- Prompts: `author_flint_chart` and `author_flint_theme`.

## Backend Delivery Matrix

| Backend | Runtime catalog | Static output | Important boundary |
| --- | ---: | --- | --- |
| `vegalite` | 36 chart types | SVG or PNG | Supports ThemeSpec, `create_chart_view`, and Calendar Heatmap. |
| `echarts` | 37 chart types | SVG or PNG | Supports Calendar Heatmap; ThemeSpec is ignored. |
| `chartjs` | 22 chart types | PNG only | Does not list Calendar Heatmap; ThemeSpec and the MCP App are unavailable. |

`create_chart_view` is the interactive Vega-Lite-only MCP App path. Chart.js rejects SVG: its bar fixture renders PNG only. Use ECharts or Vega-Lite when the deliverable requires an SVG artifact.

## New Tested Route

`Calendar Heatmap` takes a date on `x` and a daily measure on `color`. The
runtime sums multiple rows that share a day into a week-by-week grid. The
verifier validates, compiles, and renders Calendar Heatmap fixtures on both
Vega-Lite and ECharts. For interactive customization, choose Vega-Lite with
`create_chart_view`; ECharts uses `render_chart` or `compile_chart`.

Always call `list_chart_types` when the host may be running a different runtime
version. This matrix records one reviewed pin, not a promise about future Flint
releases.

## Boundary Fixtures

Run the version-matched private runtime through:

```powershell
node scripts/verify-install.mjs --catalog --compat --artifacts
```

The `--artifacts` pass protects Vega-Lite themed bar SVG, ECharts Tree SVG,
Chart.js bar PNG/SVG rejection, Vega-Lite Calendar Heatmap SVG, and ECharts
Calendar Heatmap SVG. Use `render-verify` for every delivery artifact; fixture success
does not replace visual review.
