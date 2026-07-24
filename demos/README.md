# Demos

Three demos, three rhetorical modes, one MCP backend. Each was rendered end-to-end via `/render-chart` against the local `flint` MCP server (`flint-chart-mcp@^0.2.2`). Together they illustrate what the `chart-big-idea` skill was designed to catch — the difference between a chart with a **Big Idea** and a chart without one.

## The rhetorical spectrum

| Demo                                   | Mode                                                                                                                                                                      | Big Idea? |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| [`heart-chart/`](heart-chart/)         | Decoration only — a parametric heart curve rendered on `x`/`y` axes with no argument about its own data                                                                   | ❌ No     |
| [`love-axes/`](love-axes/)             | Pure argument — Intimacy × Passion quadrant map with archetype dots, no heart shape                                                                                       | ✅ Yes    |
| [`heart-with-axes/`](heart-with-axes/) | Fusion — the heart shape from demo 1, plotted onto the argumentative I × P plane of demo 2, with each of the heart's four lobes landing in its matching semantic quadrant | ✅ Yes    |

The **fusion demo** (`heart-with-axes/`) is the one referenced from the plugin's top-level [`README.md`](../README.md#demo--the-heart-chart-with-meaning). The other two exist as reference points on the spectrum.

## What this teaches

The choice of chart isn't the load-bearing move — the choice of **whether the chart argues something** is. All three demos use the same tools (Vega-Lite via `flint-chart-mcp`), the same data class (parametric or quadrant coordinates), and yet occupy completely different rhetorical positions:

- The **decoration** demo is a good capability check ("can Flint render a parametric curve?" — yes)
- The **pure argument** demo is what you'd ship for a data-fluent audience with an argument to make ("here's the model of love, on two axes")
- The **fusion** demo is what you'd ship for a general audience needing both the model AND a memorable image ("the heart itself is the four-archetype map")

`chart-big-idea` fires _before_ the chart type is chosen — its output (the Chart Brief) is the constraint that tells the `flint-chart` skill which mode to build for.

## Opening the demos

Each demo folder ships an `report.html` that's fully self-contained — open with any browser (double-click, or `Invoke-Item report.html` in PowerShell). The chart renders client-side via Vega-Embed 6 CDN scripts; no MCP server is required just to view.

To _re-generate_ any of these charts via the plugin's own workflow, install the plugin (see the [top-level README](../README.md#install)), then run `/render-chart` in your MCP-capable host with the appropriate Chart Brief.
