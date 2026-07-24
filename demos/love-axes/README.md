# Love Axes — `/render-chart` demo report

Companion to the [heart chart demo](../heart-chart/) — this one is the _counter-example_.

## Purpose

Demonstrate the difference between a chart with a **Big Idea** and a chart with a **topic**, using the `chart-big-idea` skill's own criteria.

Same MCP server (`flint-chart-mcp@^0.2.2`), same backend (Vega-Lite), same tool inventory — completely different rhetorical shape. The difference is 100% upstream framing, not chart-type selection.

## Files

- **`report.html`** — full HTML report with the Chart Brief above the chart and a contrast section below. Uses Vega-Embed inline (no MCP server needed to view). Open in any browser.

There is **no `chart-input.json`** in this folder because the chart is a hand-authored layered Vega-Lite spec (12 layers: 2 shaded quadrant rects + 4 faint region labels + 2 midpoint reference rules + 1 archetype scatter + 4 per-archetype text labels). It's not a Flint-native `chartType` — it's what the Chart Brief calls "layered scatter_plot" with custom composition, easier to author directly than to squeeze through Flint's `ChartAssemblyInput`.

## Chart Brief

- **Big Idea**: _"Intimacy and passion are the only truly orthogonal components of love — commitment correlates too tightly with intimacy to add a distinct axis — so a defensible model of love is a 2D map, and the four quadrants correspond to real, distinct relationship types."_
- **Story arc**: Relationship (with quadrant annotation)
- **Audience**: Read (30s) / General / Persuasive
- **Style stance**: INNOVATIVE
- **chartType**: layered `scatter_plot`
- **Alternates considered**: Sternberg triangle (rejected — the Big Idea refutes the third axis; using the standard viz would visually contradict the argument), 2×2 BCG matrix (rejected — forces binary high/low, loses the "moderate-to-high passion" nuance).

## What this teaches about the plugin

The heart chart is a beautiful capability demo — Flint can render a parametric heart curve as a connected scatter, and it looks great. But if we'd run `chart-big-idea` on it beforehand, Step 1 would have surfaced "there is no argument here, this is decoration." The right response would have been either (a) reframe the demo around an actual claim about the data, or (b) accept it as a decorative capability demo and label it that way in the README.

The love-axes chart is what happens when the same tool is used with framing discipline. Both are valid uses of Flint; only one lands an argument.

## Attribution

- **Big Idea** distilled from the user's own conceptual essay on the orthogonality of intimacy and passion (as opposed to Sternberg's triangular theory of love).
- **Coordinates** for the four archetypes are illustrative — chosen to make the chart's quadrant argument legible, not to represent measured data.
- **Chart** rendered client-side via Vega-Embed 6 + Vega-Lite 5 CDN scripts.
