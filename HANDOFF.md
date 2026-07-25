# HANDOFF — verify `flint-chart-mcp` 0.4.0 off-corpnet

**Status:** parked — no urgency · **Raised:** 2026-07-25 · **Branch under test:** `bump/mcp-0.4.0`

**Decision already taken:** the pin stays at `^0.2.2` (see the Unreleased
section of [`CHANGELOG.md`](CHANGELOG.md)). Corpnet machines cannot install
0.4.0 at all, so the upgrade buys them nothing and there is no deadline. This
file stays available for whenever the repo is next opened on a machine with
public npm access, or if the corporate mirror syncs 0.4.0.

One task when that happens: prove 0.4.0 is a strict superset of 0.2.2 for this
plugin, and capture the version-dependent facts the documentation would
otherwise assert blindly.

Delete this file once the branch is merged or abandoned.

## Why a second machine is needed

`flint-chart-mcp` **0.4.0 is published on public npm** as `latest` (2026-07-24,
signed sigstore provenance), and it is a production release — the GitHub release
is neither draft nor prerelease, `main` and the `0.4.0` tag both carry `0.4.0`,
and `dev` is *behind* `main`.

The corporate workstation cannot reach it. `npm` there resolves through
`packagefeedproxy.microsoft.io/npm/`, whose package document stops at 0.2.2 and
returns `ETARGET` for 0.4.0 — confirmed with `--prefer-online`, so it is the
mirror that is stale, not a local cache. Direct `registry.npmjs.org` access is
blocked by corporate web policy.

**Do not work around this.** No `--registry` override, no `.npmrc` edit, no
fetching the tarball from GitHub. The mirror is a governance control
(vulnerability scanning, license management), not a bug. Using a machine that is
already off-corpnet is not a bypass; re-pointing the corporate machine's
registry would be.

> Fetching from GitHub instead was investigated and is a dead end regardless:
> the release ships no assets, `dist/` is not committed, `bin` points at a build
> artifact, there is no `prepare` script, the package is a workspace member of a
> `private: true` monorepo, and its 11 dependencies — including the native
> `@napi-rs/canvas` and `@resvg/resvg-js` — resolve from npm anyway. Building
> from source routes *more* traffic through the mirror, not less.

## What to run

```bash
git clone https://github.com/fabioc-aloha/flint-chart-plugin.git
cd flint-chart-plugin
git checkout bump/mcp-0.4.0
node scripts/verify-install.mjs --catalog --compat
```

No `npm install` — the checker has zero dependencies, and `npx` fetches the
server itself. Node 22+ required.

`--compat` is the decisive flag: it validates the chart-property patterns this
plugin's skill documents, including all three 0.3.0 migration items, so the
compatibility question is measured rather than argued.

## What to capture

Paste the **entire** output. These four facts drive the follow-up edits:

| # | Fact | Why it matters |
| - | ---- | -------------- |
| 1 | Server version | Must report `0.4.x`. Anything else means the pin resolved somewhere unexpected. |
| 2 | Tool count and names | Expected 5: `render_chart`, `compile_chart`, `validate_chart`, `list_chart_types`, `create_chart_view`. A 0.x minor bump may legitimately change the tool surface. |
| 3 | Backend list | 0.4.0 is documented as adding **Plotly** (38 chart types) and **Excel** (18 Office.js templates). If they appear, the README, the `flint-chart` skill, and `manifest.json` all need widening — they name three backends in prose. |
| 4 | Per-backend chart-type counts | [`README.md`](README.md) quotes "34 Vega-Lite chart types". If that number moved, the README is wrong the moment this merges. |

### Baseline to compare against (measured on 0.2.2, corpnet)

```text
      spec: flint-chart-mcp@^0.2.2  (from .vscode/mcp.json)
OK    server: flint-chart-mcp v0.2.2
OK    protocol: 2024-11-05
OK    tools (5): render_chart, compile_chart, validate_chart, list_chart_types, create_chart_view
OK    backends (3):
        vegalite   34 chart types
        echarts    37 chart types
        chartjs    20 chart types

      spec-pattern compatibility (validate_chart, vegalite):
        valid    Grouped Bar + dodge:auto (0.3.0 dropped "none")
        valid    Donut = Pie + innerRadius (0.3.0 dropped it on Rose)
        valid    Sparkline (0.3.0 dropped independentYAxis here)
        valid    Rose Chart without innerRadius
        valid    Bar Chart (baseline sanity)
        valid    Scatter Plot with color
        → all documented patterns validate on this version
```

## Interpreting the result

- **Exit 0, version `0.4.x`, five tools, all `--compat` patterns `valid`** → the
  bump is good. Ship the dual range and proceed to follow-up work below.
- **Any `--compat` pattern `INVALID`** → do not merge. Stay on `^0.2.2` and
  record which pattern broke and what the server said; that is the decision, not
  a puzzle to solve.
- **Exit 1, `no initialize response`** → expected on corpnet, and it is what
  this branch produces there. Off-corpnet it means a real failure — include the
  `server stderr:` block, which carries npm's own error.
- **Exit 1, `missing expected tools`** → 0.4.0 changed the tool surface. Do not
  merge; the `flint-chart` skill's tool references need reworking first.

If you run it on corpnet by mistake you will see
`ETARGET / No matching version found` in the stderr block. That is the mirror,
not the package.

## Decision (made 2026-07-25) — compatibility gates the pin

**There is no urgency.** Corpnet machines cannot install 0.4.0 at all, so the
upgrade buys them nothing today. The pin therefore moves only if 0.4.0 is a
superset of what 0.2.2 already does for this plugin.

**The rule:**

- **If every `--compat` pattern validates on 0.4.0 and all five tools are
  present** → ship the dual range `flint-chart-mcp@^0.2.2||^0.4.0`, so both
  versions are supported from one config.
- **If anything fails** → stay on `^0.2.2`. Abandon the branch and record what
  broke. One skill cannot honestly serve two versions that disagree.

A plain `^0.4.0` is not on the table: it would break every corpnet sister repo
with `ETARGET`, since the mirror stops at 0.2.2 — and most heirs of this plugin
*are* corpnet repos.

| Option | Corpnet repos | Public-npm repos |
| ------ | ------------- | ---------------- |
| Hold `^0.2.2` | works (0.2.2) | works, stuck on old |
| Bump `^0.4.0` (branch as-is) | **broken — `ETARGET`** | works (0.4.0) |
| Range `^0.2.2\|\|^0.4.0` | works (0.2.2) | works (0.4.0) |

The dual range was tested on corpnet 2026-07-25 and resolved to `0.2.2`; npm
picks the highest version each registry actually offers, so one config
self-adapts. Use the **space-free** form — `flint-chart-mcp@^0.2.2||^0.4.0` —
which is safe inside any `args` array with no quoting hazard.

**Recommended: the dual range**, with one consequence that must be handled in
the same change. Two versions in the wild means the docs can no longer assert
"34 Vega-Lite chart types" or "three backends" as fact — those would be wrong
for half the installs. Rephrase them as *call `list_chart_types` to discover
what your server exposes*, quoting current numbers as illustration only. That is
the more robust design regardless: the skill already tells the agent to call
`list_chart_types`, and runtime discovery does not go stale on every upstream
release.

### What "compatible" has to mean here

Stricter than "0.4.0 works". Under a dual range the *same* skill content must be
valid on **both** versions at once, so:

- Every documented chart-property pattern must validate on both. That is exactly
  what `--compat` measures; all six pass on 0.2.2 today.
- The claim is **not** that upstream broke nothing — 0.3.0 carries three
  breaking changes. The claim is that none of them touch what this plugin
  documents. `--compat` turns that from an assumption into a measurement, which
  matters because the same assumption was asserted twice in this session before
  anyone checked.
- A pattern that is valid on one version and rejected on the other is
  disqualifying for the dual range, even if the plugin could be reworded around
  it. Prefer staying on `^0.2.2` over shipping content that is subtly wrong for
  half the installs.

**The alternative that removes the problem entirely:** get the corporate mirror
to sync 0.4.0, after which a plain `^0.4.0` works everywhere. Worth requesting
through the sanctioned package-feed process in parallel — see below.

## Getting 0.4.0 onto the corporate machine

The corporate workstation cannot install 0.4.0 today, and the registry is not
user-configurable: there is no user-level `.npmrc`, the registry comes from
machine-level npmrc (`C:\Program Files\nodejs\...` and `AppData\Roaming\npm\etc\`),
and `proxy` / `https-proxy` are unset. All npm traffic goes to the managed feed
by policy.

The only sanctioned fix is to have the feed sync the package. Paste-ready
request:

> **Request:** sync `flint-chart-mcp` and `flint-chart` (versions 0.3.0 and
> 0.4.0) into the npm package feed.
>
> - **Publisher:** Microsoft Corporation — <https://github.com/microsoft/flint-chart>
> - **License:** MIT
> - **Supply chain:** published with signed sigstore build provenance, attested
>   to the GitHub Actions run that produced the artifact.
> - **Current feed state:** `packagefeedproxy.microsoft.io/npm/` reports
>   `latest` = 0.2.2 (published 2026-07-22). `npm view flint-chart-mcp@0.4.0`
>   returns `ETARGET` even with `--prefer-online`, so the feed's package document
>   is missing 0.3.0 and 0.4.0 entirely. Public npm has had 0.4.0 since
>   2026-07-24.
> - **Need:** `flint-chart-mcp` is an MCP server that renders charts locally and
>   in-process — no data leaves the machine. It backs an internal Copilot
>   plugin. `flint-chart` is its sibling dependency and is stuck at the same
>   version.

The strongest argument is that this is a Microsoft-published, MIT-licensed,
provenance-signed package currently unavailable to Microsoft engineers.

### Rejected workarounds

Recorded so they are not re-attempted:

- **Editing the managed npmrc, or passing `--registry`** — bypasses the
  governance control rather than routing around a bug. Moot anyway: direct
  `registry.npmjs.org` access is blocked at the network layer.
- **`npm pack` off-corpnet and copying the tarball across** — sideloads a
  package around the same scanning and licensing gate. Also impractical: it
  needs the whole dependency closure, including the platform-specific native
  binaries `@napi-rs/canvas` and `@resvg/resvg-js`.
- **Fetching from the GitHub repo or release** — dead end on the merits; see the
  note at the top of this file.

Until the sync lands, the corporate machine loses only the ability to *test*
0.4.0 behavior locally. Skills, prompt, docs, and Mall publishing are all
version-independent, and the dual-range pin keeps this machine working on 0.2.2.

## Follow-up work once verification passes

Ordered. Items 2–4 depend on the captured output, which is why they were
deliberately left out of the branch commit.

1. **Sparkline caveat.** 0.3.0 removed `chartProperties.independentYAxis` from
   Sparkline (rows now always self-scale) while keeping it for other faceted
   charts. The skill documents it under cross-cutting faceted properties — add
   an explicit Sparkline exclusion so an agent cannot set it there.
   *(The other two 0.3.0 breaking changes were pre-checked on 2026-07-25 and
   need no action: the skill already documents `dodge` as `auto`/`local`/`global`
   and never `none`, and only ever applies `innerRadius` to Pie Chart, which is
   what the Rose Chart migration prescribes.)*
2. **Widen the backend list** from three to five, if fact 3 confirms it —
   [`README.md`](README.md), [`.github/skills/flint-chart/SKILL.md`](.github/skills/flint-chart/SKILL.md)
   (§0.4 coverage rules and the chart-type tables), and
   [`manifest.json`](manifest.json). Note that Excel emits editable Office.js
   charts rather than images, which §0.4's "can Flint express this" framing does
   not currently account for.
3. **Update the chart-type counts** wherever quoted, per fact 4.
4. **Re-evaluate §0 Chart Selection** against 0.3.0's backend-neutral chart-type
   recommendations. This is a live falsifier in the skill's _Would Revise If_
   section: if upstream's recommender is reachable through the MCP tools and
   matches §0.2, then §0 is redundant and should shrink to the framing this
   plugin adds on top.
5. **Version and ship.** Promote the `Unreleased` section of
   [`CHANGELOG.md`](CHANGELOG.md) to a release. **Note that 0.4.0 has since been
   used** for the verification feature (`render-verify` skill + optional
   `playwright` server), so the next bump here is 0.5.0 if the backend surface
   widens, or a patch bump if the pin moves and nothing else does. Then
   re-vendor to the Alex Mall per
   [`docs/publishing-to-mall.md`](docs/publishing-to-mall.md) — the Mall is
   currently one version behind at 0.3.1. Whichever pin is chosen above must be
   mirrored into the Mall's `plugin.json` at
   `install_paths.mcp.server_config.args`, which is authored separately from the
   vendored `mcp.json` and has shipped a stale value before.

## Current state

| Item | Where |
| ---- | ----- |
| Corrections + `--catalog` flag | `main` |
| Pin bumped to `^0.4.0` (unverified) | `bump/mcp-0.4.0` — 2 files, `.vscode/mcp.json` and `manifest.json` |
| Docs describing 3 backends / 34 chart types | `main`, unchanged on purpose |
| Alex Mall vendored copy | 0.3.1 — one release behind |

The branch changes the pin **only**. Documentation was intentionally left
untouched so it can be corrected from measured output rather than from the
upstream release notes, which have already proven unreliable: upstream's own
changelog claims 0.2.1 and 0.2.2 "were not published to npm", which the registry
contradicts.
