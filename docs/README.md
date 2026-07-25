# Docs

Long-form documentation about the plugin's design, decisions, and open questions. Not part of the shipping install-payload; here for context, audit, and future maintenance.

## Contents

- **[`publishing-to-mall.md`](publishing-to-mall.md)** — step-by-step runbook for vendoring this plugin (or a new version of it) into the [Alex ACT Plugin Mall](https://github.com/fabioc-aloha/Alex_Skill_Mall). Read this before running a publish.
- [`plans/`](plans/) — decision documents that captured the plugin's genesis, including locked-decisions tables and post-hoc amendments
  - [`2026-07-24-mall-plugin.md`](plans/2026-07-24-mall-plugin.md) — original plan (9 tasks, 7 locked decisions D1–D7, 5 sub-decisions S1–S5) + amendment covering the two-skill + prompt + MCP-sidecar reshape

## Companion sources not in this repo

Some materials that informed the plugin live outside this repo and are not vendored:

- **`chart-big-idea` skill body** — Cole Nussbaumer Knaflic's _Storytelling with Data_ (2015, Wiley) for the Big Idea framework; Andy Kirk, Stephen Few, Wexler/Shaffer/Cotgreave for chart-selection principles. See the skill's own Attribution block in [`.github/skills/chart-big-idea/SKILL.md`](../.github/skills/chart-big-idea/SKILL.md) and the top-level README's [Attribution](../README.md#attribution) section.
- **`flint-chart` skill body** — forked from [`microsoft/flint-chart/agent-skills/flint-chart-author/SKILL.md`](https://github.com/microsoft/flint-chart/blob/main/agent-skills/flint-chart-author/SKILL.md) (MIT). The plugin prepends a `§0 Chart Selection` framework distilled from _The Defensible Decision_ chart gallery. See the top-level [Attribution](../README.md#attribution).
- **`flint-chart-mcp` server** — [Microsoft Corporation on npm](https://www.npmjs.com/package/flint-chart-mcp) (MIT). Invoked via `npx` from the plugin's [`.vscode/mcp.json`](../.vscode/mcp.json).

## Known failure modes

This plugin has one characteristic bug shape: **a config file in the wrong place
does nothing, and says nothing.** Both instances found so far produce no error,
no warning, and no log line — the host isn't parsing a broken file, it's reading
no file at all. Check the path before debugging anything else.

| Symptom                                 | Cause                                                                    | Fix                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `flint` MCP tools never appear          | Config placed at workspace-root `.mcp.json` — the Claude Code convention | Move to `.vscode/mcp.json`. Identical `servers` schema, which is why the wrong path deceives |
| Skills and `/render-chart` never appear | Installed under `local/`, which VS Code does not search                  | Register `chat.agentSkillsLocations` / `chat.promptFilesLocations` (keep them additive)      |
| A skill silently fails to load          | Frontmatter `name` doesn't match its parent directory name               | Rename one to match the other                                                                |

Both path bugs shipped in v0.3.0 and were corrected in v0.3.1. The plan that
specified the wrong paths, [`plans/2026-07-24-mall-plugin.md`](plans/2026-07-24-mall-plugin.md),
is deliberately left uncorrected so the decision trail survives.

## Governance

- **License** — MIT dual-copyright (Fabio Correa + Microsoft Corporation). See [`LICENSE`](../LICENSE).
- **Versioning** — SemVer 2.0. Current version tracked in [`manifest.json`](../manifest.json) and [`CHANGELOG.md`](../CHANGELOG.md).
- **Falsifiability** — Each skill and prompt carries a `lastReviewed` frontmatter date and a _Would Revise If_ section naming specific conditions that would trigger a review. See the individual `.md` files in [`.github/skills/`](../.github/skills/) and [`.github/prompts/`](../.github/prompts/).
