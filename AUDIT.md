# Project Audit

Audit date: 2026-08-06
Remediation update: 2026-08-06; all reported source findings are resolved locally.

## Remediation Status

| Finding | Status | Evidence |
| --- | --- | --- |
| Windows verifier shell injection | Resolved | Shell-free `npx-cli.js` launch; metacharacter argv regression; real Flint handshake passes |
| Incomplete/stale manifest metadata | Resolved | Real verifier checks 22 paths, starter dependencies, and copied frontmatter |
| Catalog/compat checks fail open | Resolved | Requested missing, malformed, or invalid results exit nonzero |
| Mobile demo overflow | Resolved | 1280px and 390px measurements show no overflow; mobile screenshot is square and label-separated |
| Shell reference Markdown/links | Resolved | Editor diagnostics clean; starter and public Core links resolve |
| Bare prompt forms | Resolved | Three prompt headings and skill guidance use `/alex-act-illustrator-plugin` |

## Executive Summary

The repository is structurally coherent, version-aligned, and healthy on its primary Flint MCP path. The audit found no committed secret signatures and no critical findings.

The project is not release-ready without review of one high-severity developer-tooling issue: the Windows verifier launches a repository-controlled package spec through `cmd.exe`. Three medium-severity findings affect manifest completeness, release-gate reliability, and mobile rendering. Two low-severity findings affect documentation integrity and prompt naming.

This audit added only `AUDIT.md`. No existing project file was changed.

## Findings

### High: Windows verifier passes repository-controlled data through a shell

The required Flint package spec is read from [`.vscode/mcp.json`](.vscode/mcp.json), assigned to `PACKAGE` in [scripts/verify-install.mjs](scripts/verify-install.mjs#L119), and interpolated into a command string launched with `shell: true` on Windows in [scripts/verify-install.mjs](scripts/verify-install.mjs#L270). The nearby comment says there is no injection surface because the command is hard-coded, but the package spec is repository-controlled rather than hard-coded.

Impact: a malicious or compromised change to `.vscode/mcp.json` could execute shell syntax when a maintainer runs the documented verifier during review. The exact-version policy reduces accidental malformed input but does not make shell interpolation safe.

Recommendation: resolve `npx.cmd` to an absolute path with `where.exe`, then call `spawn()` with an argument array and `shell: false`. Apply the same no-shell pattern to the optional MCP launcher in [scripts/verify-install.mjs](scripts/verify-install.mjs#L465).

### Medium: The manifest is incomplete and contains stale copied metadata

The docs-shell starter routes to `example-report.html` in [the starter manifest](.github/skills/docs-shell/starter/manifest.json#L85), and the changelog says that file ships with the starter in [CHANGELOG.md](CHANGELOG.md#L386). The root manifest's docs-shell `bundled_resources` list in [manifest.json](manifest.json#L73) omits it. A manifest-driven packager can therefore produce a starter whose Example report route is missing.

The same manifest also contains three confirmed metadata drifts:

- The Flint server notes still say `0.3.0` beside an actual `0.4.1` argument in [manifest.json](manifest.json#L188-L192).
- The copied docs-shell description omits the current misrender triggers from [the source frontmatter](.github/skills/docs-shell/SKILL.md#L3).
- The copied SVG banner description names the retired `SUPERVISOR/HEIR` watermark set in [manifest.json](manifest.json#L124), while [the source skill](.github/skills/svg-banner/SKILL.md#L3) uses `DOCS/RELEASE/PLAN/NOTE`.

Impact: alternate installers and generated catalogs can omit a live starter resource or advertise stale discovery metadata.

Recommendation: add `example-report.html`, synchronize the three copied fields, and extend `verify-install.mjs` to assert that every declared path exists, every starter dependency is declared, and copied frontmatter equals its source.

### Medium: Compatibility and catalog checks fail open

`--compat` counts invalid documented patterns in [scripts/verify-install.mjs](scripts/verify-install.mjs#L413) but only prints the count; it never sets a failing exit code. Catalog parse failures are also warnings in [scripts/verify-install.mjs](scripts/verify-install.mjs#L428-L436). The script can therefore finish with `PASS` and exit 0 after the version-dependent checks requested by the caller have failed.

Impact: automation and release procedures such as the command documented in [HANDOFF.md](HANDOFF.md#L25) can accept a version that breaks documented chart patterns.

Recommendation: when a caller explicitly requests `--compat` or `--catalog`, make that check authoritative and exit nonzero on invalid, missing, or unparseable results. Keep optional MCP availability non-fatal only where the documented policy intends it.

### Medium: The shipped demo overflows mobile viewports

[The heart-with-axes report](demos/heart-with-axes/report.html) renders correctly at 1693 x 1247 with zero console errors, one SVG, no failed images, and no placeholders. At a 390 x 844 viewport, the Vega container remains 589 px wide, begins at `x = -107`, ends at `x = 482`, and expands the document to 482 px. The mobile screenshot showed a horizontal scrollbar and clipped chart content.

Impact: the primary visual demo is not usable without horizontal scrolling on a typical phone-sized viewport.

Recommendation: make the Vega view responsive or place it in an intentional overflow container with a usable minimum width, then verify at desktop and mobile widths.

### Low: The shell reference has live Markdown and link defects

[docs/shell/README.md](docs/shell/README.md#L41) produces two MD033 findings because `<id>` and `<slug>` are parsed as inline HTML. [The manifest-schema introduction](docs/shell/README.md#L52) also contains a malformed Markdown link.

Three live local references do not resolve:

- The root shell link in [docs/shell/README.md](docs/shell/README.md#L17) points to an `index.html` that the same sentence says this repository does not ship.
- The big-idea link in [docs/shell/README.md](docs/shell/README.md#L165) points to a non-existent local Core skill.
- The browser-tools link in [docs/shell/README.md](docs/shell/README.md#L424) points to another non-existent local Core skill.

Recommendation: format the query string as code, repair the malformed sentence, link the shell to the starter implementation, and use public Core URLs for Core-owned skills.

### Low: Prompt references mix bare and namespaced command forms

The public README correctly documents `/alex-act-illustrator-plugin <prompt>`, but installed prompt headings such as [render-chart.prompt.md](.github/prompts/render-chart.prompt.md#L6) and invocation guidance such as [install-visual-companions/SKILL.md](.github/skills/install-visual-companions/SKILL.md#L16) still use bare forms.

Impact: users who type the documented bare form can miss the plugin prompt in hosts that expose plugin commands only through their namespace.

Recommendation: use the namespaced form in user-facing current documentation. Preserve bare names only where a historical document explicitly describes the pre-namespace state.

## Confirmed Passes

- Worktree was clean before the report was added.
- `plugin.json` and `manifest.json` both declare version `1.0.0`.
- Flint, Replicate, and Playwright MCP declarations are byte-equivalent across `plugin.json`, `manifest.json`, and `.vscode/mcp.json` after normalizing the manifest shape.
- `node scripts/verify-install.mjs --catalog --compat` completed against `flint-chart-mcp@0.4.1`: protocol `2024-11-05`, all five expected tools, three backends, and all seven documented compatibility patterns.
- `node scripts/check-language.mjs` scanned 38 payload files and passed.
- `node --check` passed for both repository scripts and the SVG banner generator.
- Explicit editor diagnostics over all 27 Markdown files found findings only in `docs/shell/README.md`.
- A common credential-signature scan found no private-key headers, GitHub token signatures, OpenAI-style secret signatures, or AWS access-key signatures.
- The desktop heart-with-axes demo passed runtime inspection over `file://` with zero console/page errors, no failed images, and no placeholder text.

## Triage Notes

The local-link sweep initially produced 19 candidates. Five were harness false positives inside examples or runtime query links. Eleven belong to the dated 2026-07-24 historical plan and were classified as archival residue rather than current-product defects. Three are live broken references in `docs/shell/README.md` and are reported above.

The independent first pass reported the README's `install-visual-companions` table label as a bare-command defect. Direct inspection disproved that claim: the same row gives the correct namespaced command. The actual naming drift is inside installed prompt and skill prose.

The `LICENSE` file produced an MD041 editor diagnostic during the workspace-wide probe. It is extensionless license text, explicitly excluded by `.markdownlintignore`, and was classified as a diagnostics-harness false positive.

## Audit Boundaries

- No dependencies were installed or upgraded.
- Optional Replicate and Playwright MCP servers were not handshaken; the primary Flint server was.
- External URLs were not exhaustively fetched. Local link targets were checked against the filesystem.
- The docs-shell starter was not verified over HTTP. A temporary server launch failed before binding and left no listener; the existing source, manifest route, and `file://` demo evidence were still inspected.
- The security finding was established by data-flow inspection. No command-injection payload was executed.
