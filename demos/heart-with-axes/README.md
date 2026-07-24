# Heart with Axes — `/render-chart` demo report

A fusion demo: the parametric heart shape plotted onto a semantic Intimacy × Passion plane, with each of the heart's four lobes landing in its matching archetype quadrant. This is the demo referenced from the plugin's top-level [`README.md`](../../README.md#demo--the-heart-chart-with-meaning).

## Big Idea

> The heart shape traced onto the Intimacy × Passion plane isn't decoration — the two upper lobes sit in the high-passion quadrants (infatuation to the left, consummate love to the right), the two lower sides sit in the low-passion quadrants (indifference to the left, companionate love to the right), and the curve between them traces the emotional transitions. Love's iconic silhouette _is_ the four-archetype map.

## What makes this chart different

The load-bearing move is the archetype placement. Each of the heart's four "corners" (upper-left lobe, upper-right lobe, lower-left curve, lower-right curve) sits naturally in the semantic quadrant it argues for:

| Archetype       | Heart position    | Semantic quadrant            |
| --------------- | ----------------- | ---------------------------- |
| Consummate love | right upper lobe  | high Intimacy · high Passion |
| Infatuation     | left upper lobe   | low Intimacy · high Passion  |
| Companionate    | right lower curve | high Intimacy · low Passion  |
| Indifference    | left lower curve  | low Intimacy · low Passion   |

The heart curve then reads as **the trajectory of a relationship** as it moves between archetypes — the shape isn't decorative, it's a **path through emotional space**.

## Layer stack (bottom → top)

The chart is a 12-layer Vega-Lite spec:

1. Shaded top-right rectangle (Consummate quadrant, warm cream)
2. Shaded bottom-left rectangle (Indifference quadrant, cool grey)
3. Faint region labels (INFATUATION / CONSUMMATE LOVE / INDIFFERENCE / FRIENDSHIP)
4. Vertical dashed midpoint rule at Intimacy = 0.5
5. Horizontal dashed midpoint rule at Passion = 0.5
6. Heart curve (connected line, cardinal interpolation, 48 parametric samples)
7. Faint sample dots along the curve (subtle grain)
8. Bold archetype dots at the four lobes
9. Consummate label (dy = -14)
10. Infatuation label (dy = -14)
11. Companionate label (dy = +18)
12. Indifference label (dy = +18)

Per-archetype labels are separate layers because Vega-Lite's `dx`/`dy` are **mark properties, not encoding channels** — a per-point offset requires a separate mark instance. Same gotcha caught earlier in this session on the AIRS fig06 chart.

## Files

- `report.html` — full HTML report with Chart Brief above and lineage table below the chart

## Data provenance

48 parametric heart points computed from:

$$x = 16 \sin^3(t) \qquad y = 13 \cos(t) - 5 \cos(2t) - 2 \cos(3t) - \cos(4t)$$

Linearly rescaled onto the [0, 1] × [0, 1] Intimacy × Passion plane:

- `intimacy = 0.5 + 0.375 * (x / 16)` — symmetric scale
- `passion = 0.5 + 0.35 * (y / 12)` for `y ≥ 0`, or `0.5 + 0.35 * (y / 17)` for `y < 0` — asymmetric scale to preserve the heart's shape (raw y range is `[-17, 12]`, not symmetric)

Archetype coordinates are illustrative — chosen so each lobe of the heart sits inside the correct semantic quadrant while staying visually anchored to the curve.

## Chart Brief

- **Big Idea**: see top of this file
- **Story arc**: Relationship (with decorative locus overlay that reinforces the argument)
- **Audience**: Read (30s) / General / Persuasive
- **Style stance**: INNOVATIVE — the heart-as-locus adds a visual mnemonic on top of the argumentative I × P plane
- **chartType**: layered `connected_scatter_plot`
- **Alternates considered**: plain heart curve (kept as decorative reference), bare I × P quadrant chart (kept as pure-argument reference)
- **Anti-patterns to avoid**: don't let the heart's visual weight overwhelm the axes; don't overload with too many archetype annotations

## What this teaches about the plugin

A chart earns its argument when the Big Idea is load-bearing — not when the visual is pretty. The heart shape here isn't decoration; it's the four-archetype map. `chart-big-idea` is what tells you whether your chart has that kind of argument **before** you author the spec.
