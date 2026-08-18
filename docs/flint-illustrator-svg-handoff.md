# Flint SVG Handoff to Illustrator

**Status:** Contract defined; manual import acceptance pending
**Runtime:** `flint-chart-mcp@0.5.0`

## Scope

Flint can serialize SVG from Vega-Lite and ECharts. Chart.js is PNG-only and is
not an editable-vector delivery path.

SVG serialization is not a guarantee that every imported object will be
independently editable in Adobe Illustrator. This contract distinguishes a
vector candidate from verified Illustrator delivery.

## Delivery contract

1. Retain the source `ChartAssemblyInput`, selected backend, package version,
   render format, and unmodified returned SVG.
2. Treat an Illustrator-edited SVG, AI file, or exported derivative as terminal
   artwork. Do not submit it back to Flint MCP or describe it as regenerable
   `ChartAssemblyInput`.
3. Use `render_chart` with `format: "svg"` only on `vegalite` or `echarts`.
4. Record the Illustrator version and operating system that performed the
   acceptance review. This repository makes no broader version claim until an
   acceptance record exists.
5. Keep the original SVG beside the edited deliverable or preserve a stable
   reference and checksum in the delivery record.

## Manual import acceptance checklist

For each eligible SVG, open the unmodified artifact in the target Illustrator
version and record pass/fail for:

| Check | Acceptance condition |
| --- | --- |
| Open | Illustrator opens the SVG without a repair prompt or data loss. |
| Text | Any font substitution is recorded; titles, labels, axes, and legends remain readable. |
| Geometry | Data marks, axes, labels, legends, clipping, transforms, and grouping remain visible and correctly positioned. |
| Selectability | Objects required for the delivery are selectable and editable at the required granularity. |
| Export | A tested export does not introduce clipping, missing text, or an invalid SVG. |
| Narrative | The imported artifact still passes the relevant `render-verify` checks at its delivery size. |

If any check fails, deliver the unmodified SVG only where appropriate or choose
a different downstream workflow. Do not silently rasterize an artifact while
claiming editable-vector delivery.

## Acceptance record template

```text
Input: <ChartAssemblyInput path or immutable identifier>
Backend: vegalite | echarts
Flint MCP: 0.5.0
Render format: svg
Source SVG checksum: <sha256>
Illustrator: <version>
Operating system: <version>
Checks: open <pass/fail>; text <pass/fail>; geometry <pass/fail>;
        selectability <pass/fail>; export <pass/fail>; narrative <pass/fail>
Output: <terminal artwork path or delivery location>
Notes: <font substitutions, unsupported SVG features, or exceptions>
```

## Current evidence

The automated conformance suite proves that the pinned runtime returns complete
SVG documents for representative Vega-Lite and ECharts fixtures. It does not
automate Adobe Illustrator import; that step requires a human review in the
target application.
