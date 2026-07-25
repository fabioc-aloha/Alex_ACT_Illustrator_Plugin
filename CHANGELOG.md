# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Decided — hold the pin at `^0.2.2`

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
  [`mcp.json`](mcp.json) into a **workspace-root `.mcp.json`** — the Claude Code
  convention. VS Code reads **`.vscode/mcp.json`**. The `servers` schema is
  identical in both, so the wrong path looks correct, and VS Code surfaces no
  error because it is not parsing a broken file — it is reading no file at all.
  Fixed in [`README.md`](README.md), the `flint-chart` skill body, and
  [`manifest.json`](manifest.json)'s `merge_target`, now with a per-host path
  table (VS Code / Claude Code / Cursor).

### Added

- **`"type": "stdio"` declared explicitly** in [`mcp.json`](mcp.json) and in the
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
