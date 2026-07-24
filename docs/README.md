# Docs

Long-form documentation about the plugin's design, decisions, and open questions. Not part of the shipping install-payload; here for context, audit, and future maintenance.

## Contents

- [`plans/`](plans/) — decision documents that captured the plugin's genesis, including locked-decisions tables and post-hoc amendments
  - [`2026-07-24-mall-plugin.md`](plans/2026-07-24-mall-plugin.md) — original plan (9 tasks, 7 locked decisions D1–D7, 5 sub-decisions S1–S5) + amendment covering the two-skill + prompt + MCP-sidecar reshape

## Companion sources not in this repo

Some materials that informed the plugin live outside this repo and are not vendored:

- **`chart-big-idea` skill body** — Cole Nussbaumer Knaflic's _Storytelling with Data_ (2015, Wiley) for the Big Idea framework; Andy Kirk, Stephen Few, Wexler/Shaffer/Cotgreave for chart-selection principles. See the skill's own Attribution block in [`.github/skills/chart-big-idea/SKILL.md`](../.github/skills/chart-big-idea/SKILL.md) and the top-level README's [Attribution](../README.md#attribution) section.
- **`flint-chart` skill body** — forked from [`microsoft/flint-chart/agent-skills/flint-chart-author/SKILL.md`](https://github.com/microsoft/flint-chart/blob/main/agent-skills/flint-chart-author/SKILL.md) (MIT). The plugin prepends a `§0 Chart Selection` framework distilled from _The Defensible Decision_ chart gallery. See the top-level [Attribution](../README.md#attribution).
- **`flint-chart-mcp` server** — [Microsoft Corporation on npm](https://www.npmjs.com/package/flint-chart-mcp) (MIT). Invoked via `npx` from the plugin's [`mcp.json`](../mcp.json).

## Governance

- **License** — MIT dual-copyright (Fabio Correa + Microsoft Corporation). See [`LICENSE`](../LICENSE).
- **Versioning** — SemVer 2.0. Current version tracked in [`manifest.json`](../manifest.json) and [`CHANGELOG.md`](../CHANGELOG.md).
- **Falsifiability** — Each skill and prompt carries a `lastReviewed` frontmatter date and a _Would Revise If_ section naming specific conditions that would trigger a review. See the individual `.md` files in [`.github/skills/`](../.github/skills/) and [`.github/prompts/`](../.github/prompts/).
