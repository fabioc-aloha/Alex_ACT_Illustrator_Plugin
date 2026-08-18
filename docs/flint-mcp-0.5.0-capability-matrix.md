# Flint MCP 0.5.0 Capability Matrix

**Runtime:** `flint-chart-mcp@0.5.0`
**Upstream source:** [`microsoft/flint-chart` tag `0.5`](https://github.com/microsoft/flint-chart/tree/0.5)
**Captured:** 2026-08-18 from the plugin-private runtime

## Scope

This matrix describes the MCP server this plugin launches. It does not claim
support for library-only outputs such as Plotly or Excel.

The runtime catalog is authoritative for exact chart-type names and permitted
channels. Before selecting a backend, call `list_chart_types` or read
`flint://chart-types`; the verifier's `--catalog` check captures the installed
backend counts. Do not copy a chart name from a current website without checking
the pinned server.

## MCP surfaces

| Surface | Vega-Lite | ECharts | Chart.js | Use |
| --- | --- | --- | --- | --- |
| `validate_chart` | Yes | Yes | Yes | Check the `ChartAssemblyInput`, warnings, and computed size. |
| `compile_chart` | Yes | Yes | Yes | Produce backend-native JSON; edited output is terminal and cannot go back to Flint MCP. |
| `render_chart` PNG | Yes | Yes | Yes | Produce a static raster artifact. |
| `render_chart` SVG | Yes | Yes | No | Produce a static SVG artifact. Chart.js rejects SVG because it has no SVG engine. |
| `create_chart_view` | Yes | No | No | MCP App: live Vega-Lite SVG preview and customization UI. |
| `theme_spec` | Yes | Ignored | Ignored | Apply a Flint preset or custom ThemeSpec only when Vega-Lite is the selected backend. |

## Backend delivery matrix

| Backend | Runtime catalog | Static output | Important boundary |
| --- | ---: | --- | --- |
| `vegalite` | 35 chart types | SVG or PNG | Default semantic renderer; supports ThemeSpec and the MCP App. |
| `echarts` | 37 chart types | SVG or PNG | Adds hierarchy, flow, gauge, and calendar structures; ThemeSpec is ignored. |
| `chartjs` | 22 chart types | PNG-only | Use only when raster output is acceptable; ThemeSpec is ignored and the MCP App is unavailable. |

## Exact registered chart types

The entries below were returned by the installed `list_chart_types` catalog.
Their allowed channels are runtime data, not a locally invented schema; inspect
the same catalog for the exact channel list when authoring a chart.

| Backend | Exact registered chart types |
| --- | --- |
| Vega-Lite (35) | Area Chart; Bar Chart; Bar Table; Boxplot; Bullet Chart; Bump Chart; Candlestick Chart; Choropleth; Connected Scatter Plot; Density Plot; Donut Chart; ECDF Plot; Gantt Chart; Grouped Bar Chart; Heatmap; Histogram; KPI Card; Line Chart; Lollipop Chart; Map; Pie Chart; Pyramid Chart; Radar Chart; Range Area Chart; Ranged Dot Plot; Regression; Rose Chart; Scatter Plot; Slope Chart; Sparkline; Stacked Bar Chart; Streamgraph; Strip Plot; Violin Plot; Waterfall Chart |
| ECharts (37) | Area Chart; Bar Chart; Boxplot; Bullet Chart; Bump Chart; Calendar Heatmap; Candlestick Chart; Connected Scatter Plot; Density Plot; ECDF Plot; Funnel Chart; Gantt Chart; Gauge Chart; Grouped Bar Chart; Heatmap; Histogram; Line Chart; Lollipop Chart; Network Graph; Parallel Coordinates; Pie Chart; Pyramid Chart; Radar Chart; Range Area Chart; Ranged Dot Plot; Regression; Rose Chart; Sankey Diagram; Scatter Plot; Slope Chart; Stacked Bar Chart; Streamgraph; Strip Plot; Sunburst Chart; Tree; Treemap; Waterfall Chart |
| Chart.js (22) | Area Chart; Bar Chart; Bubble Chart; Bump Chart; Combo Chart; Connected Scatter Plot; Doughnut Chart; ECDF Plot; Gantt Chart; Grouped Bar Chart; Histogram; Line Chart; Lollipop Chart; Pie Chart; Radar Chart; Range Area Chart; Rose Chart; Scatter Plot; Slope Chart; Stacked Bar Chart; Strip Plot; Waterfall Chart |

## Boundary fixtures

Run the existing verifier against a provisioned private runtime:

```powershell
node scripts/verify-install.mjs --catalog --compat --artifacts
```

The `--artifacts` pass proves the representative boundaries below:

| Fixture | Assertions |
| --- | --- |
| Vega-Lite themed bar | `Bar Chart` is listed; validation and compilation are warning-free; `theme_spec: "economist"` renders a complete SVG. |
| ECharts Tree | `Tree` is listed for ECharts; the hierarchy fixture validates and compiles warning-free; rendering returns a complete SVG. |
| Chart.js bar | `Bar Chart` is listed for Chart.js; rendering returns PNG; an SVG request fails with the server's PNG-only error. |

These fixtures do not prove every chart template visually. They protect the
high-risk distinctions this plugin documents; use `render-verify` for each
deliverable.

For fixture provenance and exact execution behavior, see the
[conformance-fixture reference](flint-mcp-conformance.md).

## Related sources

- [MCP tool contract](https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/src/server.ts)
- [MCP schemas](https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/src/tools/schemas.ts)
- [Vega-Lite reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/reference-vegalite.md)
- [ECharts reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/reference-echarts.md)
- [Chart.js reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/reference-chartjs.md)
