---
name: chart-verify
description: "Verify a rendered chart or visual artifact actually says what it was supposed to say — open it, read its console errors, and check it against the Big Idea before declaring it done. Use after render_chart / create_chart_view, after editing a post-Flint Vega-Lite spec, and before committing any generated HTML/SVG/PNG. Satisfied by the host's built-in browser tools or by the optional playwright MCP server."
lastReviewed: 2026-07-25
---

# chart-verify: look at what you rendered

## Why this skill exists

A chart with a collapsed axis, a merged color scale, or an empty data binding
renders as a **technically valid image that tells the wrong story**. No
validator catches that. `validate_chart` proves the spec is well-formed, not
that the picture is true. Only looking does.

This is the plugin's characteristic bug shape — see *Known failure modes* in the
repo docs. Every other silent failure here is a config path; this one is a
picture.

**The rule:** if you rendered it, opened it, or edited it, look at it before you
say it is done.

## When to invoke

**Mandatory:**

- After **any post-Flint Vega-Lite edit.** The `flint-chart` skill forbids
  sending an edited spec back to `render_chart`, so the MCP server's own
  validation no longer protects you. You are flying without instruments.
- Before **committing generated HTML, SVG, or PNG.** Inline specs fail silently.
- When the chart is **layered, faceted, or multi-series.** Every failure in the
  catalog below comes from layer or scale interaction.

**Recommended:**

- After the first `render_chart` / `create_chart_view` of any chart that will be
  shown to someone other than the person who asked for it.
- Whenever you changed the data binding, not just the styling.

**Skip:**

- Single-layer chart, small embedded data, spec unchanged since a render you
  already looked at.
- The user is iterating rapidly on color or title only.

## The failure catalog

These render without error. Check each one explicitly — the list is the point of
the skill, not the tooling.

| Failure | What you see | Usual cause |
| ------- | ------------ | ----------- |
| **Empty binding** | Axes, gridlines, legend — and no marks | Data ref resolved to nothing. A chart with no data still looks like a chart. **Rule out a render race first** — see capability 5 in Step 1 |
| **Collapsed scale** | Everything squashed into a fraction of the plot area | One layer forced `zero: true` (or a quantitative axis) into a shared scale |
| **Merged color scale** | A mark is the wrong color for its meaning | Two layers' color scales resolved together. Fix with independent scale resolution, not by recoloring |
| **Undefined category** | A blank, `null`, or `undefined` row/tick on a categorical axis | Mis-encoded layer contributing to a shared categorical domain |
| **Duplicate marks** | Rows repeated, bars double-height | Missing dedup upstream — a data problem wearing a chart costume |
| **Embedded totals** | One bar dwarfs the rest; parts look flat | An aggregate level (`all`, `Total`) charted alongside its own parts |
| **Double-scaled units** | Percentages at 0–10000, or everything at 0.0x | A 0–100 rate tagged as `Percentage` and scaled again |
| **Overplotting** | A solid blob instead of a distribution | Too many marks, no opacity/jitter/binning |
| **Right on sample, wrong on real** | Looks perfect, means nothing | Verified against test rows, never against the actual dataset |

## Step 1 — pick a verification capability

This skill names the **capability**, not a product. Work down this ladder and
stop at the first rung that works. **Do not install a second MCP server for a
job the host already does.**

1. **The host's own browser capability — always try this first.** If your tool
   inventory contains anything that opens a page and returns a screenshot or a
   page snapshot *to you*, use it. In VS Code Copilot these are the built-in
   browser tools; they open `file://` with no flags, no browser download, and no
   configuration, and they were verified against this plugin's own demo. This
   rung costs nothing and has no security trade-off.
2. **The optional `playwright` MCP server — fallback.** Use when rung 1 is
   absent, or when rung 1 lacks console-error access and the defect you are
   chasing needs a cause rather than a symptom. **On a terminal-only agent such
   as GitHub Copilot CLI there is no rung 1 at all** — it has no browser, so
   this rung is the primary path, not the fallback. See *Playwright MCP setup*
   below. It carries real costs: a browser must already be installed, `file://`
   needs `--allow-unrestricted-file-access`, and it writes artifacts into the
   working directory.
3. **The human.** Ask the user to open the artifact and describe what they see,
   or give them a specific checklist item to confirm. This is a legitimate
   outcome, not a failure — but it must be *stated*.

**Never silently skip verification.** If you reached rung 3, or if you have
partial capability (see below), say so plainly in your report. An unverified
chart described as verified is worse than an unverified chart.

### Which capabilities you actually need

"Can open HTML" is not one capability — it is five, and hosts differ in which
they provide. Establish what you have *before* interpreting what you see.

| # | Capability | Needed for | If missing |
| - | ---------- | ---------- | ---------- |
| 1 | **Open a local `file://`** | Reaching the artifact at all | Fall back to a `render_chart` PNG/SVG, or rung 3 |
| 2 | **Agent-readable output** (screenshot or accessibility snapshot returned *to you*) | Steps 3–4 | You are on rung 3 — the human is verifying, not you |
| 3 | **Console-error access** | Step 2 — finding the *cause* | You can still see symptoms; say that causes were not checked |
| 4 | **Element-scoped or scrolled capture** | Multi-figure artifacts | Verify one figure per page-load, or accept reduced confidence and say so |
| 5 | **Wait-for / re-capture after render** | Anything JS-rendered (Vega-Lite, ECharts) | **See the false-positive warning below** |

> [!WARNING]
> **Capability 5 can manufacture a defect that isn't there.** Vega-Lite and
> ECharts draw *after* page load. A screenshot taken too early shows an empty
> container — which is visually identical to the **empty binding** row in the
> failure catalog. Before diagnosing "empty binding", re-capture at least once
> and confirm the emptiness is stable. Diagnosing a race as a data bug sends the
> fix upstream into a spec that was never wrong.

Probe by **doing, not by asking**: attempt the action against the real artifact
and observe the result. Tool names vary between hosts; outcomes do not.

## Step 2 — open it and read the errors first

1. **Open the artifact.** For local files use the canonical absolute
   `file:///…` form.
2. **Read the console errors before looking at the picture.** This is the check
   that finds the cause rather than the symptom — a silently-failing inline
   Vega-Lite spec throws to the console while still rendering a plausible-looking
   page. With the Playwright server this is `browser_console_messages` at level
   `error`.
3. **Then screenshot it.**

Zero console errors plus a wrong-looking chart means a spec/data problem.
Console errors plus a right-looking chart means you are looking at a stale
render.

## Step 3 — check the picture against the catalog

Walk the failure table above. Then, for multi-figure artifacts:

- **Scroll each figure into view and capture it separately.** A single full-page
  screenshot visually hides defects in unfocused figures.
- **Check the axes have real domains** — not `[0, 0]`, not a collapsed range,
  no `undefined` ticks.
- **Count the marks** against what the data should produce.

## Step 4 — check the claim, not just the render

The chart exists to carry the Big Idea from the `chart-big-idea` skill. A
correct render of a wrong claim is still a defect.

- **Verify prose claims arithmetically against the plotted values.** If the
  caption says "less than a fifth of the noise", compute it. Order-of-magnitude
  overstatements in captions survive every automated check there is.
- **Re-read the Big Idea and ask whether the picture shows it.** If the Big Idea
  is about a gap and the eye goes to a trend, the chart type is wrong — go back
  to `flint-chart` §0.2, do not patch the styling.

## Step 5 — report honestly

State which capability you used, that you looked, and what you checked. If you
could not verify, say that instead. Never describe an unopened render as
verified.

## Playwright MCP setup

**Fallback only — rung 2 of Step 1.** Try the host's own browser capability
first; if it can open the artifact and return a screenshot to you, you do not
need this server. Measured against `@playwright/mcp@0.0.78`:

```json
{
  "servers": {
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@0.0.78",
        "--headless",
        "--isolated",
        "--browser",
        "msedge",
        "--allow-unrestricted-file-access"
      ]
    }
  }
}
```

Merge this **additively** into the existing server map — overwriting the file
destroys the user's other servers, including `flint`. Same per-host path table
as the `flint-chart` skill (`.vscode/mcp.json` for VS Code, `.mcp.json` for
Claude Code, `.cursor/mcp.json` for Cursor, `~/.copilot/mcp-config.json` with
key `mcpServers` for Copilot CLI).

### Why each flag

| Flag | Why |
| ---- | --- |
| `--headless` | No visible window; this is a verification pass, not a demo |
| `--isolated` | No persistent browser profile — keeps the user's real session out of it |
| `--browser msedge` | **There is no bundled browser** — Playwright drives an *installed* one by channel. Edge ships with Windows, which is where most heirs are; the upstream default (`chrome`) is frequently absent there. Override with `chrome`, `firefox`, or `webkit` where Edge is not installed — typically Linux |
| `--allow-unrestricted-file-access` | **Required for `file://`.** Without it navigation is blocked outright. See the security note below |

### Security note — read before enabling the file-access flag

`--allow-unrestricted-file-access` lets the browser read any file the user can
read. That is acceptable for verifying local artifacts you just produced. It is
**not** acceptable in combination with browsing untrusted web pages: a malicious
page can attempt to drive the agent into reading local files and sending them
out. Keep this server for local verification. If you need general web browsing,
use a separate configuration without the flag.

Do not enable `browser_run_code_unsafe` workflows for verification. Screenshot
and console access are sufficient; arbitrary code execution is not needed to
look at a chart.

### Housekeeping

The server writes artifacts (accessibility snapshots, screenshots) into the
working directory. **Add `.playwright-mcp/` to `.gitignore`** or they land in
commits.

**Do not pass a bare `filename` to `browser_take_screenshot`.** A bare name like
`shot.png` is written to the *working-directory root*, which is outside the
ignored folder and shows up as an untracked file in the user's repo. Either omit
`filename` entirely — the server then writes into `.playwright-mcp/` — or give a
path inside that folder. Verified 2026-07-25: a bare filename leaked into
`git status` while the snapshot beside it did not.

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `Access to "file:" protocol is blocked` | Flag missing — the default blocks `file://` navigation entirely | Add `--allow-unrestricted-file-access` |
| `Browser distribution '<channel>' is not found` | No bundled browser — the selected channel is not installed on this machine | Switch `--browser` to a channel that is present (`msedge` / `chrome` / `firefox` / `webkit`), or run `npx playwright install <channel>` |
| Server reports a version like `1.62.0-alpha-…` | That is the underlying **Playwright library** version, not the `@playwright/mcp` package version | Do not pin against what the handshake reports |
| Tools never appear at all | Config in the wrong path or under the wrong top-level key | Same trap as `flint` — see the per-host table in the `flint-chart` skill |
| Untracked `.playwright-mcp/` in `git status` | Working-directory artifacts | Gitignore it |

## Anti-patterns

- **Declaring a chart done because the tool returned success.** The tool
  reporting OK means bytes were written, not that the picture is true.
- **Trusting a batch edit's summary line.** When a multi-edit call reports
  "1 succeeded, 1 failed", verify *which* one landed by inspecting the file
  before re-rendering. The visible change is often not the one that succeeded.
- **One full-page screenshot for a multi-figure report.** Defects hide in the
  figures you did not focus.
- **Verifying against sample data only.** The failure mode this skill exists for
  appears when real data meets the spec.
- **Installing the Playwright server on a host that already has a browser
  capability.** Redundant dependency, extra config surface, no gain. Rung 1
  before rung 2, always.
- **Diagnosing an empty chart before re-capturing.** JS-rendered charts draw
  after load; one early screenshot is not evidence of an empty binding.
- **Fixing a data or chart-type problem with a style tweak.** Recoloring a mark
  that is wrong because two scales merged hides the bug instead of fixing it.

## Would Revise If

Revise this skill by 2026-10-25 (90 days) or sooner if:

- **The host's built-in browser tools gain or lose console-error access.**
  `browser_console_messages` is currently the main capability that justifies the
  optional Playwright server at all.
- **A host appears whose canvas renders HTML for the *user* but returns nothing
  to the agent.** Capability 2 in Step 1 assumes "renders" and "agent can read
  it back" usually travel together. A surface that splits them would make rung 3
  the common case rather than the exception, and Step 5's honesty requirement
  the most load-bearing part of this skill.
- **`@playwright/mcp` changes its `file://` default.** The security note and the
  flag table both assume navigation is blocked unless the flag is set.
- **`@playwright/mcp` ships a bundled browser by default.** The troubleshooting
  row about installed-Chrome-by-channel would then be wrong.
- **A failure mode recurs that is not in the catalog above.** The table is the
  load-bearing content; extend it rather than adding tooling.
- **Verification is consistently skipped by users**, indicating the step is too
  heavy and should collapse into the `flint-chart` render step instead of
  standing as its own skill.
