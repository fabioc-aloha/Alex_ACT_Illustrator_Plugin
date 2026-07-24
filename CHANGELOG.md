# Changelog

All notable changes to this plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
