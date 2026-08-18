# Demos

One illustrative direct Vega-Lite demo. It is not a `ChartAssemblyInput` fixture
and was authored before the current `flint-chart-mcp@0.5.0` pin. It demonstrates
narrative framing and render verification, not the installed MCP grammar. See
[the capability matrix](../docs/flint-mcp-0.5.0-capability-matrix.md) for
version-pinned MCP conformance evidence.

## What ships

- **[`heart-with-axes/`](heart-with-axes/)** — the parametric heart shape plotted onto a semantic Intimacy × Passion plane, with each of the heart's four lobes landing in its matching archetype quadrant. This is the demo referenced from the plugin's top-level [`README.md`](../README.md#demo--the-heart-chart-with-meaning). The folder README carries the Chart Brief and layer-by-layer breakdown; `report.html` is the rendered artifact.

## What it teaches

A chart earns its argument when the Big Idea is load-bearing — not when the visual is pretty. The heart shape here isn't decoration; it's the four-archetype map of love, and each lobe sits in the semantic quadrant it argues for. `chart-big-idea` is what tells you whether your chart has that kind of argument **before** you author the spec.

## Opening the demo

The demo's `report.html` is fully self-contained — open with any browser (double-click, or `Invoke-Item report.html` in PowerShell). The chart renders client-side via Vega-Embed 6 CDN scripts; no MCP server is required just to view.

To _re-generate_ the chart via the plugin's own workflow, install the plugin (see the [top-level README](../README.md#install)), then run `/render-chart` in your MCP-capable host with the appropriate Chart Brief.
