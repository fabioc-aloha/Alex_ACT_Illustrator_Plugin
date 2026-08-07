# Docs-Shell Adoption Guide

Use this guide when copying the starter into a new repository or upgrading an existing shell. The runtime remains two adjacent files, `index.html` and `manifest.json`; the other starter files are examples, navigation support, and adoption guidance.

## Choose One Stable Shell Root

| Location | Use when | Path consequence |
| --- | --- | --- |
| Repository root | Default. The shell is the project's primary documentation surface. | Sources look like `docs/overview.md` or `README.md`. |
| Stable subfolder such as `docs/` | The repository root already has another app or shell. | Sources are relative to that subfolder, so use `overview.md`, not `docs/overview.md`. |

Do not maintain generated copies in several folders. Pick one shell root and keep its `index.html`, `manifest.json`, source paths, and report assets coherent.

## Fresh Adoption

1. Create a Git checkpoint before adding the starter.
2. Copy the complete `starter/` contents into the chosen shell root. Keep the `assets/` folder with it.
3. Edit `manifest.json`:
   - Change `brand.label` and `brand.href`.
   - Choose `defaultArea` and each area's `defaultDoc`.
   - Replace the example `docs[]` entries and `sources[]` paths.
   - Remove the example report entry and file when standalone HTML reports are not needed.
   - Remove or intentionally enable the example quickJumps. The starter keeps their data and CSS, but does not render a quickJump row by default.
4. Replace `about.md` with project content or keep it as a smoke-test page until the first real document renders.
5. Open every declared route at desktop and mobile widths using the origin readers will actually use.

For a repository-root shell, source paths start at repository root:

```json
"sources": ["docs/overview.md"]
```

For a shell rooted at `docs/`, the same file is relative to the manifest:

```json
"sources": ["overview.md"]
```

## Upgrade an Existing Shell

Do not overwrite `manifest.json` or a customized `index.html` before classifying local behavior.

1. Commit or back up the current shell, manifest, report navigator, and assets.
2. Run the read-only capability audit from the Illustrator skill source or repository-local skill copy:

   ```powershell
   node .github/skills/docs-shell/scripts/audit-docs-shell.mjs --shell index.html --project-root . --json
   node .github/skills/docs-shell/scripts/audit-docs-shell.mjs --shell docs/index.html --project-root . --json
   ```

3. Interpret the result:
   - Exit `0`: required capabilities pass.
   - Exit `2`: valid audit with required upgrade work.
   - Exit `1`: invalid command, missing shell or manifest, or unreadable JSON.
   - `extensions`: project-owned manifest fields to preserve and review, not defects.
   - `optional`: informative capability differences that do not fail the audit.
4. Preview the canonical replacement and reapply only the local extensions that still earn their maintenance cost.
5. Rerun the audit, then sweep every manifest route over desktop and mobile viewports.
6. Inspect standalone reports separately. They own their document layout even when they share shell navigation.

A byte-for-byte comparison is not an upgrade plan. Legitimate adopters can extend the manifest, renderer, or deployment surface while still satisfying the canonical capabilities.

## Keep Paths Relative to the Manifest

| Path | Resolves from | Common pitfall |
| --- | --- | --- |
| `sources[]` Markdown or HTML | Folder containing `manifest.json` | Prefixing a stable subfolder twice, such as `docs/docs/overview.md`. |
| Relative links inside Markdown | The Markdown source file | Rewriting a working source-relative link as if it were manifest-relative. |
| Relative report assets | The standalone report file | Moving a report without its adjacent images, styles, or scripts. |
| Root-relative report assets such as `/assets/app.js` | Project root supplied to the audit | Omitting `--project-root`, then assuming the report is self-contained. |
| `assets/report-topnav.js` | The script URL itself | Copying the script without keeping `manifest.json` one directory above `assets/`. |

The report navigator derives the shell root from its own script URL. A nested report can point back to the shared navigator with the appropriate relative `src`; do not copy a navigator beside every report.

## Verify the Reader's Real Origin

`file://` behavior differs by browser:

| Origin | Expected behavior |
| --- | --- |
| VS Code's integrated browser tools | Can be configured to allow sibling-file fetches for local inspection. |
| Normal Chrome, Edge, or Firefox opened from Explorer | Usually blocks `fetch('manifest.json')` from `file://` because the origin is opaque. |
| `http://127.0.0.1:<port>` or deployed HTTPS | Matches ordinary web-origin fetch behavior. |

A pass in an agent browser is not proof that a human opening the file in a normal browser will see the same page. When readers use HTTP or HTTPS, validate that origin. For a local HTTP smoke test, use an existing project server or a temporary static server, for example:

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory .
```

Stop the exact server process after testing.

## Preserve Security and Responsive Invariants

Do not remove these while customizing:

- Rendered Markdown passes through DOMPurify before insertion.
- Mermaid runs with `securityLevel: 'strict'`.
- External CDN scripts and styles use exact versions, SHA-384 integrity, and `crossorigin="anonymous"`.
- Narrow navigation scrolls horizontally instead of wrapping into tall rows.
- The mobile table of contents is bounded and internally scrollable.
- `#content` contains wide descendants, while tables, code blocks, and Mermaid frames keep their own horizontal scrollers.
- Standalone report navigation and its spacer disappear in print.

## Adoption Checklist

- [ ] One stable shell root selected.
- [ ] Complete starter copied, including `assets/`.
- [ ] Brand, default routes, and example entries replaced.
- [ ] Every `sources[]` path exists relative to the manifest.
- [ ] Example quickJumps removed or intentionally enabled.
- [ ] Read-only audit passes or every finding is understood.
- [ ] Local extension fields are preserved or deliberately retired.
- [ ] Desktop and mobile routes have no page-level horizontal overflow.
- [ ] Wide tables, code, and Mermaid frames still scroll locally.
- [ ] Standalone reports retain navigation spacing and print without a blank top band.
- [ ] The actual reader origin (`file://`, HTTP, or HTTPS) was tested.

Keep this guide with the starter during adoption. After setup, retaining it gives future upgraders the same safety boundary; deleting it does not affect runtime behavior.
