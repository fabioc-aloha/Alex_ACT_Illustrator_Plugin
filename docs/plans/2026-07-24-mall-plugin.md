# flint-chart Mall Plugin — Implementation Plan

> **Amendments since original plan (2026-07-24 initial release):**
>
> This document is genesis history. Current-state facts live in [`manifest.json`](../../manifest.json), [`../../README.md`](../../README.md), and [`../../CHANGELOG.md`](../../CHANGELOG.md).
>
> Several relative links below point into the **upstream `microsoft/flint-chart` workspace** where this plan was authored (`../agent-skills/`, `../.github/instructions/`, `../packages/`). They do not resolve in this repo and are **not** defects to fix — they record what the author was looking at.
>
> - **Node prerequisite bumped from ≥ 18 to ≥ 22** (see 0.3.0 changelog entry). The `Node.js ≥ 18` references in this document (Assumptions #2, section 4 of the README plan) reflect the original 0.2.0 shape, not current.
> - **Demo footprint reduced from 3 to 1.** The plan didn't originally scope demos; a `demos/` folder shipping three rhetorical-spectrum examples (`heart-chart/`, `love-axes/`, `heart-with-axes/`) was added post-hoc, then reduced to just `heart-with-axes/` as the load-bearing demo.
> - **Would Revise If added to `flint-chart` skill.** The plan's Falsifiability section already listed proposed criteria; those are now inline in the skill body as a real *Would Revise If* section.

**Goal:** Ship `flint-chart` as a Mall plugin so any Alex — ACT Edition heir can `/mall-install flint-chart` and get (a) a super-skilled chart-designer skill that helps pick the right chart for the scenario, (b) an optional slash-command entry point, and (c) an auto-configured MCP server (`flint-chart-mcp`) for rendering.

**Architecture:** Reference model, not bundle. The plugin ships ~15 KB of metadata + guidance; the MCP server is pulled from npm on demand via `npx -y flint-chart-mcp@^0.3.0`. Chart-selection knowledge follows the **hybrid pattern**: compact question→family→chartType decision framework baked into the skill (fast, offline, no license concern), with a deliberate escalation to fetch [`https://www.thedefensibledecision.com/gallery/chart-gallery.html`](https://www.thedefensibledecision.com/gallery/chart-gallery.html) when the user asks for deep per-chart tips or the compact table doesn't cover the case.

**Tech Stack:** Markdown (SKILL.md, prompt, README), JSON (MCP fragment, install manifest), npm-published `flint-chart-mcp` v0.3.0, Alex ACT Edition brain (Mall install conventions), Alex_ACT_Memory feedback channel for submission.

---

## Executive summary — decisions locked in prior conversation turns

| #                            | Decision                           | Locked value                                                                                                                      | Rationale                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**                       | Plugin shape                       | `.SP.` + `mcp.json` sidecar                                                                                                       | Skill + prompt + MCP fragment covers "the whole thing" without forcing heirs to reinvent glue                                                                                                                                                                                                                                                           |
| **D2**                       | Skill body size                    | Full authoring content preserved + ~60 new lines for §0 selection                                                                 | Existing skill is load-bearing; selection framework is compact                                                                                                                                                                                                                                                                                          |
| **D3**                       | Prompt name                        | `/render-chart` (revised 2026-07-24 from `/flint-chart`)                                                                          | Original `/flint-chart` collided with the `flint-chart` skill in VS Code 1.118+ slash picker (skills + prompts share the surface — same base name = two picker entries). Renamed to a verb-prompt matching Edition's `/meditate`+`meditation` convention. `/chart` was rejected as too generic; `/visualize` was rejected as broader scope than we own. |
| **D4**                       | MCP config packaging               | Ship real `mcp.json` fragment (~10 lines) inside the plugin                                                                       | Establishes convention for future MCP-shipping plugins; zero-config `npx` is exactly the use case that justifies auto-merge                                                                                                                                                                                                                             |
| **D5**                       | MCP version pin                    | `flint-chart-mcp@^0.3.0` in the fragment                                                                                          | Picks up 0.3.x patches; blocks breaking major bumps                                                                                                                                                                                                                                                                                                     |
| **D6**                       | Submission path                    | `/mall-contribute` → proposal to `../Alex_ACT_Memory/feedback/` → Supervisor triage                                               | Documented flow; Supervisor decides curated `plugin-mall` vs other store                                                                                                                                                                                                                                                                                |
| **D7**                       | Draft location                     | `.github/skills/local/flint-chart/` etc. in **this** workspace, gitignored so nothing leaks into upstream `microsoft/flint-chart` | Allows dogfood testing of discovery + MCP + skill in real environment before submitting to Mall                                                                                                                                                                                                                                                         |
| **S1**                       | Selection knowledge structure      | Single enriched SKILL.md, §0 prepended                                                                                            | Matches sibling plugin convention (all Mall plugins are single-skill)                                                                                                                                                                                                                                                                                   |
| **S2**                       | Selection scope cut                | Drop AI-Powered / Qualitative / SPC families from the guide                                                                       | Flint can't render most of them; recommending them would be a hallucination trap. Include one-line pointer to "outside Flint's rendering scope"                                                                                                                                                                                                         |
| **S3**                       | Attribution                        | Framework ideas → credit Knaflic/Kirk/Few/Wexler; deep per-chart tips → link out to _The Defensible Decision_ gallery             | Ideas aren't copyrightable; specific tips are. Respect both boundaries                                                                                                                                                                                                                                                                                  |
| **S4**                       | Draft location for the plugin      | Same as D7 — this workspace, gitignored                                                                                           | (Confirmed by user)                                                                                                                                                                                                                                                                                                                                     |
| **S5**                       | Selection scope for prompt/mcp     | Enrich SKILL.md only; prompt/mcp fragment stay simple                                                                             | No duplication of selection logic outside the skill                                                                                                                                                                                                                                                                                                     |
| **Delivery**                 | Bundle vs reference for MCP server | Reference via npm (`npx -y flint-chart-mcp@^0.3.0`)                                                                               | Bundling would be 80-120 MB per plugin × 6 OS/arch variants; breaks Mall model; loses npm supply-chain protections                                                                                                                                                                                                                                      |
| **Selection knowledge mode** | Hybrid (mode C)                    | Bake in the compact framework; refer out for depth                                                                                | Fast common path in skill + fresh authoritative depth on site + fallback if site unreachable                                                                                                                                                                                                                                                            |

---

## Current context

- **This workspace** is `microsoft/flint-chart` upstream. All plugin drafts must live in gitignored paths so nothing accidentally commits to upstream.
- **Alex_Skill_Mall** is NOT cloned as a sibling. Contribution goes via `/mall-contribute` → `../Alex_ACT_Memory/feedback/` (which IS present as a sibling).
- **flint-chart-mcp** is published to npm at `0.3.0` (Microsoft Corporation, MIT).
- **Existing authoring skill** at [`agent-skills/flint-chart-author/SKILL.md`](../agent-skills/flint-chart-author/SKILL.md) is ~900 lines. This is the base for the plugin's SKILL.md.
- **No existing chart/flint plugin** in the Mall catalog (verified by fetching `catalog/index.json` — 3,861 plugins, no name collision).
- **Nearest neighbors** in the Mall: `mermaid-diagram`, `excalidraw-diagram-generator`, `data-visualization`, `chart-interpretation`. Suggested category: `media-graphics`.

## Assumptions

1. VS Code / Copilot Chat is the primary heir runtime. MCP over stdio works out of the box.
2. Heir workspaces have Node.js ≥ 18 installed (required for `npx flint-chart-mcp`).
3. Heirs on ACT Edition ≥ 3.x auto-register `local/` roots via `heir-workspace-settings-baseline.json`; older heirs need the manual settings fallback documented in [`mall-installation.instructions.md`](../.github/instructions/mall-installation.instructions.md).
4. The Defensible Decision gallery URL is stable at `thedefensibledecision.com/gallery/chart-gallery.html`. Falsifiability check at 90 days: if the URL 404s or the site restructures, revise the referral pointer.

## Deliverables

Five files in this workspace (all gitignored) + one file in sibling Memory + one gitignore update.

| Path                                                                  | Purpose                                                   | Ownership                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.github/skills/local/flint-chart/SKILL.md`                           | Enriched authoring + selection guide                      | New (adapted from upstream `agent-skills/flint-chart-author/SKILL.md` + §0 addition) |
| `.github/skills/local/flint-chart/.install.json`                      | Install manifest for `/mall-refresh` drift detection      | New (Mall convention)                                                                |
| `.github/prompts/local/render-chart.prompt.md`                        | `/render-chart <request>` slash-command entry point       | New                                                                                  |
| `.mcp.json` (workspace root)                                          | MCP server registration for local dogfood                 | New                                                                                  |
| `.github/skills/local/flint-chart/README.md`                          | Plugin README (for Mall submission)                       | New                                                                                  |
| `.github/skills/local/flint-chart/mcp.json`                           | MCP fragment shipped with the plugin (Mall-side artifact) | New                                                                                  |
| `.gitignore` (workspace root)                                         | Prevent all above from leaking to upstream flint-chart    | Modify — add ~5 lines                                                                |
| `../Alex_ACT_Memory/feedback/2026-07-24-mall-proposal-flint-chart.md` | Submission proposal for Mall curation                     | New (via `/mall-contribute`)                                                         |

---

## Task breakdown

### Task 1 — Guard upstream against leakage

**Objective:** Ensure the plugin drafts we're about to create cannot accidentally be committed to `microsoft/flint-chart`.

**IMPLEMENTATION NOTE (2026-07-24)**: Used `.git/info/exclude` (untracked, local-only) instead of `.gitignore` (tracked file — edits would show as diff against upstream). Same ignore effect, zero footprint in upstream.

**Files:**

- Modify: `.git/info/exclude` (local-only, not tracked)

#### Step 1: Inspect current .gitignore

```powershell
Get-Content .gitignore | Select-String -Pattern '^(\.github|\.mcp|\.plans)' -SimpleMatch
```

Expected: no matches (nothing filters our target paths yet).

#### Step 2: Append staging paths

Append these lines to workspace-root `.gitignore` under a `# Alex ACT Edition — heir-local staging (do not commit to upstream flint-chart)` header:

```gitignore
# Alex ACT Edition — heir-local staging (do not commit to upstream flint-chart)
.plans/
.github/skills/local/
.github/prompts/local/
.github/agents/local/
.github/instructions/local/
.github/scripts/local/
.mcp.json
```

#### Step 3: Verify

```powershell
git status --porcelain .github/skills/local/ .mcp.json 2>&1
```

Expected: no output (paths are ignored).

#### Step 4: Commit the .gitignore change locally

Not applicable — user's call whether to PR the gitignore addition upstream to Microsoft or keep it staged only.

---

### Task 2 — Author the MCP config fragment

**Objective:** Produce the `mcp.json` fragment that ships in the plugin and gets merged into the heir's workspace-root `.mcp.json` at install time.

**Files:**

- Create: `.github/skills/local/flint-chart/mcp.json` (the plugin artifact; will also be copied to workspace root `.mcp.json` in Task 7 for dogfood)

#### Step 1: Write the fragment

Contents of `.github/skills/local/flint-chart/mcp.json`:

```jsonc
{
  "servers": {
    "flint": {
      "command": "npx",
      "args": ["-y", "flint-chart-mcp@^0.3.0"],
    },
  },
}
```

#### Step 2: Document optional flags

Add a `README` section in Task 3 covering:

- `--disable-file-reference` — reject local `data.url` file references; only inline `data.values` accepted (hardened deployments)
- `--backends vegalite,echarts` — restrict backends
- Pre-install alternative for air-gapped heirs: `npm install -g flint-chart-mcp@0.3.0` then use `"command": "flint-chart-mcp"` with no npx download at runtime

**Verification:** JSON parses cleanly:

```powershell
Get-Content .github/skills/local/flint-chart/mcp.json -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

Expected: round-trips without error.

---

### Task 3 — Draft plugin README

**Objective:** Author `README.md` for the plugin — human-readable summary that shows on the Mall's plugin page.

**Files:**

- Create: `.github/skills/local/flint-chart/README.md`

#### Step 1: Write the README

Sections (in order):

1. **Title + one-liner** — "Flint Chart: pick the right chart, then render it (Vega-Lite / ECharts / Chart.js)"
2. **What it does** — 2-paragraph summary: chart-selection + spec authoring + local MCP rendering
3. **What ships** — the 4 artifacts (SKILL, prompt, MCP fragment, install manifest)
4. **Prerequisites** — Node.js ≥ 18, MCP-capable host (VS Code Copilot / Claude Desktop / Cursor)
5. **Install** — one-line `/mall-install flint-chart` (Phase 5b) + manual steps (Phase 5a today)
6. **Usage examples** — the 5 patterns from the prior conversation turn (ambient, slash, validate, compile, capability discovery)
7. **Configuration** — MCP flags (`--disable-file-reference`, `--backends`), air-gapped fallback (global npm install)
8. **Attribution** — credit Knaflic, Kirk, Few, Wexler + link to The Defensible Decision gallery + credit Microsoft Research + IDEAS Lab (Renmin University) for flint-chart itself
9. **License** — MIT (matches upstream flint-chart)
10. **Source** — link to `microsoft/flint-chart` repo

**Verification:** Read through the README once — every code block runs verbatim; every URL resolves.

---

### Task 4 — Copy and adapt the base authoring skill

**Objective:** Bring the existing 900-line authoring guide into the plugin as SKILL.md, adapt frontmatter for Mall conventions.

**Files:**

- Create: `.github/skills/local/flint-chart/SKILL.md` (copied from `agent-skills/flint-chart-author/SKILL.md`)

#### Step 1: Copy the upstream skill verbatim

```powershell
Copy-Item agent-skills/flint-chart-author/SKILL.md .github/skills/local/flint-chart/SKILL.md
```

#### Step 2: Adjust frontmatter

Change:

```yaml
---
name: flint-chart-author
description: "Use when: the user asks to make or render charts with flint-chart, visualize tabular data, generate a ChartAssemblyInput, validate/render through MCP, or add Flint to a JS/TS project. Author the semantic spec, transform data before Flint when needed, install/import Flint only when executable code is needed, and reserve backend-specific style tweaks for after compiling from Flint."
---
```

To (name matches directory per Mall / VS Code discovery convention; description expanded to advertise the new selection capability):

```yaml
---
name: flint-chart
description: "Use when the user wants to visualize data — from 'which chart should I use?' to 'render this'. Helps pick the right chart from the analytical question (comparison / trend / distribution / relationship / proportion / flow / KPI), then authors a ChartAssemblyInput and renders via the flint-chart-mcp server (Vega-Lite / ECharts / Chart.js). Transform data before Flint; style tweaks after Flint."
lastReviewed: 2026-07-24
---
```

#### Step 3: Verify VS Code discovery expectations

Directory name (`flint-chart`) must match frontmatter `name:` — confirmed.

---

### Task 5 — Prepend §0 Chart Selection to SKILL.md

**Objective:** Add the chart-selection framework (hybrid mode: baked framework + referral for depth) as a new Step 0 before the existing "Step 1 — pick chartType" section.

**Files:**

- Modify: `.github/skills/local/flint-chart/SKILL.md` — insert §0 between the introduction and "Step 1"

#### Step 1: Draft the §0 content

Target size: ~60 lines. Structure:

```markdown
## Step 0 — Pick the chart (when the user hasn't said which one)

Skip this step if the user named the chart type. Otherwise, work down this list:

### 0.1 One-sentence message

Before choosing a chart, write the message it should carry (Knaflic — _Storytelling with Data_):

- What is your unique point of view?
- What is at stake?
- Express as a complete sentence, not a phrase.

If you cannot write the sentence, ask the user before drawing.

### 0.2 Question → family → chart

| Analytical question            | Family       | Primary chart                                       | Alternates                                                                                                                                                                   |
| ------------------------------ | ------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rank or compare categories?    | Comparison   | Bar Chart (2-15 items)                              | Grouped Bar (2-4 series), Stacked Bar (composition + total), Slope Chart (2 periods), row/column facets (many items, aka Small Multiples)                                    |
| Change over continuous time?   | Trend        | Line Chart                                          | Area Chart (volume emphasis), Bar+Line combo via multi-encoding                                                                                                              |
| How are values distributed?    | Distribution | Histogram (one variable)                            | Boxplot (compare groups + stats), Violin Plot (compare + shape)                                                                                                              |
| Correlation between variables? | Relationship | Scatter Plot                                        | Scatter with `size` (3 vars, aka Bubble), Regression (with fit line), Parallel Coordinates (many vars, ECharts)                                                              |
| Part of a whole?               | Proportion   | Bar Chart (accurate) or Stacked Bar 100%            | Pie Chart (**only** if one slice dominates ≥60% OR comparing to 50%), Treemap (many/hierarchy, ECharts), Sunburst (interactive hierarchy, ECharts), Funnel (stages, ECharts) |
| Flow between stages?           | Flow         | Sankey (linear, ECharts)                            | Streamgraph (aesthetic, precision sacrificed), Heatmap (matrix pattern)                                                                                                      |
| Progress toward a target?      | KPI          | Bullet Chart (Few's superior alternative to gauges) | KPI Card (single number), Sparkline (in-table trend)                                                                                                                         |

### 0.3 Anti-patterns — don't recommend

- **Pie for >5 categories** — humans can't compare angles; use Bar Chart or 100% Stacked Bar
- **Word cloud for analysis** — position and word length distort; use Bar Chart of top-N terms
- **Dual-axis combo without justification** — consider two separate charts; dual axes mislead
- **Truncated Y-axis on bars** — exaggerates differences; always start at zero for Bar Chart
- **Streamgraph when precise values matter** — the flowing baseline sacrifices readability
- **Gauge over Bullet** — Bullet packs actual + target + qualitative ranges in less space with more precision

### 0.4 Flint coverage — what to substitute when the ideal chart isn't available

| Ideal chart (from wider viz literature)                                                                                                     | Flint substitute                          | How                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Waffle Chart                                                                                                                                | Bar Chart or Stacked Bar 100%             | Grid of squares isn't native; a labeled percentage bar communicates the same |
| Chord Diagram                                                                                                                               | Sankey (ECharts backend)                  | Linear flow instead of circular; simpler to read anyway                      |
| Pareto Chart                                                                                                                                | Bar Chart + Line Chart combo              | Sort bars descending, overlay cumulative-% line via multi-encoding           |
| Beeswarm Plot                                                                                                                               | Strip Plot with `stepWidth`               | Same "every point matters" story, jittered instead of packed                 |
| Ridgeline Plot                                                                                                                              | Violin Plot with `row` facet              | Density curves stacked per group                                             |
| Small Multiples                                                                                                                             | any chart with `row` or `column` encoding | Native facet support                                                         |
| Word Cloud / Sentiment / NPS Gauge / Likert / Mind Map / Control Chart / Run Chart / Decomposition Tree / Key Influencers / Smart Narrative | Not in Flint's scope                      | Export data to Power BI, Tableau, or an SPC tool                             |

### 0.5 When to fetch the deep reference

Fetch [The Defensible Decision — Complete Chart Gallery](https://www.thedefensibledecision.com/gallery/chart-gallery.html) when:

- The user asks about a chart not in the table above
- The user asks "what other charts could work here?"
- The user needs per-chart design tips (axis handling, color, labeling, accessibility)
- The compact table above is ambiguous for the case at hand

The gallery has 48 charts across 10 families with per-chart 💡 tips and Power-BI-specific notes.

### 0.6 Design principles (invoke, do not substitute)

- **Trustworthy · Accessible · Elegant** (Kirk) — check the chart against all three before shipping
- **Tables for lookup, graphs for pattern** (Few) — if the user wants exact values, a table beats any chart
- **Explanatory vs exploratory** (Knaflic) — for stakeholder communication, show the pearl, not the oyster bed
- **Gestalt** — group with proximity, distinguish with color/shape, connect with lines, enclose with backgrounds

---
```

#### Step 2: Insert into SKILL.md

Find the anchor `## Step 1 — pick \`chartType\`` in the copied SKILL.md and insert §0 immediately before it.

#### Step 3: Add attribution block

Insert near the top of SKILL.md (after the "What you produce" section and before Step 0):

```markdown
## Attribution

Chart-selection framework distilled from standard visualization literature: Cole Nussbaumer Knaflic (_Storytelling with Data_), Andy Kirk (_Data Visualisation_), Stephen Few (_Show Me the Numbers_, _Information Dashboard Design_), Wexler / Shaffer / Cotgreave (_Big Book of Dashboards_). For per-chart design tips and the full 48-chart catalog, see _The Defensible Decision_ chart gallery: <https://www.thedefensibledecision.com/gallery/chart-gallery.html>. flint-chart itself is a Microsoft Research + IDEAS Lab (Renmin University) project — see <https://microsoft.github.io/flint-chart/>.
```

**Verification:** Read SKILL.md end-to-end. Ordering: attribution → §0 (selection) → existing Step 1 (registry) → Step 2 (channels) → rest unchanged.

---

### Task 6 — Author the `/render-chart` slash-command prompt

**Objective:** Provide a friendly slash-command entry point that primes the workflow without duplicating skill content.

**Files:**

- Create: `.github/prompts/local/render-chart.prompt.md`

#### Step 1: Write the prompt

```markdown
---
description: "Pick the right chart for the user's data + question, then author and render it via the flint-chart-mcp server. Loads the flint-chart skill automatically."
---

# /render-chart

Follow these steps:

1. **Load the `flint-chart` skill** (`.github/skills/local/flint-chart/SKILL.md` or `.github/skills/flint-chart/SKILL.md`) if not already active.
2. **Understand the user's data.** If they attached a file, read the first ~20 rows to see column shape. If not, ask for a sample or file path.
3. **Frame the analytical question** using the skill's §0.1. If the user didn't state it, ask one sharp question.
4. **Pick the chart** via the skill's §0.2 table (or fetch the deep reference per §0.5 when the compact table doesn't cover the case).
5. **Author the `ChartAssemblyInput`** per the skill's Step 1-3.
6. **Render.** Default to `create_chart_view` for an interactive panel; fall back to `render_chart` (PNG/SVG) if the host lacks App UI support. Use `validate_chart` first if you're unsure the spec is well-formed.
7. **Report** what you chose and why, including which alternates you considered.

If the MCP server (`flint`) isn't registered, point the user at the plugin README's install section.
```

**Verification:** Prompt is under 50 lines, contains no chart-selection duplication (delegates to skill for all real decisions).

---

### Task 7 — Dogfood locally

**Objective:** Prove the plugin works end-to-end in this workspace before submitting to the Mall.

**Files:**

- Create: `.mcp.json` (workspace root — copy from `.github/skills/local/flint-chart/mcp.json`)
- Verify: `.vscode/settings.json` has `local/` roots registered (create if missing)

#### Step 1: Copy the MCP fragment to workspace root

```powershell
Copy-Item .github/skills/local/flint-chart/mcp.json .mcp.json
```

#### Step 2: Verify VS Code local-root registration

Read `.vscode/settings.json`. If it does not contain the three `chat.*FilesLocations` keys, add:

```jsonc
{
  "chat.agentSkillsLocations": {
    ".github/skills": true,
    ".github/skills/local": true,
  },
  "chat.promptFilesLocations": {
    ".github/prompts": true,
    ".github/prompts/local": true,
  },
  "chat.agentFilesLocations": {
    ".github/agents": true,
    ".github/agents/local": true,
  },
}
```

#### Step 3: Reload VS Code window

`Ctrl+Shift+P` → "Developer: Reload Window"

#### Step 4: Verify skill discovery

Open a new Copilot Chat session. The `<skills>` block should now list `flint-chart` with the new description.

#### Step 5: Verify prompt discovery

Type `/` in the chat input. `/render-chart` should appear in the picker.

#### Step 6: Verify MCP server

Ask the agent: "Use the flint MCP server to list supported chart types for the vegalite backend."

Expected: agent calls `list_chart_types` and returns the registered list.

#### Step 7: Full end-to-end test — Case 1 (ambient trigger, selection required)

Ask: "I have monthly sales data for 12 regions. Best way to compare them side by side?"

Expected: agent loads the skill, applies §0.2 (Comparison family → Grouped Bar with 4 series max, or Small Multiples with `row` facet since 12 > 4), asks about data shape, then either drafts a spec or asks for the CSV.

#### Step 8: Full end-to-end test — Case 2 (deep-reference escalation)

Ask: "What's the best chart for showing customer journey through a 5-stage marketing funnel with 3 traffic sources?"

Expected: compact table returns "Sankey (linear flow)"; agent fetches the gallery for the Sankey per-chart tip about stage-count limits ("3-5 stages") and offers a spec.

#### Step 9: Full end-to-end test — Case 3 (explicit slash, direct render)

Type: `/render-chart render a scatter of weight vs mpg colored by origin` (with sample data attached or referenced).

Expected: agent authors the spec directly (chart type is stated), calls `create_chart_view`, opens the panel.

---

## 🚦 Publish gate — pause after Task 7

**Confirmed 2026-07-24 with user**: after Task 7 dogfood tests pass in this workspace, PAUSE and confirm with the user before executing Tasks 8-9. The publish path (A/B/C/D from the prior conversation turn) is decided at this gate, not now. Publishing to `Alex_Skill_Mall` requires either Supervisor triage, a fork+PR by the user, or direct write access — none of which we lock in until dogfood proves the plugin works.

If any Task 7 test fails, iterate on the plugin (fix the SKILL.md, prompt, or MCP fragment) and re-run Task 7 before opening the publish question.

---

### Task 8 — Author the Mall proposal

**Objective:** Package the plugin for submission via `/mall-contribute`.

**Files:**

- Create: `../Alex_ACT_Memory/feedback/2026-07-24-mall-proposal-flint-chart.md`

#### Step 1: Resolve the Memory bus

```powershell
node .github/scripts/_registry.cjs --resolve .
```

Expected: prints `../Alex_ACT_Memory` (sibling clone confirmed).

#### Step 2: Run the `/mall-contribute` prompt

Or manually: create `../Alex_ACT_Memory/feedback/2026-07-24-mall-proposal-flint-chart.md` following the schema in [`mall-contribute.prompt.md`](../.github/prompts/mall-contribute.prompt.md).

#### Step 3: Proposal content

Header:

```markdown
---
category: feature-request
severity: low
skill: mall-contribute
date: 2026-07-24
---

# Mall Contribution Proposal: flint-chart
```

Sections:

1. **Summary** — Chart-selection + spec-authoring + local rendering; delegates to Microsoft's flint-chart-mcp npm package
2. **Suggested category** — `media-graphics` (siblings: `mermaid-diagram`, `excalidraw-diagram-generator`, `data-visualization`)
3. **Suggested shape** — `.SP.` (skill + prompt) + `mcp.json` sidecar
4. **Proposed README.md** — paste from Task 3
5. **Proposed SKILL.md** — paste from Task 5 result
6. **Proposed render-chart.prompt.md** — paste from Task 6
7. **Proposed mcp.json** — paste from Task 2
8. **Generalizability Evidence:**
   - Charting is a horizontal concern — data-heavy heirs across finance, analytics, ops, research all need it
   - The chart-selection framework works independent of Flint (heir can apply the guidance even without the MCP)
   - Zero-config MCP setup (`npx -y flint-chart-mcp@^0.3.0`) means near-zero install friction
9. **License** — MIT (both flint-chart-mcp and the selection framework — original words citing standard literature)
10. **Attribution notes** — All third-party ideas credited; no verbatim copy of copyrighted per-chart tips (those referred out to the source)

**Verification:** The proposal follows [`mall-contribute.prompt.md`](../.github/prompts/mall-contribute.prompt.md) structure exactly. PII filter passes (no project-specific data, no user names, no credentials).

---

### Task 9 — Commit the proposal to the Memory feedback channel

**Objective:** Push the proposal so the Supervisor (or user) can triage it into the Mall.

**Files:**

- New commit in `../Alex_ACT_Memory/` (sibling repo — NOT in this workspace)

#### Step 1: Stage and commit

```powershell
Push-Location ../Alex_ACT_Memory
git add feedback/2026-07-24-mall-proposal-flint-chart.md
git commit -m "feedback: propose flint-chart plugin for Mall"
Pop-Location
```

#### Step 2: Push (best-effort — may fail if no remote configured)

```powershell
Push-Location ../Alex_ACT_Memory
git push 2>&1
Pop-Location
```

Expected: pushes if remote is configured; prints "no upstream" otherwise. Either way, the proposal is now discoverable by the user's Supervisor (if running) or by direct triage.

#### Step 3: Confirm submission

Reply to user: "Proposal written to `../Alex_ACT_Memory/feedback/2026-07-24-mall-proposal-flint-chart.md`. Next step: your Supervisor (if you run one) triages it, or you can promote it directly to `Alex_Skill_Mall` under `plugins/media-graphics/flint-chart/`."

---

## Files created / modified — final inventory

**In this workspace (all gitignored):**

- `.gitignore` — appended 7 lines (Task 1)
- `.github/skills/local/flint-chart/SKILL.md` — enriched authoring + selection skill (Tasks 4 + 5)
- `.github/skills/local/flint-chart/README.md` — plugin README (Task 3)
- `.github/skills/local/flint-chart/mcp.json` — MCP fragment (Task 2)
- `.github/skills/local/flint-chart/.install.json` — install manifest (deferred until `/mall-install` Phase 5b lands; write a stub for now with `store: "plugin-mall"` placeholder)
- `.github/prompts/local/render-chart.prompt.md` — slash-command entry (Task 6)
- `.mcp.json` — workspace-root MCP config for dogfood (Task 7)
- `.vscode/settings.json` — merge local-root registration keys (Task 7; conditional)

**In sibling `Alex_ACT_Memory` (separate commit):**

- `feedback/2026-07-24-mall-proposal-flint-chart.md` — Mall submission proposal (Task 8, committed in Task 9)

**Deferred (Mall-side, done by Supervisor after triage):**

- `Alex_Skill_Mall/plugins/media-graphics/flint-chart/` — the accepted plugin files under Mall governance
- `Alex_Skill_Mall/catalog/index.json` — auto-updated by Mall's self-curation pipeline (ADR-008)

## Verification checklist

- [ ] `.gitignore` prevents plugin drafts from appearing in `git status`
- [ ] `.github/skills/local/flint-chart/SKILL.md` parses (frontmatter valid, markdown renders)
- [ ] `.github/skills/local/flint-chart/mcp.json` is valid JSON and round-trips via `ConvertFrom-Json`
- [ ] `.mcp.json` at workspace root registers `flint` server; `npx -y flint-chart-mcp` succeeds on first tool call (~1-2s cold start)
- [ ] VS Code reload picks up `.github/skills/local/flint-chart/SKILL.md` in the `<skills>` block
- [ ] `/render-chart` appears in the slash-command picker after reload
- [ ] Agent successfully invokes `list_chart_types`, `validate_chart`, `render_chart`, `create_chart_view` MCP tools
- [ ] Case 1 (selection required, compact-table hit) works end-to-end
- [ ] Case 2 (deep-reference escalation) fetches the gallery URL and integrates the tip
- [ ] Case 3 (explicit slash, direct render) opens the interactive chart panel
- [ ] Mall proposal committed to `../Alex_ACT_Memory/feedback/`
- [ ] No PII in any committed file (per `pii-memory-filter.instructions.md`)
- [ ] No verbatim copy of thedefensibledecision.com per-chart tips in SKILL.md (per S3 attribution boundary)

## Risks and open questions

| Risk                                                                          | Likelihood                                      | Mitigation                                                                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Site URL changes and §0.5 referral breaks                                     | Medium (personal site, no SLA)                  | Falsifiability check at 90 days; skill's §0.2 table covers 80% of selection without the fetch, so failure is graceful             |
| flint-chart-mcp introduces breaking changes in a minor bump (violates semver) | Low                                             | `^0.3.0` blocks major bumps; if a 0.x.y minor breaks, patch the fragment to pin `~0.3.0`                                          |
| Baked framework drifts from evolving best practices                           | Low (framework is stable across viz literature) | Falsifiability check at 12 months; refresh from primary sources if any recommendation is refuted                                  |
| Corporate heirs blocked by npm registry firewalls                             | Medium (enterprise environments)                | README documents `npm install -g flint-chart-mcp@0.3.0` fallback + points at private mirror setup                                 |
| MCP fragment merge conflicts if heir already has a `flint` server             | Low (unique name)                               | Document conflict-resolution in README: "if you have another `flint` server, rename ours to `flint-chart`"                        |
| Attribution objection from The Defensible Decision author                     | Low (we only refer, don't reproduce)            | Ready to add explicit acknowledgment, remove the referral if requested, and rely solely on the baked framework (Knaflic/Kirk/Few) |
| Supervisor rejects the `mcp.json`-fragment convention (D4)                    | Medium (first plugin to ship one)               | Fall back to README-only manual install; re-submit as `.SP..` (skill + prompt, no mcp sidecar)                                    |
| Chart-selection recommendations conflict with the domain user's expertise     | Low                                             | Skill says "invoke, don't substitute for" the frameworks; user-framing audit per critical-thinking rules                          |

**Open questions:**

1. Should we also propose the plugin directly to `Alex_Skill_Mall` as a PR, in parallel to the feedback-channel proposal? (Faster acceptance but bypasses Supervisor triage flow.)
2. Should the `.install.json` manifest be written now with a stub `store: "TBD"`, or deferred until Supervisor decides the store placement?
3. Should the plugin ship a `references/` subdirectory with additional chart examples, or keep the SKILL.md self-contained?
4. Is there value in also shipping a `/flint-chart-select` slash command (selection-only, no rendering)? Current design puts selection inside `/render-chart` which always ends with rendering.

## Rollback plan

If the plugin doesn't work or is rejected:

1. **Local rollback:** Delete `.github/skills/local/flint-chart/`, `.github/prompts/local/render-chart.prompt.md`, `.mcp.json`. Revert `.gitignore` additions.
2. **Memory rollback:** In `../Alex_ACT_Memory/`, `git rm feedback/2026-07-24-mall-proposal-flint-chart.md` and force-push (if already pushed to a shared remote).
3. **VS Code settings rollback:** Remove the three `chat.*FilesLocations` keys from `.vscode/settings.json` if we added them.

No irreversible actions in the plan — all steps are additive to gitignored paths + one sibling-repo commit that can be reverted.

## Falsifiability deadlines

Per [`falsifiability-deadlines.instructions.md`](../.github/instructions/falsifiability-deadlines.instructions.md), the plugin's SKILL.md and prompt each carry:

- **SKILL.md** — `lastReviewed: 2026-07-24`. Revise by **2026-10-22** (90 days) or sooner if: (a) The Defensible Decision URL 404s or restructures, (b) flint-chart-mcp ships a breaking change we haven't accounted for, (c) any recommendation in §0.2 is refuted by a source we trust, (d) the plugin gets ≥3 heir installs and none of them exercise §0.5 (deep-reference escalation) — that signals the compact table alone is enough and §0.5 is decorative.
- **render-chart.prompt.md** — same 90-day deadline. Revise if the 7-step numbered flow produces consistent skips at any step, or if `/render-chart` slash-command discoverability breaks after a VS Code release.

## References

- Upstream authoring skill: [`agent-skills/flint-chart-author/SKILL.md`](../agent-skills/flint-chart-author/SKILL.md)
- Upstream MCP server: [`packages/flint-mcp/README.md`](../packages/flint-mcp/README.md), npm `flint-chart-mcp@0.2.2` (latest published; 0.3.0 tag exists in git but not on npm as of 2026-07-24)
- Canonical Flint docs: [project home](https://microsoft.github.io/flint-chart/) · [getting started](https://microsoft.github.io/flint-chart/#/documentation/getting-started) · [MCP server doc](https://microsoft.github.io/flint-chart/#/mcp) · [chart gallery (Vega-Lite)](https://microsoft.github.io/flint-chart/#/gallery/vegalite) (swap `/vegalite` for `/echarts` or `/chartjs`)
- Mall installation conventions: [`mall-installation.instructions.md`](../.github/instructions/mall-installation.instructions.md)
- Mall submission workflow: [`mall-contribute.prompt.md`](../.github/prompts/mall-contribute.prompt.md)
- Cross-project isolation: [`cross-project-isolation.instructions.md`](../.github/instructions/cross-project-isolation.instructions.md)
- PII filter: [`pii-memory-filter.instructions.md`](../.github/instructions/pii-memory-filter.instructions.md)
- Chart-selection reference: [The Defensible Decision — Complete Chart Gallery](https://www.thedefensibledecision.com/gallery/chart-gallery.html)
- Foundational viz literature: Knaflic (_Storytelling with Data_), Kirk (_Data Visualisation_), Few (_Show Me the Numbers_, _Information Dashboard Design_), Wexler / Shaffer / Cotgreave (_Big Book of Dashboards_)

---

**Total estimated implementation:** 9 tasks, all under 15 min individually. Dogfood + submission achievable in one focused session. No blocking on external parties until Task 9 (Supervisor triage).

---

## Amendment — 2026-07-24 (post-dogfood reshape)

**Change**: Plugin BOM grew from one skill to **two skills + one prompt + MCP sidecar** during the AIRS dogfood session. Task 5 above still describes the original one-skill shape for decision-history purposes; the current shipping shape is enumerated in the `.install.json` manifest.

**What was added:**

- **New skill: `chart-big-idea`** (`.github/skills/local/chart-big-idea/SKILL.md`, ~150 lines). Framing skill that produces a Chart Brief before selection. Steps: (0) read surrounding context, (1) draft Big Idea via subject-verb-implication template or 3-question elicitation ladder, (2) classify story arc, (3) triage audience + stakes, (4) ask user for **TRADITIONAL vs INNOVATIVE** style stance explicitly, (5) emit Brief.
- **`/render-chart` prompt updated** to load `chart-big-idea` as its new Step 1 (before loading `flint-chart`). All downstream steps now consume the Brief as their constraint.
- **`.install.json` reshaped** as a multi-asset manifest (was single-skill snapshot). Enumerates both skills, the prompt, the MCP sidecar, and the README as first-class assets with per-asset roles and frontmatter snapshots.
- **README "What ships" table** expanded to six files; new "Architecture — two skills, one prompt" section explains the framing → selection → rendering flow.

**Why the reshape**: dogfooding fig07 (AIRS Behavioral Intention across clusters) surfaced that chart _selection_ was the visible bottleneck but chart _framing_ was the invisible one. The lollipop-on-distribution wasn't the right answer because "layered strip + centroid" is clever; it was the right answer because the Big Idea had two arcs (comparison + distribution) and a bar-of-means loses half the argument. That framing move is a repeatable pattern worth its own skill — pushing it into a preflight step keeps the selection skill focused on the mechanical family-to-chartType lookup.

**What did NOT change from the original plan**: version pinning (`^0.2.2`), MCP sidecar shape, `/render-chart` naming convention (verb-prompt), publish-gate discussion (Task 8 A/B/C/D still open), Task 9 Supervisor triage, cross-project-isolation rules for the README, `.git/info/exclude` gitignore approach.

**Severity classification**: `[behaviour]` — adds a shipping asset that heirs will install. Not `[constitutional]` because the manifesto / claims registry / ACT tenets are unaffected.

**Falsifiability for `chart-big-idea`**: `lastReviewed: 2026-07-24`, revise by **2026-10-22** or sooner if (a) the Chart Brief format is skipped in ≥3 consecutive `/render-chart` invocations because it's too heavy, (b) the TRADITIONAL / INNOVATIVE binary produces user confusion in ≥2 sessions, (c) the Step 4 crosstab surfaces a chartType `flint-chart` §0.4 can't render more than once per quarter, (d) Cole Nussbaumer Knaflic publishes a materially revised Big Idea framing.

**Still open before Mall submission** (updated from original Task 9):

1. Publish-path decision (A user pushes / B I open PR / C hand to Supervisor / D feedback+wait)
2. `store` category — `media-graphics` vs `visualization` vs new — Supervisor triage
3. `trust_score` baseline — first-audit result
4. Final `source_url` pointing at the accepted `Alex_Skill_Mall/plugins/<category>/flint-chart/` path
