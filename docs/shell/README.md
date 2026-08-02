<!-- markdownlint-disable-file MD060 MD041 -->
<!-- MD060: This file was ported from Alex_ACT_Steward's compact-table markdownlint config. Preserving compact style for byte-fidelity with the canonical body's diff history. MD041: nav-strip is the standard first-line convention in this file family across the ACT constellation. -->
<!-- nav-strip -->
**Illustrator Plugin · docs-shell reference** · [▲ Docs index](../README.md) · [Skill body](../../.github/skills/docs-shell/SKILL.md) · [Starter kit](../../.github/skills/docs-shell/starter/)
<!-- /nav-strip -->

# The docs-shell pattern

Technical reference for the single-page HTML wrapper that renders a repository's markdown as browsable documentation. Authored 2026-07-26 in [Alex_ACT_Steward](https://github.com/fabioc-aloha/Alex_ACT_Steward), unified into a single-root shell 2026-07-28, and moved to this plugin (`Alex_ACT_Illustrator_Plugin`) as the canonical source-of-truth on 2026-07-29.

## Overview

The shell is a two-file pattern at repo root:

| File | Role |
|---|---|
| [`../../index.html`](../../index.html) | The shell itself. Single HTML file (~50 KB) with inline CSS and JS. Loads marked, DOMPurify, Mermaid, and highlight.js from pinned CDN assets with SHA-384 integrity checks. **Note**: this plugin repo doesn't ship a live root shell; adopters install the starter and get `index.html` + `manifest.json` at their repo root. |
| [`../../manifest.json`](../../manifest.json) | The hand-edited source of truth. Declares brand, theme, areas, docs, sources. Zero build step. **Note**: same caveat — the reference lives in adopter repos, not here. |

The shell reads `manifest.json`, resolves which area + doc is active from the URL, fetches every source `.md` file that doc declares, strips per-file boilerplate, concatenates with a blank line between, runs marked with a small set of custom decorators, and renders under a sticky two-line topnav plus sidebar table of contents. Markdown stays authoritative. GitHub renders the same source files independently.

## Current state (2026-08-01)

The pattern is **one shell at repo root** — `index.html` and `manifest.json` at the top of a repo. The [Alex ACT Steward](https://github.com/fabioc-aloha/Alex_ACT_Steward) repo is the reference implementation; adopters include [CX-Vitals](https://github.com/fabioc-aloha/CX-Vitals) and [QuestionnaireFlow](https://github.com/fabioc-aloha/QuestionnaireFlow). Before 2026-07-28, an earlier iteration used three per-folder shells with a build script; that pattern was retired in favor of the single-root pattern. The starter at [`../../.github/skills/docs-shell/starter/`](../../.github/skills/docs-shell/starter/) ships the single-root pattern for adopters.

## Reading-surface policy

The shell intentionally does not render raw Markdown controls. The `.md` files remain the authoring source of truth, but the browser surface is for reading. Relative links to sources already registered in the manifest resolve to `?area=<id>&doc=<id>` and stay rendered. Unregistered files keep ordinary relative-link fallback behavior. Authors open source files through their editor or repository tree.

## Responsive and accessible behavior

- At widths up to 700px, area and document nav rows stay on one line and scroll horizontally. This keeps the sticky navigation compact without truncating labels.
- At widths up to 1100px, the TOC becomes static above the article and starts collapsed unless `localStorage` contains an explicit reader preference. An expanded narrow TOC is capped at 360px with internal scrolling, so it cannot stick over the article. The toggle and `[` shortcut still work.
- A keyboard-visible skip link moves focus to the rendered article. Active area and document links carry `aria-current="page"`; empty verification metadata is hidden.
- Copy buttons remain visible on keyboard focus and touch-first devices. `prefers-reduced-motion` disables the pulse, smooth scrolling, and transitions.
- Hero sizes use fixed responsive breakpoints rather than viewport-scaled type, and letter spacing remains zero.
- Long inline code and content can wrap without widening the page; fenced code blocks retain horizontal scrolling.

## URL scheme

The shell reads `?area=<id>&doc=<slug>` from the query string with cascading fallbacks:

| URL shape | Resolves to |
|---|---|
| `?area=plan&doc=mall` | Explicit area + doc |
| `?area=plan` | Area's `defaultDoc` |
| `?doc=mall` | Searches all areas for a doc with that id (back-compat with pre-unification URLs) |
| No parameters | Manifest's `defaultArea` → that area's `defaultDoc` |

## Manifest schema

Complete field-by-field walkthrough. Examples come from live implementations of the pattern (primarily [Alex_ACT_Steward](https://github.com/fabioc-aloha/Alex_ACT_Steward)'s `manifest.json`).

### Top-level

```json
{
  "$comment": "Optional. Not read by the shell. Useful for maintenance notes.",
  "brand": { "label": "Your Project", "href": "index.html" },
  "theme": { "light": { ... }, "dark": { ... } },
  "defaultArea": "plan",
  "areas": [ /* ... */ ]
}
```

| Field | Type | Required | Purpose |
|---|---|---|---|
| `$comment` | string | no | Maintenance note. Ignored by the shell. |
| `brand.label` | string | yes | Text shown in the brand slot on line 1 of the topnav. |
| `brand.href` | string | yes | Link target when the brand is clicked. Typically `"index.html"` or a README.md path. |
| `theme` | object | no | CSS custom property overrides. Absent = shell uses hardcoded defaults. See [Theme system](#theme-system) below. |
| `defaultArea` | string | yes | `id` of the area that loads when `?area=` is absent. Must match one entry in `areas[]`. |
| `areas` | array | yes | Non-empty list of area definitions. See [Areas](#areas) below. |

### Areas

Each area becomes a button on line 1 of the topnav. Areas group related documents (for example, [Alex_ACT_Steward](https://github.com/fabioc-aloha/Alex_ACT_Steward) has three: `plan`, `docs`, `operations`).

```json
{
  "$comment": "One area. `folder` is cosmetic — source paths live in each doc's `sources[]`.",
  "id": "plan",
  "label": "Plan",
  "folder": "plan",
  "defaultDoc": "about",
  "docs": [ /* ... */ ]
}
```

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | string | yes | URL slug for `?area=<id>`. Must be unique across areas. |
| `label` | string | yes | Button text on line 1. |
| `folder` | string | no | Cosmetic label. Doesn't drive fetches; source paths in each doc are relative to the manifest. |
| `defaultDoc` | string | yes | `id` of the doc that loads when `?doc=` is absent. Must match one entry in this area's `docs[]`. |
| `docs` | array | yes | Non-empty list of doc definitions. See [Docs](#docs) below. |

### Docs

Each doc becomes a button on line 2 of the topnav (when its area is active) and drives a single render pass.

```json
{
  "id": "mall",
  "label": "Mall Plan",
  "icon": "🛒",
  "title": "Mall Plan — role + modernization",
  "verified": "Phase 0 closed 2026-07-27 (ADR-014)",
  "hero": { /* ... */ },
  "sources": [ "plan/mall/README.md" ]
}
```

| Field | Type | Required | Purpose |
|---|---|---|---|
| `id` | string | yes | URL slug for `?doc=<id>`. Must be unique within the area. |
| `label` | string | yes | Button text on line 2. Keep short. |
| `icon` | string | no | Single emoji character shown in the sticky page-title header. Empty or absent = no icon (collapses via `:empty`). Emoji only. |
| `title` | string | yes | Big page title + browser `<title>` tag. |
| `verified` | string | no | Provenance line under the title (e.g. `"Updated 2026-07-28"`). |
| `hero` | object | no | Hero block. Absent = no hero rendered. See [Hero](#hero) below. |
| `sources` | array | yes | Ordered list of source paths, relative to the manifest (repo root for the root shell). `.md` sources are fetched in parallel, stripped, concatenated with `\n\n`, and rendered through marked. `.html` sources trigger a direct-link path; see [HTML-source docs](#html-source-docs-bypass-shell-wrapper) below. |

### HTML-source docs (bypass shell wrapper)

When every entry in a doc's `sources[]` array ends in `.html` (case-insensitive), the shell treats that doc as a **standalone HTML report** and bypasses the shell wrapper entirely. Two code paths change:

**Topnav render**: the button on line 2 for an HTML-only doc points its `href` directly at `sources[0]` instead of `?area=X&doc=Y`. Clicking it loads the HTML file straight from disk / origin, no shell fetch, no marked pass.

**Bootstrap**: if the URL lands on `?area=X&doc=Y` where Y is HTML-only (bookmark, external link, stale search-index entry), the shell calls `window.location.replace(sources[0])` before rendering anything. `replace` rather than `assign` so the back button skips the shell hop and returns to whatever the user was doing before.

**When to use**: pre-built reports that already own their own cover, hero, typography, print styles, and layout. Flint chart reports, exported Power BI dashboards, static HTML tables, offline copies of external pages, or anything else where the presentation is already the final artifact and shell wrapping would fight it.

**When NOT to use**: content that IS the source of truth for a shell-styled doc. If you own the Markdown and want the shell's headings, sidebar TOC, alert callouts, Mermaid, and code highlighting, ship `.md` sources and let the shell handle presentation. The HTML path exists for content the shell would render worse than the report already renders itself.

**Design rationale**: an earlier iteration in [CX-Vitals](https://github.com/fabioc-aloha/CX-Vitals) (commit `1098dd1`, 2026-07-28) rendered HTML sources in an iframe wrapper. Four minutes later, commit `0a341d8` switched to direct link, because reports carry their own hero + cover + print styles and iframe wrapping added a redundant frame that broke print flow and forced height math into the shell. Direct link + `location.replace` gives the report the whole viewport it was designed for while keeping the shell as the navigation surface.

**Rules**:

- `sources[]` must be non-empty.
- Every entry must end in `.html` (case-insensitive) for direct-link behavior to fire.
- Mixed sources (`.md` + `.html`) fall through to the Markdown render pass, which would try to concat the HTML as text. Keep the two shapes in separate doc entries.
- The topnav still shows the doc's `label` and applies active-state styling on the currently loaded doc; only `href` and the bootstrap flow change.
- Optional doc fields (`icon`, `title`, `verified`, `hero`) survive in the manifest but are not rendered by the shell (the standalone HTML owns its own hero). Keep them for consistency and for future indexing or search use.

A working demo ships in the starter kit at `.github/skills/docs-shell/starter/example-report.html`. Absorbed into the canonical starter on 2026-07-29.

### Hero

The hero block sits between the sticky page-title header and the body content. It carries the doc's Big Idea, a one-sentence thesis authored via Steward's [big-idea skill](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/.github/skills/big-idea/SKILL.md).

```json
{
  "eyebrow": "Ch 05 · Mall Plan",
  "title": "Mall Plan",
  "subtitle": "Path A in-place bump to 3.0.0; no v2 fork per ADR-014.",
  "description": "Optional metadata not rendered by default."
}
```

| Field | Type | Required | Purpose |
|---|---|---|---|
| `eyebrow` | string | no | Small uppercase pill above the title. Good for chapter numbers, breadcrumbs, or status tags. |
| `title` | string | yes | Big display heading. Often mirrors `doc.title` but can be shorter. |
| `subtitle` | string | no | One-sentence Big Idea. Rendered as a smaller `<span>` under the title. Authored per [big-idea skill](../../.github/skills/big-idea/SKILL.md). |
| `description` | string | no | Optional metadata (provenance, cross-refs, methodology notes). **Not rendered by default since 2026-07-28.** The field survives so adopters can re-enable rendering, and for potential future indexing / search use. To re-enable, uncomment the description-render line in `renderHero()`. |

Two optional hero features have CSS in place but no default renderer:

- `hero.chips[]` for meta-chips (read-time, version, status pills). Add the field per doc and extend `renderHero()` to inject `<div class="hero-chips">` with `<span class="chip">` children.
- `hero.actions[]` for CTA buttons. Each entry `{ label, href, primary? }`. Extend `renderHero()` similarly.

## Two-line topnav

The shell renders a two-row sticky nav:

- **Line 1**: brand slot (label + optional icon) followed by area buttons.
- **Line 2**: documents of the currently active area.

The active button on each line gets `.active` styling (background tint + `font-weight: 600`).

### Brand slot with optional icon

Some root shells render an SVG icon alongside the label (Alex_ACT_Steward is an example):

```html
<a class="topnav-brand" id="topnav-brand" href="README.md">
  <img class="topnav-brand-icon" src="assets/copilot-brand.svg" alt="" aria-hidden="true" />
  <span class="topnav-brand-label">Your Project</span>
</a>
```

The example icon is Steward-specific. Adopters using the starter kit can either delete the `<img>` line for a text-only brand, or drop their own SVG (or PNG) into `assets/` and update the `src`. The CSS class `.topnav-brand-icon` sizes it at 22×22 with a small right-side gap.

### Per-doc emoji icon in the sticky page-title header

Each doc entry can carry an `icon` field with a single emoji. The shell renders it at 22px alongside the page title:

```html
<h1 id="page-title">
  <span class="page-title-icon">🛒</span>
  <span class="page-title-label">Mall Plan</span>
</h1>
```

The `:empty` selector on `.page-title-icon` collapses the span when the icon is missing so the title stays flush left. Emoji rendering uses the platform stack (Apple Color Emoji / Segoe UI Emoji / Noto Color Emoji).

## Sticky offsets managed by CSS custom properties

The two-row nav plus the page-title header take variable vertical space depending on viewport width and label wrapping. `updateNavHeightCssVar()` measures the actual rendered heights at bootstrap and on every window resize, then publishes three CSS custom properties:

| Property | Meaning |
|---|---|
| `--nav-height` | Height of `nav.topnav`. Used by `header.page { top: var(--nav-height) }` so the page-title header sits directly below the nav. |
| `--page-header-height` | Height of `header.page`. Available for adopters. |
| `--sticky-offset` | Sum of the two, used by the sidebar TOC's `sticky top` so it doesn't slide under the nav+header stack. |

The `html { scroll-padding-top: calc(var(--nav-height, 78px) + 60px); }` rule uses the same custom property to offset anchor scrolls. The fallback (`78px`) covers the initial paint before JS runs.

## Theme system

`manifest.theme.light` and `manifest.theme.dark` are optional maps of CSS custom properties. `applyManifestTheme()` reads them and injects a `<style id="manifest-theme">` block at the end of `<head>` so it overrides the hardcoded defaults earlier in the file.

Adopters bring their own palette. For example, Alex_ACT_Steward uses the Alex product identity (emerald on deep slate) per its [BRAND-KIT.md](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/docs/branding/BRAND-KIT.md); the full override map lives in the root manifest:

```json
"theme": {
  "light": {
    "--accent": "#10b981",
    "--accent-emphasis": "#047857",
    "--fg": "#0f172a",
    "--fg-muted": "#475569",
    "--bg-subtle": "#f8fafc",
    "--code-bg": "#f1f5f9"
  },
  "dark": {
    "--accent": "#34d399",
    "--accent-emphasis": "#6ee7b7",
    "--fg": "#f8fafc",
    "--bg": "#0f172a",
    "--bg-subtle": "#1e293b"
  }
}
```

### Value guard (safety)

The theme injector accepts only:

- Keys matching `/^--[a-zA-Z0-9-]+$/` (CSS custom property syntax).
- Values matching `/^(?:#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%/]+\)|hsla?\([\d.,\s%/]+\)|[a-zA-Z]+(?:\s*,\s*[\d.]+)?)$/` (hex / rgb / rgba / hsl / hsla / named colors).

Anything else is silently dropped. An untrusted manifest cannot smuggle arbitrary CSS through this path. Absent or malformed `theme` block = no-op; the hardcoded `:root` defaults win.

### Every property you can override

Every custom property declared in `:root` inside `index.html` is overridable. The full list (both light and dark blocks):

```text
--fg, --fg-muted, --fg-subtle,
--bg, --bg-subtle, --bg-elevated,
--border, --border-muted,
--accent, --accent-emphasis, --accent-fg,
--success, --success-emphasis, --success-bg, --success-border,
--attention, --attention-emphasis, --attention-bg, --attention-border,
--danger, --danger-emphasis, --danger-bg, --danger-border,
--note-bg, --note-border,
--purple, --purple-bg,
--github-dark,
--code-bg, --mermaid-bg,
--shadow-sm, --shadow-md,
--radius, --radius-lg
```

Adopters typically override just `--accent`, `--accent-emphasis`, and the neutrals (`--fg`, `--bg`, `--bg-subtle`). Semantic colors (`--success`, `--attention`, `--danger`) usually stay at their GitHub Primer defaults for accessibility.

## Rendering pipeline

Bootstrap sequence at the bottom of the shell's `<script>` block:

1. Fetch `manifest.json`.
2. Apply theme overrides.
3. Resolve current context (`{ area, doc }`) from the URL.
4. Render the two-line topnav.
5. Render the sticky page-title header.
6. Render the hero.
7. Measure sticky heights and publish CSS custom properties.
8. Fetch every source `.md` in parallel.
9. Strip frontmatter, nav-strips, banner-strips.
10. Rewrite relative links with the source's base directory.
11. Concatenate with `\n\n` between sources.
12. Parse via marked (with a custom code renderer that turns `mermaid` fences into `<div class="mermaid">`).
13. Sanitize parsed HTML through DOMPurify before DOM insertion. Active-content tags, form controls, and event-handler attributes are forbidden; sanitizer failure blocks rendering.
14. Insert sanitized HTML and decorate: heading anchors, hardened external links, scroll-wrapped tables, alert blockquotes, accessible code-copy buttons, TOC.
15. Initialize Mermaid last in `strict` security mode (a render failure never blocks the TOC).

CDN dependencies pinned in `<head>`:

- `marked@12.0.0`
- `dompurify@3.2.6`
- `mermaid@11.4.0`
- `highlight.js@11.9.0`

Every CDN stylesheet and script carries a verified SHA-384 `integrity` value plus `crossorigin="anonymous"`. Version pinning controls the requested release; SRI controls the exact bytes that may execute.

### Markdown security boundary

The render order is non-negotiable: marked → DOMPurify → DOM insertion → Mermaid. DOMPurify removes scripts, styles, frames, embedded objects, forms, interactive form controls, and event-handler attributes while preserving ordinary HTML and inline SVG. Links opened in a new tab receive `rel="noopener noreferrer"`. If DOMPurify does not load or sanitization fails, the shell renders an error state instead of falling back to raw `innerHTML`.

## Auto-stripping from source markdown

Before rendering, `loadMarkdown()` removes three per-file blocks:

| Pattern | Purpose |
|---|---|
| Leading YAML frontmatter (`---\n...\n---\n`) | LLM-only metadata (description, lastReviewed, source). GitHub shows it; shell hides it. |
| `<!-- nav-strip --> ... <!-- /nav-strip -->` | Per-file navigation lines that would duplicate in concat view. |
| `<!-- banner-strip --> ... <!-- /banner-strip -->` | Per-file banner images that would duplicate. |

Content docs may (and often should) keep frontmatter and nav-strips. GitHub honors them; the shell strips them cleanly.

## Path rewriting

When a source lives in a subfolder (e.g. `plan/mall/README.md`), any relative link inside that source needs its base directory prepended so it still resolves once the shell renders it. `rewriteRelativeLinks()` prepends the base dir to:

- Markdown links: `[text](path)` and `![alt](path)`.
- Inline HTML: `href="..."` and `src="..."` (double or single quoted).

Skipped:

- Absolute URLs (`http://`, `https://`).
- Protocol-scoped (`mailto:`, `tel:`, `data:`, `javascript:`).
- Anchor-only (`#foo`).
- Root-relative (`/foo`).

### Manifest-source routing

`shellRoute()` compares each relative Markdown target with every source registered in the manifest. A match becomes `?area=<area>&doc=<doc>` and stays inside the rendered shell. Unregistered files retain normal relative-link fallback behavior.

## Alert callouts

Five GitHub-flavored callout types, styled by the shell:

```markdown
> [!NOTE]
> Informational callout.

> [!TIP]
> Positive callout.

> [!IMPORTANT]
> High-priority callout.

> [!WARNING]
> Caution callout.

> [!CAUTION]
> Danger callout.
```

Emoji-prefixed blockquotes also work (`⚠️`, `ℹ️`, `✅`, `❌`). The shell picks up the leading emoji and applies matching border and background colors.

## Mermaid diagrams

Fenced code blocks tagged ` ```mermaid ` get converted to `<div class="mermaid">` during parse, pass through DOMPurify as escaped diagram text, and render via `mermaid.run()` at the end of bootstrap. Mermaid runs with `securityLevel: "strict"`; dark mode is detected via `prefers-color-scheme` and applied to the theme.

After rendering, `fitMermaidDiagrams()` replaces Mermaid's often oversized viewBox with the actual root graph bounds plus 16–32px padding. It then derives one ideal width from the cropped viewBox and the source font size, targeting readable 16px labels. Compact diagrams shrink-wrap with their frame instead of stretching to page width. A diagram receives contained horizontal scrolling only when it cannot preserve a 13px desktop or 11px mobile label floor within the available width.

The fitter is deliberately single-pass. Do not read rendered label measurements and repeatedly expand the viewBox: layout may not have repainted yet, so stale measurements can enlarge the SVG viewport while leaving the graph tiny inside it. Refactor dense source from `LR`/`RL` to `TD`, shorten labels, or split the graph first. Runtime fitting removes viewport waste; source design still owns density and horizontal structure.

## Syntax highlighting

Any code fence with a language tag known to highlight.js gets styled (`javascript`, `python`, `powershell`, `bash`, `json`, `yaml`, `html`, `css`, and dozens more). Unrecognized language tags render as plain preformatted text.

Each `<pre>` block also gets a Copy button that copies the code content to the clipboard.

## Sidebar table of contents

`buildTOC()` walks every H1/H2/H3 in the rendered content, generates a slug matching marked's anchor scheme, and populates the sidebar. The TOC is collapsible via a toggle button at the top; state persists in `localStorage` under a key scoped to the shell path.

The TOC's `sticky top` uses `--sticky-offset` so it clears the two-row nav plus the page-title header on all viewport widths.

## Optional features (CSS ready, renderer opt-in)

Four features have CSS in place but no default renderer. Adopters can enable each by extending the corresponding render function:

| Feature | CSS class | Manifest field | To enable |
|---|---|---|---|
| Hero chips | `.hero-chips`, `.chip` | `hero.chips[]` | Extend `renderHero()` to inject `<div class="hero-chips">` with `<span class="chip">` children. |
| Hero CTA buttons | `.hero-actions`, `.btn`, `.btn-primary` | `hero.actions[]` (each entry `{ label, href, primary? }`) | Extend `renderHero()` to inject `<div class="hero-actions">` with `<a class="btn">` (or `.btn-primary`) children. |
| Hero description | (already styled) | `hero.description` | Uncomment the description-render line in `renderHero()` and restore the `<p id="hero-subtitle">` element in `<section class="hero">`. |
| QuickJumps in topnav | `.topnav-jumps a[data-nav]` | `quickJumps[]` (per-area or root) | Uncomment the `topnav-jumps` render block in `renderTopnav()` and add a `<ul id="topnav-jumps">` element under `.topnav-inner`. |

The starter kit renders quickJumps by default (its topnav is single-line with a jumps slot on the right). Adopters who don't want quickJumps can leave the array empty.

## Adopting the shell in another project

The starter kit at [`../../.github/skills/docs-shell/starter/`](../../.github/skills/docs-shell/starter/) is a ready-to-adopt four-file bundle:

```text
starter/
├── index.html      Full working shell (equivalent to a reference implementation like Alex_ACT_Steward's root shell).
├── manifest.json   Minimal single-area, single-doc example with copious $comment fields.
└── about.md        Working demo content with alerts, mermaid, and code samples.
```

**To adopt**:

1. Copy the three files into your project's docs folder (or repo root for a top-level shell).
2. Edit `manifest.json`:
    - Change `brand.label` to your project name.
    - Optionally add or remove theme overrides.
    - Add your own `docs[]` entries with `id`, `label`, `title`, `hero`, `sources`.
    - Add more `areas[]` entries if you want multi-area two-line-nav.
3. Optionally drop your own brand icon at `assets/<name>.svg` and update the `<img src="...">` line in `index.html` (or delete the line for text-only brand).
4. Open `index.html` in Copilot's internal browser, VS Code Simple Browser, or a local HTTP server.

The `$comment` fields in the starter manifest walk through every non-obvious choice.

## Local rendering

Three ways to view the shell locally, in order of least ceremony:

1. **Ask Copilot to open it in the internal browser.** `open_browser_page` launches a Playwright-driven Chromium with `file://` fetches permitted, so the shell renders directly from disk with no server. Documented in [`../../.github/skills/browser-tools/SKILL.md`](../../.github/skills/browser-tools/SKILL.md).
2. **VS Code Simple Browser.** Also allows `file://` fetches. Command palette → `Simple Browser: Show` → paste the `file:///c:/...` URL.
3. **Local HTTP server.** Required for any external browser (Chrome, Firefox, Edge, Safari) since those block `file://` cross-file fetches for security. Also required for realistic HTTP status codes or service worker behavior.

    ```powershell
    python -m http.server 8080
    # Then open http://localhost:8080/index.html
    ```

    VS Code's Live Preview extension is a lighter alternative to the Python server.

Deep-link to a specific doc by appending `?area=<id>&doc=<slug>`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Raw YAML frontmatter renders at the top of a doc | Frontmatter block malformed (missing closing `---`) | Fix the frontmatter delimiters in the source `.md`. |
| Nav-strip line renders on the shell page | Missing `<!-- /nav-strip -->` closing marker | Add the closing marker. Regex needs both. |
| Doc button on line 2 doesn't switch content | `id` mismatch between button click and `docs[]` entry | Confirm the `?doc=` value matches the entry's `id`. |
| Hero missing | `hero` block missing or `hero.title` empty | Add the `hero` block with at least `title`. |
| Body links resolve to wrong path | Source lives in a subfolder but paths in the source assume its own folder | Confirm `rewriteRelativeLinks()` is running. Only skipped for absolute URLs, anchors, and root-relative paths. |
| Theme override doesn't apply | Key not `--` prefixed, or value fails the guard | Confirm the CSS custom property syntax and use hex / rgb / hsl / named colors. |
| External browser shows "Failed to fetch" | `file://` cross-file fetches blocked | Launch `python -m http.server 8080` in the shell folder and open `http://localhost:8080/`. |
| Sticky page-title header overlaps content on narrow viewports | `--sticky-offset` stale | Trigger a resize event (or check that `updateNavHeightCssVar()` fires on load). |

## Cross-links

- [`../../.github/skills/docs-shell/SKILL.md`](../../.github/skills/docs-shell/SKILL.md) — concise skill body invoked by the parent agent
- [`../../.github/skills/docs-shell/starter/`](../../.github/skills/docs-shell/starter/) — the three-file starter kit adopters copy
- Example brand kit: [Alex_ACT_Steward BRAND-KIT.md](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/docs/branding/BRAND-KIT.md) — the Alex product palette (emerald on deep slate) that the reference implementation uses
- Related skill (in Alex_ACT_Steward baseline): [big-idea](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/.github/skills/big-idea/SKILL.md) — how to author `hero.subtitle` copy
- Historical unification notes: [Alex_ACT_Steward curation-log](https://github.com/fabioc-aloha/Alex_ACT_Steward/blob/main/operations/ledgers/curation-log.md) — 2026-07-27 folder-shell unification, 2026-07-28 hero-description retirement

<!-- nav-strip -->
**Illustrator Plugin · docs-shell reference** · [▲ Docs index](../README.md) · [Skill body](../../.github/skills/docs-shell/SKILL.md) · [Starter kit](../../.github/skills/docs-shell/starter/)
<!-- /nav-strip -->
