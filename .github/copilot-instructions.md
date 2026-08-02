# Copilot instructions — `Alex_ACT_Illustrator_Plugin`

Context for AI agents (and humans) working in this repo. Loaded automatically by GitHub Copilot Chat when the repo is open.

This repo is _not_ an Alex ACT heir workspace — it ships an [Alex ACT constellation](https://github.com/fabioc-aloha/Alex_ACT_Steward) plugin, maintained by [Alex_ACT_Steward](https://github.com/fabioc-aloha/Alex_ACT_Steward). The full cognitive framework (ACT tenets, epistemic calibration, session-health monitoring, memory triggers) is _not_ loaded here. This file gives agents the essentials for working on the plugin itself.

> **Renamed 2026-07-29** from `flint-chart-plugin`. Charting is now the first workload in a broader visual-authoring bundle. The current ID is `alex-act-illustrator-plugin@alex-mall`; legacy `flint-chart-plugin@alex-mall` installations do not migrate automatically. See the [Steward Illustrator Plan](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/illustrator/plan.md).

## What this repo is

An Alex ACT constellation plugin for visual authoring. Ships **five visual-authoring areas**: Flint (statistical chart authoring), Print figures (hand-authored print-quality SVG for books / reports), Replicate (AI image generation), Shell (browsable / gallery / catalog surface), and Banner (deterministic SVG brand assets). Currently:

- **Ten skills** — `chart-big-idea`, `chart-vocabulary`, `flint-chart`, `render-verify`, `print-svg-style-guide`, `figure-generator`, `replicate-imagery`, `docs-shell`, `svg-banner`, and `install-visual-companions`
- **Three slash-command prompts** — `/alex-act-illustrator-plugin render-chart`, `/alex-act-illustrator-plugin banner`, and `/alex-act-illustrator-plugin install-visual-companions`
- **Three MCP sidecars** in `.vscode/mcp.json` — exact `flint-chart-mcp@0.3.0` (required), exact `replicate-mcp@0.9.0` (optional; needs `REPLICATE_API_TOKEN`), and exact `@playwright/mcp@0.0.78` (optional browser sidecar). Every invocation is cache-first (`--prefer-offline`) and resolves only through npm's configured registry; never probe or override the public registry.

This repo is the **source of truth**. The [Alex ACT Plugin Mall](https://github.com/fabioc-aloha/Alex_Skill_Mall) vendors released tags at `plugins/data-analytics/alex-act-illustrator-plugin/`.

## Repo layout

| Path                                     | Purpose                                                                     |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `.github/skills/chart-big-idea/`         | Installable skill (framing, shared across features)                         |
| `.github/skills/chart-vocabulary/`       | Installable skill (chart selection catalog, Flint feature)                  |
| `.github/skills/flint-chart/`            | Installable skill (chart family router + spec authoring, Flint feature)     |
| `.github/skills/render-verify/`          | Installable skill (verification, shared across features)                    |
| `.github/skills/print-svg-style-guide/`  | Installable skill (print SVG grammar, Print figures feature)                |
| `.github/skills/figure-generator/`       | Installable skill (deterministic figure production, Print figures feature)  |
| `.github/skills/replicate-imagery/`      | Installable skill (AI image routing, Replicate feature)                     |
| `.github/skills/docs-shell/`             | Installable skill (single-page HTML shell, Shell feature) + `starter/` kit  |
| `.github/skills/svg-banner/`             | Installable skill (deterministic SVG banners, Banner feature)               |
| `.github/skills/install-visual-companions/` | Installable skill (consent-gated companion-plugin composition)           |
| `.github/prompts/`                       | Three installable namespaced prompts                                        |
| `.vscode/mcp.json`                       | MCP server sidecars — `flint` (required), `replicate` + `playwright` (optional) |
| `.vscode/settings.json`                  | Registers the `local/` skill + prompt discovery roots                       |
| `manifest.json`                          | Plugin manifest — enumerates all shipping assets                            |
| `scripts/`                               | Repo tooling (`verify-install.mjs`, `check-language.mjs`) — **not** payload |
| `assets/`                                | README-only images (**NOT** part of the installable payload)                |
| `demos/`                                 | Self-contained demo report (heart-with-axes)                                |
| `docs/`                                  | Long-form design docs, plans, publishing runbook                            |
| `LICENSE`, `README.md`, `CHANGELOG.md`   | Standard repo files                                                         |

## Conventions

### Commit messages

Use severity-tagged prefixes for material changes (adapted from Alex ACT Edition's `severity-tagged-commits.instructions.md`):

| Tag                | When to use                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `[typo]`           | Spelling, broken link, dead reference, single-character render fix |
| `[clarification]`  | Prose rewording, no behavior change; user-visible text tweak       |
| `[behaviour]`      | Functional change — skill content, manifest, MCP config, new asset |
| `[constitutional]` | LICENSE, plugin architecture, contract with the Mall or with heirs |

Conventional prefixes (`docs:`, `refactor:`, `feat:`, `fix:`) are also acceptable for narrow-scope changes that don't warrant a severity tag.

### Language — US English

**All prose in this repo is US English**: skill bodies, prompts, README, CHANGELOG, docs, manifest strings, code comments, and commit-message prose. Do not drift into British spellings.

Common offenders, with the form this repo uses:

| Write this    | Not this            |
| ------------- | ------------------- |
| color         | colour              |
| catalog       | catalogue           |
| behavior      | behaviour           |
| gray          | grey                |
| labeled       | labelled            |
| artifact      | artefact            |
| recognize     | recognise           |
| analyze       | analyse             |
| center        | centre              |
| license       | licence (as a noun) |
| -ize/-ization | -ise/-isation       |

**One deliberate exception: the `[behaviour]` commit tag keeps its British spelling.** It is an identifier, not prose. Every commit in this repo's history uses it, and the Alex ACT Plugin Mall emits `[behaviour] catalog refresh` commits from its own cron — so changing it would split this repo's history _and_ break alignment with the ecosystem it publishes into. Note the Mall's own string mixes the two (`[behaviour]` + `catalog`), which is the tell that the tag is treated as an opaque token. Changing it would be a `[constitutional]` decision, not a typo fix.

Sweep before committing prose-heavy changes:

```pwsh
node scripts/check-language.mjs        # payload only
node scripts/check-language.mjs --all  # include gitignored local/ copies
```

Exit 0 = clean; exit 1 lists `file:line  found → want`. The checker encodes three
deliberate exceptions: the `[behaviour]` tag, this section (which must spell out
the forms we avoid), and the checker's own dictionary.

> Do not replace it with a `**` glob in `Select-String -Path`. PowerShell's
> `-Path` does not expand `**` recursively — `.github/**/*.md` matches exactly
> one directory level, so it silently skips every `.github/skills/*/SKILL.md`
> and returns a clean-looking zero. Verified 2026-07-25: the glob form found
> 1 of 7 known occurrences. When any sweep reports zero, confirm with a positive
> control before believing it.

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

Short version: vendor the released source tag into `Alex_ACT_Plugin_Mall/plugins/data-analytics/alex-act-illustrator-plugin/` through the Mall-owned packaging workflow, validate the generated catalog and marketplace, append the Steward curation record, commit with a severity tag, and push.

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

| Resource                        | URL                                                                |
| ------------------------------- | ------------------------------------------------------------------ |
| Alex ACT Steward (lineage host) | <https://github.com/fabioc-aloha/Alex_ACT_Steward>                 |
| Alex ACT Edition (v4.1.0 compat) | <https://github.com/fabioc-aloha/Alex_ACT_Edition>                |
| Alex ACT Plugin Mall (distro)   | <https://github.com/fabioc-aloha/Alex_Skill_Mall>                  |
| Upstream flint-chart            | <https://github.com/microsoft/flint-chart>                         |
| flint-chart-mcp on npm          | <https://www.npmjs.com/package/flint-chart-mcp>                    |
| Canonical Flint chart gallery | <https://microsoft.github.io/flint-chart/#/gallery/vegalite>       |
| The Defensible Decision       | <https://www.thedefensibledecision.com/gallery/chart-gallery.html> |
