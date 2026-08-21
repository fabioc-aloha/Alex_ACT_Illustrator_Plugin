# Flint MCP 0.5.1 Conformance Fixtures

**Runtime:** `flint-chart-mcp@0.5.1`
**Status:** Executable evidence
**Source fixtures:** `ARTIFACT_SPECS` in
[`scripts/verify-install.mjs`](../scripts/verify-install.mjs)

## Purpose

These fixtures prove the critical MCP backend boundaries of the pinned runtime.
They are deliberately small and are not reader-facing examples or reusable
visual designs.

The [Heart with Axes](../demos/heart-with-axes/) report remains a direct
Vega-Lite narrative artifact. It is not part of this conformance set.

## Run

```powershell
node scripts/verify-install.mjs --catalog --compat --artifacts
```

The verifier opens the plugin-private Flint server once, checks that each
fixture's chart type is present in `list_chart_types`, then validates, compiles,
and renders it. The generated outputs remain in memory; only source fixtures
and assertions live in the repository.

## Fixtures

| Fixture | Input boundary | Expected evidence |
| --- | --- | --- |
| Vega-Lite themed bar | `Bar Chart`, `theme_spec: "economist"`, SVG | Catalog presence; warning-free validation and compilation; complete SVG document. |
| ECharts Tree | `Tree` with `detail`, `color`, and `size`, SVG | Catalog presence; warning-free validation and compilation; complete SVG document. |
| Chart.js bar | `Bar Chart`, PNG plus an SVG-negative test | Catalog presence; warning-free validation and compilation; PNG payload; SVG request rejected as PNG-only. |
| Calendar Heatmap | Date `x`, daily-value `color`, SVG | Catalog presence, warning-free validation and compilation, and complete SVG documents on Vega-Lite and ECharts. |

The conformance suite does not substitute for visual review. Run
[`render-verify`](../.github/skills/render-verify/SKILL.md) for every chart
intended for publication or delivery.
