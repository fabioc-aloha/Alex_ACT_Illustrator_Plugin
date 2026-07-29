# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Bumped MCP pin to `^0.3.0` (2026-07-29)

**Trigger:** the Microsoft corporate npm mirror
(`packagefeedproxy.microsoft.io/npm/`) caught up to `flint-chart-mcp@0.3.0` on
2026-07-26 (or shortly after). The `^0.2.2` hold decision recorded below was
contingent on the mirror stopping at 0.2.2; that constraint is gone.

**Verified 2026-07-29** via `node scripts/verify-install.mjs`:

```text
      spec: flint-chart-mcp@^0.3.0  (from .vscode/mcp.json)
OK    server: flint-chart-mcp v0.3.0
OK    protocol: 2024-11-05
OK    tools (5): render_chart, compile_chart, validate_chart, list_chart_types, create_chart_view
```

Same five tools with byte-identical TypeScript type definitions
(`dist/server.d.ts` and `dist/render/index.d.ts` diff clean between 0.2.2 and
0.3.0) — the plugin's tool-shape assumptions are safe drop-in.

**What 0.3.0 adds** (all additive, no breaking API changes at the MCP surface):

_New chart-type capacity_ — none. `list_chart_types` still returns the same
~30 chart types across Vega-Lite, ECharts, and Chart.js. (The substantial
new chart-type additions — Excel backend with 18 templates, Plotly backend
expanded from 4 to 38 types — landed in 0.4.0, which is not reachable via
the `^0.3.0` pin.)

_Chart property additions_:

- `dodge` prop on Grouped Bar + Boxplot (`auto` | `local` | `global`)
- `sortSlices` prop on Pie + Rose Charts (`none` | `descending` | `ascending`)
- `stackMode: center` value — streamgraph rendering via Area / Stacked Bar
- `showTextLabels` prop on Waterfall — value labels on bars
- Gantt: task-height, corner-radius, and interval-label controls

_New public library APIs_ (not yet exposed as distinct MCP tools):

- Backend-neutral **chart-type recommendation API** — programmatic access to
  "here are compatible alternatives for this spec + data shape"
- Backend-neutral **chart-type transformation API** — data-preserving
  transitions between compatible chart types (Line → Sparkline, Bar →
  Stacked Bar, etc.), plus arrangement controls
- These surface only through the interactive `create_chart_view` MCP App UI
  today; headless MCP tools (`render_chart`, `compile_chart`, `validate_chart`,
  `list_chart_types`) are unchanged

_MCP App (`create_chart_view`) UI additions_:

- Dynamic controls to switch chart types, rearrange encodings, and edit chart
  properties in place without rewriting the authored Flint spec
- PNG copy, download, and reset actions in the widget

_Documentation additions_:

- Chinese-language website and translated documentation
- Plugin skill now points at the upstream `docs/reference-*.md` per-backend
  catalogs + `docs/design-semantics.md` (70+ semantic types) as deep
  references, all pinned to the `0.3.0` tag

_Rendering improvements (not user-facing API changes)_:

- Sparse stacked areas and streamgraphs interpolate interior gaps instead of
  dropping to zero
- Vega-Lite axes and derived text marks share semantic formatting so currency
  and other formatted aggregate values retain their intended units
- Improved local dodge behavior for sparse grouped bars and boxplots

**What 0.3.0 removes** — impact scan against this plugin's documented surface:

| 0.3.0 removal | Plugin impact |
| ------------- | ------------- |
| Rose Chart `innerRadius` prop | **None.** The plugin's skills never document `innerRadius` on Rose; the prop only surfaces on Pie (Donut recipe), which is unchanged. |
| `dodge: "none"` (Grouped Bar) | **None.** The plugin's `flint-chart` skill documents `auto` / `local` / `global` and never `none`. |
| `independentYAxis` on Sparkline | **Handled in this bump.** Added an explicit "Not for Sparkline" note next to the cross-cutting `independentYAxis` property in `flint-chart` SKILL.md § Cross-cutting properties. Rows now always self-scale on Sparkline; the property still applies to other faceted charts. |

**Files updated in this bump:**

- `.vscode/mcp.json`, `manifest.json`, `scripts/verify-install.mjs`
  (`FALLBACK_PACKAGE`)
- `.github/copilot-instructions.md`
- `.github/skills/flint-chart/SKILL.md` — pin literal in the mcp.json example,
  the pin-rationale prose, the Sparkline `independentYAxis` exclusion, the
  upstream-recommender re-test trigger in the _Would Revise If_ section, and
  a restructured §0.5 (When to fetch a deep reference) that now covers four
  reference layers ordered by cost:
  - Chart selection — _The Defensible Decision_ gallery (unchanged)
  - Chart capability, runtime — `list_chart_types` MCP tool +
    `flint://chart-types` MCP resource (new; matches the pinned server
    version, no fetch); includes a note on 0.3.0's recommendation and
    transformation APIs, which are library-side and surface only through the
    `create_chart_view` MCP App UI (no distinct MCP tool yet)
  - Chart capability, gallery — canonical Flint gallery site (unchanged)
  - Chart capability, deep reference — upstream `docs/reference-vegalite.md`,
    `docs/reference-echarts.md`, `docs/reference-chartjs.md`,
    `docs/design-semantics.md` (70+ semantic types),
    `docs/api-reference.md`, `docs/overview.md`, `docs/README.md`, all
    pinned to the `0.3.0` tag (new)
- `README.md` — three `mcp.json` fragment examples, the global-install command,
  the "last verified" date, and the "Pinned version" rationale paragraph
- `demos/README.md` — pin reference in the intro paragraph

**Still parked:** verifying `flint-chart-mcp@0.4.0` from an off-corpnet machine.
Public npm `latest` is 0.4.0 but the corporate mirror still stops at 0.3.0.
Caret on `^0.3.0` means `>=0.3.0 <0.4.0`, so the 0.4.0 verification remains its
own workstream — see `HANDOFF.md`.

**Follow-up not done in this bump** (per `HANDOFF.md` follow-up work list):

- Item 2 (widen backend list from three to five) does not apply — 0.3.0 keeps
  the three-backend surface. `list_chart_types` still returns Vega-Lite,
  ECharts, and Chart.js. Widening is a 0.4.0-era task if it happens.
- Item 3 (chart-type count widening) — same status; 0.3.0 keeps the 34
  Vega-Lite chart-type count the README quotes.
- Item 4 (§0 Chart Selection re-evaluation against 0.3.0's backend-neutral
  recommender) is now due; the `flint-chart` SKILL.md _Would Revise If_ trigger
  was updated to acknowledge it. Not done in this bump because it is a
  substantial refactor, not a pin move.

### Decided — hold the pin at `^0.2.2` (2026-07-25 — SUPERSEDED 2026-07-29)

**Superseded** by the 0.3.0 bump above once the mirror caught up. Retained
verbatim below as the historical record of why the pin held for the month
between 2026-06-29 and 2026-07-26, and what conditions would move it.

**The pin stays at `^0.2.2`, deliberately.** Caret on a `0.x` version means
`>=0.2.2 <0.3.0`, so this is a real restriction, not a floor: 0.3.x and 0.4.x
are never picked up automatically.

Rationale: `flint-chart-mcp` 0.4.0 is a genuine production release on public npm
(2026-07-24, signed build provenance; the GitHub release is neither draft nor
prerelease, `main` and the `0.4.0` tag agree, and `dev` is *behind* `main`) —
but it is unreachable from Microsoft corporate machines. `npm` there resolves
through `packagefeedproxy.microsoft.io/npm/`, which stops at 0.2.2 and returns
`ETARGET` for 0.4.0 even on a direct install and even with `--prefer-online`;
direct `registry.npmjs.org` access is blocked by corporate web policy, which is
deliberately **not** bypassed.

Since most heirs of this plugin are corpnet repos, bumping to a plain `^0.4.0`
would break more adopters than it would help. `^0.2.2` installs cleanly on both
public npm and the corporate mirror, and is the only version this plugin's
content has been verified against.

> Cautionary note: an earlier draft of this entry claimed 0.4.0 was "not on npm",
> based on `npm view` output. That was the corporate mirror's stale view reported
> as global truth. `npm view` reflects whatever registry is configured — run
> `npm config get registry` before treating its answer as authoritative.

**What would change the decision**, in order of preference:

1. **The mirror syncs 0.4.0.** Then a plain `^0.4.0` works everywhere and none
   of the complication below applies. The sanctioned request is drafted in
   [`HANDOFF.md`](HANDOFF.md).
2. **0.4.0 is verified a strict superset**, from a machine on public npm:
   `node scripts/verify-install.mjs --catalog --compat` must report 0.4.x, all
   five tools, and every documented spec pattern `valid`. If so, ship the dual
   range `flint-chart-mcp@^0.2.2||^0.4.0` — tested to resolve 0.2.2 on the
   mirror and 0.4.0 on public npm, so one config serves both. If any pattern
   fails, stay here.

The branch `bump/mcp-0.4.0` carries the `^0.4.0` pin and is parked, not
abandoned; [`HANDOFF.md`](HANDOFF.md) has the full procedure.

**Compatibility measured on 0.2.2 (2026-07-25)** via
`scripts/verify-install.mjs --compat` — all six documented spec patterns valid,
including all three 0.3.0 migration items (`dodge` without `none`, donut via Pie
`innerRadius`, Sparkline without `independentYAxis`). 0.3.0 *does* carry
breaking changes; the finding is that none touch what this plugin documents.
That was asserted twice before it was measured, which is why the check now
exists.

**If the dual range is ever adopted**, two consequences apply. The docs must
stop asserting "34 Vega-Lite chart types" and "three backends" as fact — those
become runtime discovery via `list_chart_types`, since they would be wrong for
half the installs. And the `flint-chart` skill needs an explicit Sparkline
exclusion on `independentYAxis`, which 0.3.0 removed for Sparkline while keeping
it for other faceted charts.

## [0.5.1] — 2026-07-25

Closes an upstream wiring gap and sharpens what the Big Idea step actually asks.

### Fixed

- **`flint-chart` §0.1 now hands off to `chart-big-idea` explicitly.** The skill
  had a downstream handoff (to `render-verify`, added in 0.4.0) but never an
  upstream one. Via `/render-chart` the Brief was produced by the prompt's Step
  1; but when a user asked for a chart **ambiently** — "chart this data", with
  no slash command — the host loaded `flint-chart` alone and §0.1 fell back to
  three inline questions. No context read, no intent check, no elicitation
  ladder, no TRADITIONAL/INNOVATIVE ask. The inline version is kept as the
  fallback for installs that do not carry `chart-big-idea`.

### Added

- **An intent check at the head of `chart-big-idea` Step 1.** The Big Idea asks
  *what the data shows*; this asks **what the artifact is actually for**, before
  any claim is drafted:
  - *Should this exist at all?* If no argument surfaced and the data holds no
    surprise, offer the cheaper alternative — a sentence, a table, or nothing.
    A competent chart nobody needed is a failure that looks like success.
  - *Is the stated purpose the real one?* "Show that X worked" is a decision
    already made looking for a picture to ratify it. Legitimate to build, but it
    belongs in the Brief as Persuasive, not dressed as neutral reporting.
  - **If the intended message and the data disagree, surface it before drafting
    the Big Idea.** This is the one point in the workflow where the right answer
    may be *"not this chart"* — every later step assumes the chart should exist.
- **Scope note** on `chart-big-idea`: Steps 0, 1, and 3 apply to any
  communication artifact — a slide, a memo, a diagram, a report section. Steps
  2, 4, and 5 are chart machinery, which is why the skill stays chart-named.
- Two anti-patterns (accepting the stated purpose without testing it; framing a
  chart that should not exist) and two falsifiers, including: if users routinely
  invoke this skill for non-chart artifacts and skip Steps 2/4/5, the general
  half has outgrown the chart half and should be split into its own skill.

### Notes

The skill was **not** renamed, unlike `chart-verify` → `render-verify` in 0.5.0.
The cases differ: there, the method was general and only the catalog was
chart-specific, so widening cost one extra table. Here Steps 2, 4, and 5 are the
spine — story arcs map to chart families, the style-stance crosstab names
concrete `chartType` values, and the Brief hands off to `flint-chart` §0.2.
A general name over that machinery would overpromise. The falsifier above turns
that judgment into something testable rather than a preference.

## [0.5.0] — 2026-07-25

Renames the verification skill and widens it to match. Shipped same-day as
0.4.0, before the Alex Mall vendored it, so no adopter ever saw the old name.

### Changed

- **`chart-verify` → `render-verify`.** The old name implied the skill only
  worked on charts. It never did: the method — open the artifact, read its
  console errors *first*, walk a failure catalog, then check the picture against
  the claim it was meant to carry — applies to any rendered output. Folder,
  frontmatter `name`, and all references moved together; `name` must match the
  parent directory or the skill silently fails to load.
- **Skill framing widened** from "a chart" to "a rendered visual artifact",
  covering generated HTML reports, SVG figures, dashboards, diagrams, and
  printable output. Charts remain the deepest-worked case.
- **Step 3 and Step 4 generalized.** Step 4 previously assumed the Big Idea from
  `chart-big-idea`; it now covers whatever claim the artifact carries, since a
  report or diagram has one too. "A correct render of a wrong claim is still a
  defect" holds either way.
- `manifest.json` 0.4.0 → 0.5.0. Renaming a shipped asset is a breaking change
  to the install contract even when nothing has consumed it yet.

### Added

- **A second failure catalog — any rendered artifact.** Eight rows for defects
  that are invisible in a screenshot but named in the console or found by
  looking properly: missing resource (404'd image, stylesheet, font, script),
  unstyled content, clipped or overflowing text, font substitution, layout
  collapse at the captured viewport, below-the-fold content never captured,
  stale render, and surviving placeholders (`TODO`, `{{value}}`, `undefined`,
  `NaN`).
- **Anti-pattern: screenshotting without reading the console.** The console
  names the cause; the picture only shows the symptom.
- **Falsifier for the rename itself** — if the general catalog goes unused
  across several sessions, the skill is chart-only in practice and the broader
  name overpromises. Narrow it back or delete the general table.

## [0.4.0] — 2026-07-25

Closes the verification loop. Until now the plugin could render a chart and had
no way to check that the chart said what it was supposed to say — a spec with a
collapsed scale, a merged color scale, or an empty data binding renders as a
perfectly valid image telling the wrong story, and `validate_chart` cannot catch
that. The `flint-chart` skill also *opened* this hole deliberately: it forbids
sending a post-Flint Vega-Lite edit back to `render_chart`, then instructed the
agent to "render the edited spec in the host environment with a Vega-Lite
renderer" that the plugin never shipped.

### Added

- **`chart-verify` skill** (third skill). Carries the load-bearing content: a
  nine-row **failure catalog** of defects that render without error (empty
  binding, collapsed scale, merged color scale, undefined category, duplicate
  marks, embedded totals, double-scaled units, overplotting, right-on-sample),
  a host-capability table, a console-errors-before-picture ordering, and a step
  that checks the render against the Big Idea rather than only against the spec.
- **Optional `playwright` MCP server** in [`.vscode/mcp.json`](.vscode/mcp.json),
  pinned exactly at `@playwright/mcp@0.0.78` with `--headless --isolated
  --browser msedge --allow-unrestricted-file-access`. **GitHub Copilot CLI is
  the main audience** — it is a terminal agent with no browser, so this is its
  only route to verifying a render. VS Code heirs should omit the entry.
- **`/render-chart` Step 8 — Verify**, mandatory after any post-Flint Vega-Lite
  edit and before committing generated HTML/SVG/PNG. Step 9 now reports whether
  verification happened, or that it could not.
- **`.playwright-mcp/` in `.gitignore`.** The server writes accessibility
  snapshots and screenshots into its launch cwd — found by having it happen.

### Changed

- `manifest.json` — `assets.mcp` restructured from a single server object to a
  `servers` array with per-server `required` flags. Version 0.3.2 → 0.4.0,
  shape now `three-skill + one-prompt + two-mcp-sidecars + vscode-settings`.
- `flint-chart` skill — a "Look at what you rendered" bullet in *What you
  produce*, and a mandatory-verification note closing the *Post-Flint style
  customization* section.

### Notes — measured, not assumed

Every claim below was measured against `@playwright/mcp@0.0.78` on 2026-07-25 by
stdio handshake plus live tool calls against
[`demos/heart-with-axes/report.html`](demos/heart-with-axes/report.html). Two
prior assumptions were falsified in the process:

- **There is no bundled browser, and no download.** Playwright drives an
  *installed* browser by channel; `--browser msedge` launched in 0.7 s. The
  earlier "~150 MB prerequisite" framing was wrong. The shipped config selects
  `msedge` deliberately: the upstream default is Google Chrome, which is
  frequently absent on the corpnet Windows machines most heirs run, while Edge
  ships with the OS. Linux heirs override the channel.
- **`file://` navigation is blocked by default** — `Access to "file:" protocol
  is blocked` — hence the `--allow-unrestricted-file-access` flag. This is the
  plugin's characteristic silent-config failure shape in a new place.
- **The MCP handshake reports the underlying Playwright *library* version**
  (e.g. `1.62.0-alpha-…`), not the package version. Do not pin against it.
- **VS Code's built-in browser tools satisfy the whole capability** with no
  flags, no download, and no config — verified on the same demo. This is why the
  server is optional and why `chart-verify` names a capability rather than a
  product. **Heirs on VS Code should omit the `playwright` entry.**

### Security

`--allow-unrestricted-file-access` grants the browser read access to any file the
user can read. That is a reasonable trade for verifying local artifacts the agent
just produced, and it is no broader than what VS Code's own internal browser
already does. It is **not** safe in combination with browsing untrusted web
pages. The README and the skill both carry this warning, and the skill explicitly
rules out `browser_run_code_unsafe` for verification work — screenshots and
console access are sufficient to look at a chart.

## [0.3.2] — 2026-07-25

Acts on four review findings from an adopting workspace that installed 0.3.1 via
GitHub Copilot CLI. All four were reproduced before being acted on.

### Added

- **`scripts/verify-install.mjs`** — an executable version of check 1 in the
  README's verification ladder. Reads the pin from
  [`.vscode/mcp.json`](.vscode/mcp.json) so it verifies the version the workspace
  actually requests rather than a hardcoded copy of it, handshakes with
  `flint-chart-mcp` over stdio, and asserts all five tools are advertised; exit 0
  means the server half is healthy and the fault is client-side. Zero
  dependencies, host-independent, CI-runnable. Rationale: check 1 previously read
  "ask the agent to probe over stdio", which is the one step that must not depend
  on the agent — the agent may be what's broken. Note that Mall installs do not
  include `scripts/`; the README gives the manual probe as the fallback.
- **GitHub Copilot CLI added to every host table** (README, `flint-chart` skill,
  [`manifest.json`](manifest.json)). Its config lives at
  `~/.copilot/mcp-config.json` (overridable via `$COPILOT_HOME`) and its
  top-level key is **`mcpServers`**, not `servers`. This fails harder than the
  bug 0.3.1 fixed: wrong path _and_ wrong schema, still with no error. Verified
  against a live CLI config and the GitHub docs. Users are pointed at the CLI's
  own `/mcp add` rather than hand-editing JSON.
- **A PowerShell variant of the manual install block.** The install steps were
  bash-only (`mkdir -p`, `cp -r`, `/tmp/`), which is a translation step for the
  Windows-heavy Alex ACT Edition audience.

### Fixed

- **"copy as-is" replaced with merge guidance for the MCP config.** The README
  told VS Code users to copy [`.vscode/mcp.json`](.vscode/mcp.json) as-is; an
  adopter with an existing file would silently lose their other servers. The
  `settings.json` asset already carried an additive-merge caution — the MCP
  asset now does too, in the README, the skill body, and a new `merge` field in
  [`manifest.json`](manifest.json).

## [0.3.1] — 2026-07-25

Bug-fix release. The MCP install path this plugin documented was wrong for
VS Code, which silently produced "the tools never appear" with no error.

### Fixed

- **Corrected the MCP config path for VS Code.** The plugin told heirs to merge
  [`mcp.json`](.vscode/mcp.json) into a **workspace-root `.mcp.json`** — the Claude Code
  convention. VS Code reads **`.vscode/mcp.json`**. The `servers` schema is
  identical in both, so the wrong path looks correct, and VS Code surfaces no
  error because it is not parsing a broken file — it is reading no file at all.
  Fixed in [`README.md`](README.md), the `flint-chart` skill body, and
  [`manifest.json`](manifest.json)'s `merge_target`, now with a per-host path
  table (VS Code / Claude Code / Cursor).

### Added

- **`"type": "stdio"` declared explicitly** in [`mcp.json`](.vscode/mcp.json) and in the
  skill's sample config. Optional in some hosts, but omitting it makes
  transport-related failures harder to diagnose.
- **Post-install triage ladder** in both the README and the `flint-chart` skill:
  isolate server-vs-client by probing the server over stdio directly, then check
  the **MCP: List Servers → Start** trust prompt, then **Show Output** for
  startup crashes, then restart the chat session (a window reload does not
  always refresh the agent's tool inventory). Notes that HTTP-transport servers
  additionally require OAuth authorization, which is separate from trust.
- **Documented the `local/` discovery-root registration.** VS Code discovers
  skills in `.github/skills/` and prompts in `.github/prompts/` but does not
  search their subfolders, so the plugin's `local/` install paths load nothing
  on a plain VS Code workspace — silently, same failure mode as the MCP path.
  [`README.md`](README.md) now documents the additive `chat.agentSkillsLocations`
  and `chat.promptFilesLocations` entries (Alex ACT Edition heirs already have
  these registered).
- **`.vscode/` is now tracked** rather than gitignored.
  [`.vscode/mcp.json`](.vscode/mcp.json) and
  [`.vscode/settings.json`](.vscode/settings.json) make this repo dogfood its own
  install wiring, so a path regression breaks here before it reaches adopters.
- **A "Verify your install" section** in [`README.md`](README.md) — four ordered
  checks (server probe → client tools → skills/prompt → render), each isolating a
  different half of the system so the first failure localises the fault.

### Verified

- **End-to-end on 2026-07-25**, VS Code against `flint-chart-mcp` 0.2.2 (MCP
  protocol `2024-11-05`): server healthy over stdio with all 5 tools; both skills
  loaded from `.github/skills/local/`; `list_chart_types` returned 34 Vega-Lite
  chart types; `validate_chart` clean; `render_chart` produced SVG;
  `create_chart_view` opened an interactive panel.
- **Not covered:** the run could not distinguish the `local/` skill copies from
  the source copies at `.github/skills/`, since this repo carries both and they
  are identical. A `local/`-only adopter install is inferred, not demonstrated.

### Removed

- **Root `mcp.json` deleted.** The MCP fragment now ships from
  [`.vscode/mcp.json`](.vscode/mcp.json) — the location it is actually installed
  to — rather than a root copy no host reads. Content was byte-identical, so no
  payload change. References repointed in [`manifest.json`](manifest.json)
  (`path` plus a new `install_to`), [`README.md`](README.md), `LICENSE`,
  [`docs/README.md`](docs/README.md),
  [`docs/publishing-to-mall.md`](docs/publishing-to-mall.md), and
  [`.github/copilot-instructions.md`](.github/copilot-instructions.md). The Mall
  still vendors the fragment flat as `mcp.json`; only the upstream source path
  changed.

## [0.3.0] — 2026-07-24

Maintenance release. No shipping-payload behavior change, but the Node
prerequisite bump is user-visible for anyone installing on Node 18 or 20,
which justifies a minor bump.

### Changed

- **Node prerequisite raised from ≥ 18 to ≥ 22.** Reflected in
  [`manifest.json`](manifest.json) and [`README.md`](README.md). Rationale:
  Node 18 reached end-of-life on 2025-04-30 and Node 20 enters maintenance-only
  in April 2026; pinning to ≥ 22 (current active LTS) keeps `npx flint-chart-mcp`
  on a supported runtime for the plugin's usable life.
- **`flint-chart` skill gained a `Would Revise If` section** codifying the five
  falsifier conditions (Defensible Decision URL churn, `flint-chart-mcp`
  breaking change, §0.2 recommendation refuted, §0.5 not exercised, upstream
  fork base revised). Aligns the skill with the plugin-wide convention that all
  installable files carry a falsifier.

### Removed

- **Two of three demo reports** (`demos/heart-chart/`, `demos/love-axes/`)
  removed to keep the demo surface focused. `demos/heart-with-axes/` — the
  fusion demo referenced from the top-level README — remains. Narrative in
  `demos/README.md`, `heart-with-axes/README.md`, and `heart-with-axes/report.html`
  updated to reflect the single-demo shape.

### Added

- **`.markdownlint.json`** — scoped config disabling MD013 (long semantic
  lines are intentional) and allowing MD033 for `p`/`img`/`br`/`sub`/`sup`
  (the standard README centered-image escape hatch). Makes markdownlint
  behavior consistent across contributors regardless of their VS Code defaults.

### Notes

- `flint-chart-mcp` version pin unchanged (`^0.2.2`). Bump to `^0.3.0` when
  the upstream 0.3.0 git tag publishes to npm.
- Plan doc [`docs/plans/2026-07-24-mall-plugin.md`](docs/plans/2026-07-24-mall-plugin.md)
  now carries an Amendments header pointing to this changelog for current state.

## [0.2.0] — 2026-07-24

Initial public release. Spun out of dogfood work in `microsoft/flint-chart`
(non-shipping `.plans/` folder) into its own repo for open-source distribution.

### Added

- `chart-big-idea` skill — framing preflight (Big Idea in one sentence,
  story arc, audience, TRADITIONAL vs INNOVATIVE style stance, Chart Brief
  output). Reads surrounding docs/prose/ticket for an existing Big Idea
  first; 3-question elicitation ladder when none is found.
- `flint-chart` skill — selection + spec-authoring. §0 chart-selection
  framework prepended to the upstream `agent-skills/flint-chart-author`
  body. §0.1 one-sentence message, §0.2 question→family→chartType table,
  §0.3 anti-patterns, §0.4 Flint coverage substitutions, §0.5 deep-reference
  fetch rules, §0.6 design principles. Then original Steps 1-N for
  `ChartAssemblyInput` authoring.
- `/render-chart` prompt — 8-step verb-prompt workflow entry point.
  Loads `chart-big-idea` → produces Brief → loads `flint-chart` → selection
  constrained by Brief → authors input → renders via MCP.
- `mcp.json` — plugin-level MCP sidecar for the upstream `flint-chart-mcp`
  npm package (stdio transport, `npx -y flint-chart-mcp@^0.2.2`).
- `manifest.json` — plugin manifest enumerating all shipping assets,
  install paths, prerequisites, and upstream references.
- MIT dual-copyright LICENSE preserving Microsoft's attribution on the
  forked `flint-chart` skill body.

### Notes

- Pinned to `flint-chart-mcp@^0.2.2` (latest published to npm as of
  release). Git tag `0.3.0` exists upstream but is not on npm yet; bump
  the version constraint once it publishes.
- No breaking changes possible — this is the first published version.
