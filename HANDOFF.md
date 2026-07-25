# HANDOFF — verify `flint-chart-mcp` 0.4.0 off-corpnet

**Status:** open · **Raised:** 2026-07-25 · **Branch under test:** `bump/mcp-0.4.0`

One task: prove that `flint-chart-mcp@^0.4.0` works, and capture four
version-dependent facts that this plugin's documentation asserts. It cannot be
done on the corporate network.

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
node scripts/verify-install.mjs --catalog
```

No `npm install` — the checker has zero dependencies, and `npx` fetches the
server itself. Node 22+ required.

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
```

## Interpreting the result

- **Exit 0, version `0.4.x`, five tools** → the bump is good. Proceed to
  follow-up work below.
- **Exit 1, `no initialize response`** → expected on corpnet, and it is what
  this branch produces there. Off-corpnet it means a real failure — include the
  `server stderr:` block, which carries npm's own error.
- **Exit 1, `missing expected tools`** → 0.4.0 changed the tool surface. Do not
  merge; the `flint-chart` skill's tool references need reworking first.

If you run it on corpnet by mistake you will see
`ETARGET / No matching version found` in the stderr block. That is the mirror,
not the package.

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
   [`CHANGELOG.md`](CHANGELOG.md) to a release. A minor bump (0.3.2 → 0.4.0)
   fits if the backend surface widens; a patch bump fits if the pin moves and
   nothing else does. Then re-vendor to the Alex Mall per
   [`docs/publishing-to-mall.md`](docs/publishing-to-mall.md) — the Mall is
   currently one version behind at 0.3.1.

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
