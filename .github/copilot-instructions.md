# Copilot instructions — `flint-chart-plugin`

Context for AI agents (and humans) working in this repo. Loaded automatically by GitHub Copilot Chat when the repo is open.

This repo is _not_ an [Alex — ACT Edition](https://github.com/fabioc-aloha/Alex_ACT_Edition) heir workspace — it ships one of the Edition's plugins. Alex ACT Edition's full cognitive framework (ACT tenets, epistemic calibration, session-health monitoring, memory triggers) is _not_ loaded here. This file gives agents the essentials.

## What this repo is

An Alex ACT Edition plugin for chart selection and rendering:

- **Two skills** — `chart-big-idea` (framing preflight — Big Idea, story arc, audience, TRADITIONAL vs INNOVATIVE stance) and `flint-chart` (selection + spec authoring against the [microsoft/flint-chart](https://github.com/microsoft/flint-chart) MCP server)
- **One slash-command prompt** — `/render-chart` (loads both skills, drives the end-to-end workflow)
- **MCP sidecar** — `.vscode/mcp.json` that spawns `flint-chart-mcp@^0.2.2` from npm via `npx`

This repo is the **source-of-truth**. The [Alex ACT Plugin Mall](https://github.com/fabioc-aloha/Alex_Skill_Mall) vendors a specific version at `plugins/data-analytics/flint-chart-plugin/`.

## Repo layout

| Path                                   | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `.github/skills/chart-big-idea/`       | Installable skill (framing)                                  |
| `.github/skills/flint-chart/`          | Installable skill (selection + rendering)                    |
| `.github/prompts/`                     | Installable prompt (`/render-chart`)                         |
| `.vscode/mcp.json`                     | MCP server sidecar — the path VS Code actually reads         |
| `.vscode/settings.json`                | Registers the `local/` skill + prompt discovery roots        |
| `manifest.json`                        | Plugin manifest — enumerates all shipping assets             |
| `assets/`                              | README-only images (**NOT** part of the installable payload) |
| `demos/`                               | Self-contained demo report (heart-with-axes)                 |
| `docs/`                                | Long-form design docs, plans, publishing runbook             |
| `LICENSE`, `README.md`, `CHANGELOG.md` | Standard repo files                                          |

## Conventions

### Commit messages

Use severity-tagged prefixes for material changes (adapted from Alex ACT Edition's `severity-tagged-commits.instructions.md`):

| Tag                | When to use                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `[typo]`           | Spelling, broken link, dead reference, single-character render fix |
| `[clarification]`  | Prose rewording, no behaviour change; user-visible text tweak      |
| `[behaviour]`      | Functional change — skill content, manifest, MCP config, new asset |
| `[constitutional]` | LICENSE, plugin architecture, contract with the Mall or with heirs |

Conventional prefixes (`docs:`, `refactor:`, `feat:`, `fix:`) are also acceptable for narrow-scope changes that don't warrant a severity tag.

### Frontmatter

Every `SKILL.md` and `.prompt.md` carries:

- `description:` — non-empty single-line description (used by the slash-command picker and by the ACT Edition's agent-discovery)
- `lastReviewed:` — ISO date. Update when the file's content changes substantively.

Every skill also declares `name:` (matches the folder name).

### Lint discipline

Markdown files must pass markdownlint on commit. If `get_errors` reports a finding on a file you edit, fix it in the same change — even if it's a pre-existing finding. Rationale: the cheapest moment to fix lint is when the file is already open.

`.markdownlintignore` excludes `LICENSE` (not markdown despite the extension-less name) and `node_modules/`.

### Falsifiability

Each skill and prompt carries a _Would Revise If_ section naming specific conditions that trigger a review. When adding new content that codifies a rule or pattern, include a falsifier — either a specific date (`Revise by 2026-10-22 or sooner if…`) or an observable event (`Revise if …`).

## Publishing to the Alex ACT Plugin Mall

See **[`docs/publishing-to-mall.md`](../docs/publishing-to-mall.md)** for the step-by-step runbook.

Short version: vendor the current asset files into `Alex_ACT_Plugin_Mall/plugins/data-analytics/flint-chart-plugin/`, write a plugin-mall-shaped `plugin.json`, append a curation-log entry, rebase on the Mall's `main` (weekly automated catalog-refresh cron often lands during editing), commit with a severity tag, and push.

## What NOT to do

- **Do not commit Alex ACT Edition heir-local files** into this repo. If any of these appear untracked, add them to `.gitignore` — do not stage them:
  - `.github/config/` (heir cognitive-config)
  - `.github/scripts/` (heir muscle scripts)
  - `.github/agents/` (heir worker subagents)
  - `.github/instructions/` (heir instruction library)
  - `.github/copilot-instructions.local.md` (heir custom overrides)
  - `.github/VERSION` (heir Edition version)
  - `.github/.act-heir.json` (heir install manifest)
- **Do not upload to `microsoft/flint-chart`** — that's Microsoft's upstream repo. This plugin is a separate first-party project on the `fabioc-aloha` account. Attribution to Microsoft is preserved in the LICENSE and Attribution section of the README.
- **Do not push demo HTML changes without opening the report in a browser first** — inline Vega-Lite specs can fail silently if syntax is off. Always render + eyeball before committing.
- **Do not remove the two-copyright header from LICENSE** — the flint-chart skill body is forked from Microsoft (MIT), and their copyright must remain attributed even in dual-copyright form. GitHub's SPDX matcher reports the LICENSE as "Other" because of the dual-copyright preamble — that's expected, not a defect. See LICENSE and README Attribution.

## Related

| Resource                      | URL                                                                |
| ----------------------------- | ------------------------------------------------------------------ |
| Upstream flint-chart          | <https://github.com/microsoft/flint-chart>                         |
| Alex ACT Edition (host)       | <https://github.com/fabioc-aloha/Alex_ACT_Edition>                 |
| Alex ACT Plugin Mall (distro) | <https://github.com/fabioc-aloha/Alex_Skill_Mall>                  |
| flint-chart-mcp on npm        | <https://www.npmjs.com/package/flint-chart-mcp>                    |
| Canonical Flint chart gallery | <https://microsoft.github.io/flint-chart/#/gallery/vegalite>       |
| The Defensible Decision       | <https://www.thedefensibledecision.com/gallery/chart-gallery.html> |
