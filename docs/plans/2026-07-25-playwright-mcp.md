# Second MCP server — Playwright for render verification

**Status:** SHIPPED in v0.4.0 · all decisions locked · **Raised:** 2026-07-25 · **Closed:** 2026-07-25

> **Amendment 2026-07-25 (v0.5.0):** the skill shipped as `chart-verify` and was
> renamed **`render-verify`** immediately afterwards — the original name implied
> it only worked on charts, when the method (open → read console → walk a
> catalog → check the claim) applies to any rendered artifact. A second,
> general failure catalog was added alongside the chart one. Decision rows below
> keep the original name because that is what was locked at the time; current
> paths are `.github/skills/render-verify/`.

**Goal:** Add a second, optional MCP server to this plugin so the agent can
*look at* what it rendered instead of assuming the render succeeded — covering
Flint PNG/SVG output, post-Flint edited Vega-Lite specs, and the `demos/` HTML.

This document is the decision record. Current-state facts live in
[`manifest.json`](../../manifest.json), [`../../README.md`](../../README.md),
and [`../../CHANGELOG.md`](../../CHANGELOG.md).

## The gap

The plugin names two holes in its own skill body and ships a tool for neither.

| # | Gap | Where the plugin admits it |
| - | --- | -------------------------- |
| 1 | **Data transformation** — aggregation, pivots, derived ratios before the spec is authored | [`flint-chart/SKILL.md`](../../.github/skills/flint-chart/SKILL.md) *Data transformation before charting*: "transform the data first with a host tool"; *How data gets bound*: "use a coding/data tool to write a small prepared file" |
| 2 | **Visual verification of the result** | [`flint-chart/SKILL.md`](../../.github/skills/flint-chart/SKILL.md) *Post-Flint style customization* forbids sending an edited Vega-Lite spec back to `render_chart`, then instructs "render the edited spec in the host environment with a Vega-Lite renderer" — and no renderer ships |

Gap 2 is the sharper one because it is a loop the skill deliberately **opens**.
It also already carries a standing manual rule that nothing enforces:
[`copilot-instructions.md`](../../.github/copilot-instructions.md) — "Do not push
demo HTML changes without opening the report in a browser first — inline
Vega-Lite specs can fail silently."

Silent-but-wrong is this plugin's characteristic bug shape (see *Known failure
modes* in [`../README.md`](../README.md)). A chart with a collapsed scale, a
merged color scale, or an undefined axis category renders as a perfectly valid
image that tells the wrong story. No validator catches that. Only looking does.

Gap 1 is deferred — see *Rejected alternatives*.

## Decisions

| # | Decision | Value | Status | Rationale |
| - | -------- | ----- | ------ | --------- |
| **D1** | Which gap to close | **Gap 2 — visual verification, via `@playwright/mcp`** | **Locked 2026-07-25** | Gap 1's best tools are unreachable from the corporate mirror and carry a second runtime; see *Rejected alternatives* |
| **D2** | Required or optional | **Optional** — shipped in [`.vscode/mcp.json`](../../.vscode/mcp.json) as reference wiring, `required: false` in the manifest, README tells VS Code heirs to omit it | **Locked 2026-07-25** | Not a download cost — Task 1 falsified that. The cost is *configuration*: a `--browser` channel that may be absent, plus `--allow-unrestricted-file-access` without which every local render silently fails to load. This repo ships the entry so the config shape is dogfooded and testable |
| **D3** | Skill integration | **Host-agnostic** — new `chart-verify` skill names the *capability* (open / read console / screenshot) and carries a host table; Playwright is one way to satisfy it | **Locked 2026-07-25** | VS Code Copilot heirs already have `open_browser_page` / `screenshot_page`, **verified working on this repo's own demo in Task 1**. Naming Playwright specifically would push them onto a redundant 2nd server |
| **D4** | Version pin | **Exact** — `@playwright/mcp@0.0.78` | **Locked 2026-07-25** | Caret on `0.0.x` expands to `>=0.0.78 <0.0.79` — it protects nothing and reads as if it does. Contrast the `flint-chart-mcp@^0.2.2` pin, where caret on `0.x` is a real restriction. The handshake reports the *Playwright library* version, not the package version — do not pin against it |
| **D5** | Mall payload | **Vendor it** — `mcp.json` carries both servers; `plugin.json` marks `playwright` optional; `skills/chart-verify/SKILL.md` joins the payload | **Locked 2026-07-25** | Follows D2. The runbook copies `mcp.json` byte-identical, so the optional-ness must live in `plugin.json` metadata and the README, not in a comment (the file must stay strict JSON) |
| **D6** | Browser channel | **`--browser msedge`** in the shipped args | **Locked 2026-07-25** | Added after the supported-surface scope narrowed to VS Code + Copilot CLI + Copilot app. VS Code omits the server entirely, so the channel only affects CLI/app users — who have no built-in fallback. Most heirs are corpnet Windows, where Edge ships with the OS and the upstream default (`chrome`) is frequently absent; this machine demonstrated exactly that failure. Linux heirs override |

**D2/D3 interact.** If D3 is host-agnostic, then for the largest heir
population (VS Code) the Playwright server is *never installed* and the skill
step still works — Task 1 confirmed the built-ins handle the `file://` demo
with no configuration. That is the argument for D2 = optional. If D3 named
Playwright explicitly, D2 would have to be required, and the plugin's install
cost roughly doubles for zero gain on VS Code.

## Rejected alternatives

Probed against the corporate mirror (`packagefeedproxy.microsoft.io/npm/`) on
2026-07-25. Reachability is decisive here for the same reason it parked the
0.4.0 bump in [`HANDOFF.md`](../../HANDOFF.md) — most heirs are corpnet repos.

### Gap 1 — data transformation

| Candidate | Reachable | Verdict |
| --------- | --------- | ------- |
| `duckdb-mcp-server`, `@motherduck/mcp-server-motherduck` | **No** | Architecturally the better answer — bad input data causes more wrong charts than unverified output does — but unreachable, *and* Python/`uvx`, adding a second runtime to a Node-only plugin. Revisit if the mirror syncs it |
| `@modelcontextprotocol/server-filesystem` | Yes | Every host already has file tools. Near-zero marginal value |

### Diagramming (explored, then dropped entirely)

The filter applied was **"what can the agent not already emit as text?"** — not
feature count. Mermaid failed it immediately: agents author fenced ` ```mermaid `
blocks natively and hosts render them, so an MCP server buys only rasterization,
syntax validation, and theming — of which the first two fall out of the
Playwright browser for free, since `@mermaid-js/mermaid-cli` is itself a headless
browser driver.

| Candidate | Reachable | Verdict |
| --------- | --------- | ------- |
| `mcp-mermaid`, `mermaid-mcp-server`, `@peng-shawn/mermaid-mcp-server` | Yes | No gain — see above. Also risks duplicating Mermaid capability that belongs in the ACT Edition Core |
| `nomnoml`, `pintora` | Yes (`pintora` at 0.1.0) | Text-to-diagram, same category as Mermaid. Pintora is effectively dead |
| `wavedrom` | Yes | Genuinely unrendered anywhere native — and entirely the wrong plugin |
| `structurizr-typescript` | Yes, **stale at 1.0.15** | Real value (validates the *model*, generates multiple consistent C4 views from one source — something an agent cannot cross-check by hand). Abandoned community port; real Structurizr is a Java CLI. **Worth revisiting if a maintained port appears** |
| `@excalidraw/excalidraw`, `excalidraw-mcp` | Yes | The agent would still compute every coordinate by hand |
| `elkjs`, `@dagrejs/dagre`, `@hpcc-js/wasm` (Graphviz) | Yes | **Layout computation is the one genuine capability gap** — an agent cannot solve node placement by inspection. But it is a *library* call, belonging inside the verification harness, not a fourth MCP server. And `@mermaid-js/layout-elk` closes most of it inside Mermaid via a frontmatter directive the agent can author |
| `cytoscape` | Yes | Graph *metrics* (centrality, community detection) — that is Gap 1, and its output feeds a chart Flint already renders |
| `graphviz-mcp`, `d2-mcp` | 0.0.2 / **No** | Immaturity and unavailability respectively |
| `kroki-mcp` | Yes | **Hard no.** POSTs diagram source to a remote render service, breaking the plugin's headline guarantee that no data leaves the machine |
| `mcp-server-chart` (AntV) | Beta only | A competing renderer — would fork the plugin's identity |

**The closing argument against all of them:** [`chart-big-idea`](../../.github/skills/chart-big-idea/SKILL.md)
exists to force a one-sentence claim before anything is drawn. A large
auto-laid-out graph — the only diagram class that would justify a layout engine —
has no such claim. The diagrams that survive Step 1 are small enough that
Mermaid's default layout is adequate.

## Assumptions

1. Heirs already have Node ≥ 22 (existing prerequisite; unchanged).
2. VS Code Copilot heirs have built-in browser/screenshot tools. **Unverified for
   Claude Desktop, Cursor, and Copilot CLI** — this is what makes the optional
   server worth shipping at all. **Confirmed for VS Code** by Task 1; still
   unmeasured for the other three.
3. ~~`@playwright/mcp` requires a browser binary beyond the npm package itself.~~
   **Falsified by Task 1** — it drives an *already-installed* browser by channel.

## Tasks

### Task 1 — Measure before asserting anything — DONE 2026-07-25

This repo has twice shipped claims that turned out to be the corporate mirror's
view reported as global truth, and once asserted 0.3.0 compatibility before
measuring it (see the *Unreleased* section of [`CHANGELOG.md`](../../CHANGELOG.md)).
Measured via an stdio handshake against `npx -y @playwright/mcp@0.0.78`, driven
against [`demos/heart-with-axes/report.html`](../../demos/heart-with-axes/report.html):

| # | Fact | Measured |
| - | ---- | -------- |
| 1 | Server version actually resolved | Package `0.0.78` resolves from the corporate mirror. **The handshake reports `Playwright v1.62.0-alpha-1783623505000`** — the underlying library version, *not* the package version. Do not pin against what `serverInfo` returns |
| 2 | Tool count and names | **24 tools.** Capture (`browser_take_screenshot`, `browser_snapshot`); diagnostics (`browser_console_messages`, `browser_network_requests`, `browser_network_request`); navigation (`browser_navigate`, `browser_tabs`, `browser_resize`, `browser_wait_for`, …); interaction (`browser_click`, `browser_hover`, `browser_fill_form`, …); escape hatches (`browser_evaluate`, `browser_run_code_unsafe`). Opt-in `--caps vision,pdf,devtools` |
| 3 | Whether a separate browser install is needed | **No download by default — but a browser must already exist.** Default channel is installed Google Chrome; absent, it fails with `Chromium distribution 'chrome' is not found … Run "npx playwright install chrome"` |
| 4 | Whether it can drive an already-installed Chrome/Edge | **Yes.** `--browser msedge` launched in **0.7 s**, zero download |
| 5 | Whether it works headless with a `file://` URL | **Not by default.** `Access to "file:" protocol is blocked`. Requires `--allow-unrestricted-file-access`, or the target must sit under a configured workspace root |
| 6 | *(unplanned)* VS Code internal browser on the same target | **Works with no configuration at all** — opened the `file://` demo and screenshotted it, correct render, no flags, no download, no browser channel |

**Net effect on D2: the cost argument was wrong in substance, right in
conclusion.** The cost is not a 150 MB download; it is *configuration* — a
browser channel that may not exist on the machine, plus a file-access flag that
must be set or every local render silently fails to load. That is more fragile
than a download, not less, and fact 5 is exactly this plugin's documented
silent-failure bug shape.

**The one capability VS Code's built-ins do not obviously match** is
`browser_console_messages`. That is what catches a silently-failing inline
Vega-Lite spec *by cause* rather than by eyeball, and it is now the strongest
remaining argument for the second server.

Folding these probes into [`scripts/verify-install.mjs`](../../scripts/verify-install.mjs)
behind a `--playwright` flag remains the natural home — it already does an stdio
handshake plus `tools/list` against an `npx`-fetched server with zero dependencies.

### Task 2 — Close D2–D5 — DONE 2026-07-25

Locked in the decisions table above, using Task 1's measurements. Open question
carried forward as a falsifier: does any non-VS-Code host lack an adequate
built-in screenshot tool? If none do, the `playwright` entry can be dropped from
the payload without touching `render-verify`, because D3 kept the skill
host-agnostic.

### Task 3 — Implementation — DONE 2026-07-25 (v0.4.0)

- **New** [`.github/skills/render-verify/SKILL.md`](../../.github/skills/render-verify/SKILL.md)
  — failure catalog, host-capability table, Playwright setup + security note,
  troubleshooting, anti-patterns
- [`.vscode/mcp.json`](../../.vscode/mcp.json) — second `playwright` entry
- [`render-chart.prompt.md`](../../.github/prompts/render-chart.prompt.md) —
  Step 8 Verify; Step 9 reports whether verification happened
- [`flint-chart/SKILL.md`](../../.github/skills/flint-chart/SKILL.md) — "Look at
  what you rendered" bullet; mandatory-verification note on the post-Flint
  escape hatch
- [`manifest.json`](../../manifest.json) — `assets.mcp` restructured to a
  `servers` array with `required` flags; 0.3.2 → 0.4.0
- [`.gitignore`](../../.gitignore) — `.playwright-mcp/`
- [`README.md`](../../README.md), [`CHANGELOG.md`](../../CHANGELOG.md),
  [`../README.md`](../README.md) — docs, security warning, failure-mode rows

**Not done:** folding the probes into
[`scripts/verify-install.mjs`](../../scripts/verify-install.mjs) behind a
`--playwright` flag. The measurements were taken with throwaway probes. If the
Playwright entry stays in the payload past one release, this should exist so the
facts above stay measured rather than remembered.

## Would Revise If

- ~~**Task 1 shows `@playwright/mcp` can drive an existing browser with no
  separate download.**~~ **FIRED 2026-07-25** — it can (`--browser msedge`,
  0.7 s, zero download). But the conclusion held: the replacement cost is
  configuration fragility, including a default `file:` block that fails in this
  plugin's characteristic silent way. D2 stays *proposed optional*.
- **Any non-VS-Code host turns out to have adequate built-in screenshot tools.**
  Then the second server has no audience and this plan should be abandoned in
  favor of D3's wording change alone. **This is now the deciding question.**
- **`browser_console_messages` turns out to be reachable from VS Code's
  built-ins.** It is currently the strongest remaining argument for the second
  server — catching a silently-failing Vega-Lite spec by cause rather than by
  eyeball. If the built-ins expose page console errors, that argument collapses.
- **The corporate mirror syncs a DuckDB MCP server.** Gap 1 then becomes
  reachable and is arguably the higher-value addition; re-open D1.
- **A maintained Structurizr TypeScript port appears.** Model validation across
  multiple C4 views is the one diagramming capability an agent genuinely cannot
  self-supply; the diagramming rejection above would deserve a re-read.
- **Revise by 2026-10-25 regardless** if none of the above has fired — a plan
  parked for three months is usually a plan that was never load-bearing.
