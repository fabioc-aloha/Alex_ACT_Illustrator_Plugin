# Flint Language Reference

**Reviewed**: 2026-08-17  
**Pinned runtime**: `flint-chart-mcp@0.5.0`  
**Scope**: Conceptual reference for Illustrator's Flint workflow. The installed
MCP resources remain authoritative for the exact grammar of the runtime that is
actually available to the agent.

## Version Boundary

Illustrator intentionally pins `flint-chart-mcp@0.5.0` through the user's
configured npm registry and launches it from plugin-private runtime state. The
configured Microsoft package proxy currently exposes `0.5.0` as the latest
published package.

Microsoft's `flint-chart` main branch and public website also describe `0.5.1`.
That source adds Plotly ThemeSpec realization and Vega-Lite Calendar Heatmap
behavior not available in the pinned `0.5.0` runtime. Do not use those newer
features until the configured registry supplies a reviewed package and
Illustrator completes its compatibility and release gates.

## The Language in One Sentence

Flint is a semantics-driven visualization intermediate language: authors
declare what each field means and what chart they intend, then Flint derives
encoding behavior, aggregation defaults, scales, formatting, layout, and a
backend-native chart specification.

The reusable split is:

```text
data + semantic_types + chart_spec -> ChartAssemblyInput -> assemble*() -> native output
```

- `semantic_types` is the reusable **dataSpec**. Keep it stable while comparing
  chart alternatives over the same table.
- `chart_spec` is the changeable **chartSpec**. Change it to explore chart type,
  field-to-channel bindings, sizing, and template-specific properties.
- The compiler, not the author, owns most axes, scales, domains, layouts,
  formatting, and default presentation decisions.

See the official [overview](https://microsoft.github.io/flint-chart/#/documentation/overview),
[published 0.5 API reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/api-reference.md),
and [architecture](https://github.com/microsoft/flint-chart/blob/0.5/docs/architecture.md).

## `ChartAssemblyInput`

At the pinned language level, a complete input has this shape:

```ts
interface ChartAssemblyInput {
  data: { values: Record<string, unknown>[] } | { url: string };
  semantic_types?: Record<string, string | SemanticAnnotation>;
  chart_spec: {
    chartType: string;
    title?: string;
    subtitle?: string;
    encodings: Record<string, ChartEncoding | string>;
    baseSize?: { width: number; height: number };
    canvasSize?: { width: number; height: number };
    chartProperties?: Record<string, unknown>;
  };
  options?: AssembleOptions;
  field_display_names?: Record<string, string>;
  theme_spec?: string | ThemeSpec;
}
```

`data.values` is appropriate for small, prepared tables. `data.url` is a local
JSON, CSV, or TSV reference in the MCP runtime. It is not a remote fetch
mechanism.

For exact types, option defaults, channel support, and template-specific
properties, use the [published 0.5 API reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/api-reference.md)
and the [Vega-Lite template reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/reference-vegalite.md).

## Semantic Types

Semantic types describe meaning rather than storage representation. For example,
an integer `202001` can be `YearMonth`, not a quantitative magnitude; a
`PercentageChange` is a signed measure, not an ordinary quantity.

Use the most specific valid type that truthfully describes each encoded field.
Flint resolves field and chart context into encoding type, aggregation,
formatting, ordering, zero-baseline behavior, color behavior, and layout
decisions.

An annotation can be a bare type string or an object:

```json
{
  "semantic_types": {
    "period": "YearMonth",
    "revenue": { "semanticType": "Price", "unit": "USD" },
    "region": {
      "semanticType": "Category",
      "sortOrder": ["North", "East", "South", "West"]
    }
  }
}
```

The object form supports `semanticType` and, where applicable,
`intrinsicDomain`, `unit`, and `sortOrder`. Do not invent semantic type names.
Use the tagged [semantic type reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/design-semantics.md)
or the installed `flint://agent-skill` resource to select an exact type.

Important authoring consequences:

- Currency-like measures receive currency formatting and normally include zero.
- Signed or diverging measures receive diverging semantics.
- Rank is ordinal and reverses its axis so rank `1` appears first.
- Temporal granules such as `YearMonth` receive temporal parsing and ordering.
- Identifiers should not be treated as a measure or visualized as an axis.

## Chart Intent and Encodings

`chart_spec.chartType` selects a backend template by its exact registered name.
`chart_spec.encodings` maps visual channels to source fields. A string is
shorthand for `{ "field": "..." }`.

```json
{
  "chart_spec": {
    "chartType": "Bar Chart",
    "encodings": {
      "x": { "field": "region" },
      "y": { "field": "revenue" }
    },
    "baseSize": { "width": 480, "height": 320 }
  }
}
```

An encoding object can explicitly set `type`, `aggregate`, `sortOrder`,
`sortBy`, or a color `scheme`, but those are exceptions to semantic inference,
not default authoring fields.

Flint supports one built-in reshape: an array on `x` or `y` folds multiple
quantitative measure columns into a multi-series view. All other aggregation,
filtering, joins, pivots, derived columns, and wide-to-long transformations
should happen before Flint receives the chart-ready table.

## Size, Layout, and Warnings

- `baseSize` is the target size. Flint may stretch toward a ceiling to retain
  readable bands, facets, and labels.
- `canvasSize` is the hard ceiling. Used alone, it creates a fixed box that
  the chart fills and shrinks to fit.
- `options` is an advanced compiler control surface. Prefer the defaults unless
  a validated layout requirement requires an override.
- Flint can truncate overflowed discrete data and returns warnings. Integration
  code must inspect warnings rather than silently presenting a partial chart.

The compiler has three stages:

1. Resolve field and channel semantics.
2. Optimize layout and apply overflow policy.
3. Instantiate a backend-specific dynamic chart template.

The official [architecture reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/architecture.md)
and [auto-layout documentation](https://microsoft.github.io/flint-chart/#/documentation/layout-model)
explain the boundary between author intent and compiler decisions.

## Backends

The JavaScript library can assemble Vega-Lite, ECharts, Chart.js, Plotly, and
Excel artifacts. Illustrator's pinned MCP runtime renders only:

| MCP backend | Use it for | Important boundary |
| --- | --- | --- |
| `vegalite` | Broadest chart coverage, declarative output, and Flint 0.5 ThemeSpec | Default Illustrator backend |
| `echarts` | Rich hierarchical and interactive chart families | Verify chart type support first |
| `chartjs` | Lightweight common chart families | Static PNG only; no SVG engine |

The MCP server's `list_chart_types` is the live contract for the installed
version and backend. Do not copy a chart type from a website gallery without
checking it against that tool.

## Themes

At the published 0.5.0 runtime, `theme_spec` realizes only in Vega-Lite.
Use `list_themes` to discover presets. For custom visual systems, load
`flint://theme-skill` or invoke `author_flint_theme`, then author the smallest
ThemeSpec that truthfully inherits from a preset where possible.

ThemeSpec governs presentation and compiler behavior. It does not choose fields,
aggregations, filters, chart type, or the chart's claim. For exact keys and
merge behavior, use the installed resource and the official
[ThemeSpec guide](https://microsoft.github.io/flint-chart/#/documentation/theme-spec).

## MCP Workflow

For the pinned server, load `flint://agent-skill` or invoke
`author_flint_chart` before authoring an exact spec. The server provides:

| Tool | Use |
| --- | --- |
| `create_chart_view` | Preferred interactive view when the host supports MCP Apps |
| `render_chart` | Static PNG or SVG artifact |
| `compile_chart` | Backend-native JSON |
| `validate_chart` | Validity, warnings, errors, and computed size |
| `list_chart_types` | Installed chart-type and encoding catalog |
| `list_themes` | Installed theme presets and guidance |

Use `create_chart_view` only where the host supports the MCP App UI. Otherwise
use `render_chart` for an artifact. `validate_chart` proves grammar and
computed layout, but it cannot prove that the rendered visual tells the intended
story. Follow rendering with Illustrator's `render-verify` skill.

The tagged [Flint MCP README](https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/README.md)
is the shortest published reference for MCP tools, resources, prompts, local
file policy, and rendering.

## Data Access Boundary

Flint MCP renders locally and never fetches remote URLs. By default it trusts
the host's file-access policy: a `data.url` can read a local JSON, CSV, or TSV
file. For untrusted or server deployments, launch Flint with
`--disable-file-reference` and pass only inline `data.values`.

Illustrator's reviewed local runtime preserves the configured-registry,
plugin-private direct-Node launch contract. Do not replace it with `npx` merely
because Flint's generic documentation uses a zero-install example.

## Rendered Evidence

The checked-in
[Heart with Axes demo](https://github.com/fabioc-aloha/Alex_ACT_Illustrator_Plugin/blob/main/demos/heart-with-axes/report.html)
was reviewed over HTTP on 2026-08-17. Its accessibility tree exposes the Vega
visualization, both semantic axes, quadrant labels, and every plotted archetype.
It is a direct Vega-Lite SVG demonstration, not a Flint MCP
`ChartAssemblyInput` conformance fixture. Use it to review narrative framing and
render verification expectations, not to infer the installed Flint grammar.

## Authoring Checklist

1. Frame the chart's claim through `chart-big-idea`.
2. Prepare a chart-ready table and inspect values, units, totals, and domains.
3. Load the version-matched `flint://agent-skill`.
4. Write stable `semantic_types`, then iterate `chart_spec`.
5. Use `list_chart_types` and `list_themes` as the installed runtime truth.
6. Validate, render or open an interactive view, then run `render-verify`.
7. Preserve backend-native output only as a final presentation escape hatch;
   never feed an edited native spec back to Flint MCP.

## Linked Sources

- [Flint overview](https://microsoft.github.io/flint-chart/#/documentation/overview)
- [Published 0.5 API reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/api-reference.md)
- [Published 0.5 semantic types](https://github.com/microsoft/flint-chart/blob/0.5/docs/design-semantics.md)
- [Published 0.5 architecture](https://github.com/microsoft/flint-chart/blob/0.5/docs/architecture.md)
- [Published 0.5 Vega-Lite chart reference](https://github.com/microsoft/flint-chart/blob/0.5/docs/reference-vegalite.md)
- [Published 0.5 Flint MCP README](https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/README.md)
- [Current Flint MCP setup guide](https://microsoft.github.io/flint-chart/#/documentation/setup-flint-mcp)
- [Current ThemeSpec guide](https://microsoft.github.io/flint-chart/#/documentation/theme-spec)

## Would Revise If

Revise this reference before changing the Flint package pin, if the configured
registry publishes a newer reviewed version, if the MCP resource and tagged
source disagree, if a backend gains or loses ThemeSpec behavior, or if the
rendered demo stops exposing its semantic content accessibly.
