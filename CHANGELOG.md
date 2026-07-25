# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
