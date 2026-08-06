---
name: docs-shell
description: "The single-page HTML shell (index.html + manifest.json at repo root) that renders concatenated markdown as browsable, GitHub-styled documentation with a two-line topnav, per-doc emoji icons, sticky page header, and sidebar TOC. Use when the user says 'shell', 'add a doc', 'add a chapter', 'landing page', 'sidebar', 'manifest', 'hero', 'nav-strip', 'shell theme', 'color scheme', 'polish the pages', 'render preview', 'add an area', or when authoring/editing content that appears in the root manifest. Also invoke when the shell misrenders (raw frontmatter visible, links broken across folders, missing hero, doc button not switching content, sticky header overlap)."
lastReviewed: 2026-08-01
---

# docs-shell skill

Load-on-demand pointer for the parent agent. Full technical reference lives at [`../../../docs/shell/README.md`](../../../docs/shell/README.md); this file carries the essentials so the agent can reason about the shell without re-reading the reference every time.

> **Adopting the shell in another project?** Go straight to [`../../../docs/shell/README.md § Adopting the shell in another project`](../../../docs/shell/README.md#adopting-the-shell-in-another-project). The starter kit at [`starter/`](starter/) alongside this file is the copy-paste bundle.

## When to invoke

Fire this skill when any of these appears in the user's request:

- **Shell operations**: "shell", "index.html", "manifest", "landing page", "sidebar", "hero", "quickJump"
- **Add or edit content**: "add a doc", "add an area", "add a chapter", "new page", "polish the pages"
- **Rendering issues**: "raw frontmatter showing", "link broken in shell", "nav duplicated", "hero missing", "doc button not switching"
- **Theme / UX**: "color scheme", "dark mode", "shell theme", "re-theme", "layout"
- **Cross-navigation**: "?area=", "?doc=", "deep link", "URL scheme"

Do NOT fire when:

- The user is editing content of an existing doc and the change does not affect manifest, hero, or nav-strip.
- The user asks about pre-rendered `*.html` artifacts outside the shell folder.

## The 90% mental model

**One shell at repo root.** `index.html` and `manifest.json` are the two files. An older per-folder pattern (three shells + three manifests + build script) was retired 2026-07-28.

**Manifest drives everything.** The shell reads `manifest.json` on load and renders whatever it declares. No filesystem discovery. Adding a doc = one JSON entry, no HTML changes.

**Markdown stays authoritative.** MD files are the shell's primary source: fetched, concatenated, decorated. The shell is a viewer; never generate HTML *from* markdown into the repo. Pre-built HTML reports (Flint chart output, exported dashboards, tabular reports) are supported as an escape hatch: doc entries whose `sources[]` are all `.html` link directly to the file instead of being wrapped by the shell. See "Add an HTML-source doc" under Common tasks.

**Two-line topnav.** Line 1 = brand slot + area buttons. Line 2 = documents of the active area. URL scheme is `?area=<id>&doc=<slug>` with cascading fallbacks (see reference for the full table).

**Rendered reading surface.** The shell does not expose raw Markdown controls. Relative links to sources already registered in the manifest route to their rendered shell pages; source files remain authoritative for authors. Parsed Markdown passes through DOMPurify before insertion, and Mermaid runs afterward in strict mode. CDN assets are exact-version and SHA-384 pinned. On narrow screens, both nav rows scroll horizontally instead of growing into multiple rows; the TOC becomes static, defaults collapsed unless the reader saved a preference, and caps expanded height at 360px so it cannot overlap content. Keyboard users get a skip link, accessible heading permalinks, visible focus states, and `aria-current` on active navigation. Touch users can always reach live copy feedback, and reduced-motion preferences disable animation and smooth scrolling. After Mermaid renders, the shell crops once to graph bounds, derives a natural width from the cropped viewBox and source font size, and shrink-wraps compact diagrams instead of stretching every SVG to page width. Contained scrolling is reserved for diagrams that cannot preserve a 13px desktop or 11px mobile label floor inside the available width.

## Manifest schema, essential fields

```json
{
  "brand": { "label": "…", "href": "index.html" },
  "theme": { "light": { "--accent": "#…" }, "dark": { "--accent": "#…" } },
  "defaultArea": "plan",
  "areas": [
    {
      "id": "plan",
      "label": "Plan",
      "folder": "plan",
      "defaultDoc": "about",
      "docs": [
        {
          "id": "mall",
          "label": "Mall Plan",
          "icon": "🛒",
          "title": "Mall Plan — role + modernization",
          "verified": "Phase 0 closed 2026-07-27",
          "hero": {
            "eyebrow": "Ch 05 · Mall Plan",
            "title": "Mall Plan",
            "subtitle": "Path A in-place bump to 3.0.0; no v2 fork per ADR-014."
          },
          "sources": ["plan/mall/README.md"]
        }
      ]
    }
  ]
}
```

Per-doc `icon` is an optional single emoji shown in the sticky page-title header. Empty or absent collapses via CSS `:empty`.

Per-doc `hero.subtitle` is the Big Idea (one-sentence thesis). `hero.description` is optional metadata preserved in the manifest but not rendered by default since 2026-07-28.

Source paths are relative to the manifest (repo root for the root shell).

Full field-by-field walkthrough (types, required flags, purpose): [`../../../docs/shell/README.md § Manifest schema`](../../../docs/shell/README.md#manifest-schema).

## What the shell auto-strips from source markdown

Before rendering, `loadMarkdown()` removes three per-file blocks:

1. **Leading YAML frontmatter** — regex `^---\r?\n[\s\S]*?\r?\n---\r?\n?`. LLM-only metadata.
2. **Nav-strips** — regex `<!-- nav-strip -->[\s\S]*?<!-- \/nav-strip -->\s*`. Per-file navigation that would duplicate in concat view.
3. **Banner-strips** — same mechanism for banner images.

Content docs may (and often should) keep frontmatter and nav-strips. GitHub honors them; the shell strips them cleanly.

## Theme system

`manifest.theme.light` and `manifest.theme.dark` are optional maps of CSS custom properties. Absent = shell uses hardcoded defaults. Present = shell injects a `<style>` block with the declared vars, overriding the defaults. The injector accepts only `--`-prefixed keys with hex / rgb / hsl / named-color values so an untrusted manifest cannot smuggle arbitrary CSS.

Full override list at [`../../../docs/shell/README.md § Every property you can override`](../../../docs/shell/README.md#every-property-you-can-override).

## Read aloud

The shell reads the rendered page using the browser's built-in Web Speech API.
No network call, no API key, no dependency — the browser owns the voice, so
quality varies by host and the shell does not try to hide that.

| Piece | Where |
| --- | --- |
| Controls | `#topnav-listen` in the second nav row: play/pause `#listen-toggle`, settings gear `#listen-settings`. Two buttons, not three — see below |
| Settings popover | `#listen-panel` — voice `<select>`, speed `<input type="range">` (0.6–1.6), and a `#listen-hint` line naming what the host actually offers |
| Announcements | `#listen-status`, an `.sr-only` `role="status"` live region |
| Logic | `setupReadAloud()`, called from the bootstrap sequence |

Behavior worth knowing before you change it:

- **Chunked playback.** Chromium stalls silently on long utterances, so the page
  is split per block and advanced one piece at a time. Each chunk carries a
  length-derived timeout as a backstop, because Chromium can drop an utterance
  without ever firing `onend`. A period only ends a sentence when a space
  follows it and the preceding word is not a known abbreviation, so `0.9.0`,
  `README.md`, and "vs." are not read as three sentences. A sentence with no
  internal boundary is word-wrapped rather than sent long.
- **Skips what does not survive being read.** Tables, code blocks, Mermaid
  diagrams, and inline SVG are announced (`Table with 6 rows, skipped.`) rather
  than spoken, because a table read cell by cell is noise and a code block is
  worse. Nav strips are dropped silently as chrome. Bare URLs become "link".
  Inline code becomes "code" only when it is both longer than
  `INLINE_CODE_MAX` and punctuation-dense: a CSS selector collapses, a long
  path or identifier does not, because the path carries more than the word
  "code" does. Every chunk is then checked after splitting, so a stray table
  pipe or a fragment that is nothing but a placeholder never reaches the voice.
  Set `SPEAK_SKIP_MARKERS = false` for silent skipping instead of announced.
- **Voice ranking.** `populateVoices()` prefers whatever neural voice the host
  exposes (on Windows the `Microsoft … Natural` set) and demotes basic system
  voices, which are markedly worse for long-form prose.
- **The reader's choice persists.** Voice and speed are saved to
  `localStorage` under `alexact.readaloud`. Changing either while playing
  restarts the current chunk rather than the whole page.
- **Graceful absence.** A host with no voices disables the control and says so
  in `#listen-hint` instead of failing silently.
- **Speech outlives the document.** `pagehide` and `beforeunload` both cancel,
  or navigating away leaves the page talking.
- **No stop button.** Play/pause carries the whole interaction and a third
  button was not earning its width in the nav. `stopAll()` still exists and
  still runs on page finish, doc switch, and unload; `Escape` reaches it.
- **`[hidden]` needs restating.** Both `.topnav-listen` and `.listen-panel`
  carry an author `display` rule, which outranks the user-agent
  `[hidden] { display: none }` rule. Without an explicit
  `.listen-panel[hidden] { display: none; }` the popover renders permanently
  open while `panel.hidden` reports `true`, so the script looks correct and
  the page is visibly wrong. Keep that rule if you restyle the panel.

### Settings popover dismissal

The popover overlaps the content, so it is aggressive about getting out of the
way. Three separate paths close it, and the idle timer is deliberately shorter
while speaking:

| Trigger | Result |
| --- | --- |
| Reader starts or resumes playback | Closes immediately — they are done configuring |
| Idle while playing | Auto-closes after `PANEL_IDLE_PLAYING_MS` (4s) |
| Idle while stopped or paused | Auto-closes after `PANEL_IDLE_STOPPED_MS` (12s) |
| Click outside, gear again, or `Escape` | Closes |

Two guards keep this from being hostile. Any interaction inside the panel
(`pointermove`, `input`, `change`, `focusin`, and siblings) restarts the idle
clock, and the auto-close **defers** rather than fires while focus is inside the
panel, so a keyboard user is never interrupted mid-adjustment. When a close does
steal focus from inside the panel, focus returns to the gear button rather than
falling to `<body>`.

Keyboard: `L` toggles play/pause from anywhere outside a form field. `Escape`
backs out one layer at a time — it closes the popover if the popover is open,
and otherwise stops playback.

## Common tasks

### Add a chapter to an existing doc

1. Create the `.md` file (path relative to repo root).
2. Append its path to the target doc's `sources[]` array in the root manifest. Order = concat order.
3. Reload the shell — no build step.

### Add a new doc

1. Create the `.md` file(s).
2. Append a `docs[]` entry to the target area with `id`, `label`, optional `icon`, `title`, optional `verified`, optional `hero`, and `sources[]`.
3. Reload.

### Add a new area

1. Append an entry to the top-level `areas[]` with `id`, `label`, optional `folder`, `defaultDoc`, and a non-empty `docs[]`.
2. Consider whether to bump `defaultArea` if this new area should be the landing.
3. Reload.

### Add an emoji icon to a doc

Add `"icon": "🛒"` (single emoji character) to the doc entry. Rendered at 22px in the sticky page-title header.

### Retheme

Edit `manifest.theme.light` and `manifest.theme.dark`. Most adopters override just `--accent`, `--accent-emphasis`, and the neutrals (`--fg`, `--bg`, `--bg-subtle`). Semantic colors (`--success`, `--attention`, `--danger`) usually stay at their GitHub Primer defaults for accessibility.

### Fix a broken cross-folder link in a source

The shell prepends the source's base directory to relative links via `rewriteRelativeLinks()`. If a link doesn't resolve, confirm the source path in `sources[]` includes the full folder prefix (e.g. `plan/mall/README.md`, not just `README.md`), and check that the link isn't accidentally root-relative (`/foo`) when it should be relative (`foo`).

### Add an HTML-source doc (Flint report, exported dashboard)

For a doc whose `sources[]` are all `.html` files, the shell links the topnav button DIRECTLY at the file instead of injecting into the shell wrapper. Useful for reports that own their own cover, hero, typography, and print styles.

1. Drop the HTML file(s) at a path relative to the manifest (typically alongside your `.md` sources).
2. Append a doc entry to the target area's `docs[]` with `id`, `label`, optional `icon`, `title`, and `sources` set to the HTML file path(s):

   ```json
   {
     "id": "report",
     "label": "Sales report",
     "icon": "📊",
     "title": "Sales by region, Q4",
     "sources": ["reports/sales-q4.html"]
   }
   ```

3. Reload. Clicking the topnav button loads the HTML directly; the browser back button returns to whatever came before (the shell uses `location.replace` when redirecting, so the shell URL doesn't stack in history).

**Rule**: `sources[]` must be non-empty AND every entry must end in `.html` (case-insensitive) for direct-link behavior to fire. Mixed sources (`.md` + `.html`) fall through to the Markdown render pass, which would try to concat the HTML as text; keep the two shapes in separate doc entries.

Full rationale + design notes: `docs/shell/README.md` § HTML-source docs.

## Anti-patterns

| Anti-pattern                                   | Correction                                                                                                                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editing the shell HTML to add a doc            | Docs are declared in `manifest.json`. HTML changes belong in the shell only when adding a new render behavior (chips, actions, brand icon).                                  |
| Generating a static HTML file for a doc        | The shell IS the renderer. Just add the source `.md` to a `docs[]` entry's `sources[]`.                                                                                      |
| Copying `manifest.json` into a subfolder       | The root manifest is the single source of truth. Sub-manifests were retired 2026-07-28.                                                                                      |
| Duplicating the shell's CSS into a `.md` file  | Content docs are semantic markdown. The shell owns the visual layer.                                                                                                         |
| Rendering hero copy that reads as AI marketing | `hero.subtitle` is the Big Idea. If "important" or "central" substitutes without loss, the subtitle is decorative.                                                           |
| Adding an emoji icon that reads as decoration  | The `icon` field is optional. Empty or absent collapses cleanly. Use it when the icon reinforces the doc's identity (a shopping cart for Mall Plan).                         |
| Leaving the read-aloud popover open during playback | It overlaps the content it is reading. Playback start closes it, and the idle timer closes it. Do not remove either path without replacing it. |
| Shipping a bundled TTS voice or a cloud speech call | The Web Speech API is the whole point: no key, no network, no dependency. Host voice quality is the host's business — report it in `#listen-hint`, do not paper over it. |
| Verifying a show/hide change by asserting `element.hidden` | The property flips even when an author `display` rule keeps the element painted. Assert `getComputedStyle(el).display` or the bounding box instead, on a freshly loaded page. |
| Reading a table aloud cell by cell | Row text joined with commas is not prose. Skip the table and announce it so the listener knows to look at the screen. |
| Collapsing inline code on length alone | A long path still reads better than the word "code", and an element whose whole text is one code span collapses to a chunk that says nothing. Gate on punctuation density, then drop placeholder-only fragments. |

## Optional features (CSS ready, opt-in)

| Feature                                         | Where                                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Hero chips (`hero.chips[]`)                     | Reserved CSS `.hero-chips` / `.chip`. Extend `renderHero()` to enable.                                                     |
| Hero CTA buttons (`hero.actions[]`)             | Reserved CSS `.hero-actions` / `.btn`. Extend `renderHero()` to enable.                                                    |
| Hero description paragraph (`hero.description`) | Preserved in manifest, not rendered by default. Uncomment the description line in `renderHero()` to re-enable.             |
| QuickJumps in topnav (`quickJumps[]`)           | Reserved CSS. Some root shells keep line 1 minimal (areas only); the starter kit renders quickJumps for adopters who want them. |

See [`../../../docs/shell/README.md § Optional features`](../../../docs/shell/README.md#optional-features-css-ready-renderer-opt-in) for enable steps.

## Starter kit for adopters

Three files at [`starter/`](starter/):

```text
starter/
├── index.html      Full working shell with quickJumps rendered by default, built-in read-aloud, and the brand-icon <img> left commented out for adopters to enable.
├── manifest.json   Minimal single-area, single-doc example. Every non-obvious choice has an inline $comment.
└── about.md        Working demo content with alerts, mermaid, syntax-highlighted code samples, and quickJump examples.
```

To adopt: copy the three files into the destination project, edit `manifest.json` (change `brand.label`, add or remove theme overrides, add `docs[]` entries), and open `index.html` in a browser. Full walkthrough at [`../../../docs/shell/README.md § Adopting the shell in another project`](../../../docs/shell/README.md#adopting-the-shell-in-another-project).

## Falsifiability

Revise this skill by **2026-10-29** (90 days) or sooner if any of the following fires:

- A live root shell diverges from the starter's `index.html` such that copying the starter into another project no longer produces a working shell (byte-identity assumption broken).
- A new adopter reports the starter's `$comment` fields do not surface a schema question they hit (the comments are meant to be self-documenting).
- The two-line topnav or per-doc icon rendering changes shape without this skill being updated (drift between skill and shell).
- Raw Markdown controls return, narrow-screen navigation wraps into tall rows, or the mobile TOC opens by default without an explicit saved preference.
- A TOC remains sticky below 1100px, overlaps article content, or expands beyond 360px in the single-column layout.
- A Markdown event-handler payload executes, DOMPurify failure falls back to unsanitized HTML, Mermaid leaves strict mode, or a CDN asset loses its integrity pin.
- A Mermaid graph renders below 13px on desktop or 11px on mobile without contained scrolling, occupies less than half of its cropped SVG viewport, clips content after fitting, exceeds a 4:1 graph aspect ratio without a clear reason, or causes page-level horizontal overflow.
- Zero adopters copy the starter in the observation window (skill is decorative for its intended audience).
- The read-aloud settings popover stays open through playback, or auto-closes while the reader is still adjusting it (either direction means the dismissal model above is mistuned).
- A host ships Web Speech voices that the ranking in `populateVoices()` orders worse than picking the first available voice.
- Chunked playback stops needing the per-chunk timeout backstop because Chromium reliably fires `onend` (delete the backstop rather than carry it).
- A restyle of `.listen-panel` or `.topnav-listen` drops the explicit `[hidden] { display: none; }` rule and the popover renders while the script reports it closed.
- Removing the stop button costs a reader a reachable way out of playback (`Escape`, page finish, doc switch, and unload should cover it).
- The skip list swallows content that was worth hearing, or the announced markers become noise on a table-dense page (either direction means the skip model is mistuned).
- The nav-strip heuristic drops a real paragraph, or a chunk exceeds `MAX_CHARS` and Chromium stalls on it.
- A corpus sweep over the shell's own docs reports a spoken chunk with no letters or digits, a chunk that is only a placeholder word, or a skip-marker count that disagrees with the number of skippable elements in the page.

## Origin

Authored 2026-07-26 in the [Alex_ACT_Core](https://github.com/fabioc-aloha/Alex_ACT_Core) repo, evolved through the folder-shell pattern (2026-07-26 to 2026-07-28), unified into a single root shell 2026-07-28, and ported to this plugin (`Alex_ACT_Illustrator_Plugin`) on 2026-07-29 as the canonical source-of-truth going forward. Adopted before the port by [CX-Vitals](https://github.com/fabioc-aloha/CX-Vitals) and [QuestionnaireFlow](https://github.com/fabioc-aloha/QuestionnaireFlow); both heirs still run the per-folder pattern out of their `local/docs-shell/` skill installs.

## Cross-links

- [`../../../docs/shell/README.md`](../../../docs/shell/README.md) — canonical technical reference (manifest schema, theme, path rewriting, optional features, adoption, local rendering, troubleshooting)
- [`starter/`](starter/) — the adopter-facing starter kit
- **Related skills (external, sourced from Steward baseline)**:
  - [big-idea](https://github.com/fabioc-aloha/Alex_ACT_Core) — how to author `hero.subtitle` copy
  - [markdown-mermaid](https://github.com/fabioc-aloha/Alex_ACT_Core) — Mermaid diagram authoring rules that fire when a doc contains a `mermaid` code block
  - [svg-banner](https://github.com/fabioc-aloha/Alex_ACT_Core) — routes branded SVG banner authoring to this plugin
