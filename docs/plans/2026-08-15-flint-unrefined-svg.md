# Flint Hand-Drawn Renderer Proposal

**Goal:** Preserve the evidence from a withdrawn Illustrator-side prototype and
define the future upstream question: how Flint could support an intentional
hand-drawn renderer treatment without losing semantic chart roles.

**Architecture:** Flint must own any future renderer-level treatment while it
still knows each chart primitive's semantic role, transform, layer, and z-order.
Illustrator does not ship an SVG postprocessor, font payload, runtime
dependency, or gallery for this capability.

**Tech Stack:** Flint `0.5.0` static Vega-Lite SVG output, a reviewed
MIT-compatible SVG roughening library, compact Kalam Regular 400 and Bold 700
Latin WOFF2 assets from the official Google Fonts Kalam v18 CSS endpoint under
SIL OFL 1.1, Node.js, static SVG fixtures, and `render-verify`.

---

## Decision Record

**Status:** Local prototype withdrawn before commit, release, or Mall
publication. This file is retained as evidence for a future Flint proposal.

**H1:** A post-Flint SVG modifier can make every visual layer feel hand-drawn
while keeping Flint's semantic input and original geometry as the source of
truth. **Falsified.**

**H2:** Flint needs a renderer-level extension point, not a ThemeSpec preset,
because the appearance depends on semantic render roles and transforms that are
lost after SVG serialization. **Retained for upstream review.**

**Decision:** Withdraw H1. The prototype preserved handcrafted fixture geometry
but failed on real Flint SVGs: flattened output contains nested transforms,
background/foreground paths, generated mark fragments, and renderer-owned
layering that a generic postprocessor cannot classify safely. A coordinate fix
removed the most obvious drift but did not make the resulting charts a credible
visual treatment.

**Disconfirmers:** Stop and remove the candidate if any of these occur:

- A transformed SVG changes a source mark's data-derived bounding box or makes
  values, axes, or labels unreadable at the intended output size.
- The deterministic seed does not reproduce byte-equivalent output for the
  same SVG and options.
- The required font cannot be bundled with a reviewed redistribution license.
- The static-SVG-only boundary proves unacceptable in the first three real
  uses, or users repeatedly expect the modifier to work in the interactive MCP
  chart view.

**Audit priors:** Flint `0.5.0` exposes themes only for Vega-Lite and renders
the current MCP surface as SVG or PNG. Its own cartoon preset deliberately
stops short of hand-wobbled strokes. SVG filter displacement would affect
rendered positions and text, so it cannot be the data-preserving mechanism.

## Prototype Evidence

- The candidate used MIT-licensed RoughJS and xmldom, plus SIL OFL Kalam web
  fonts. Licensing and deterministic fixed-seed output were not the failure.
- Handcrafted fixtures passed geometry assertions, but real Flint output uses
  nested transforms and renderer-specific path fragments. Root-level overlays
  moved marks to the wrong coordinate system; local overlays restored position
  but still duplicated and misclassified visual roles.
- Browser review of six real chart/theme combinations rejected the visual
  result. The defect is qualitative and architectural, not a test-harness gap.
- All prototype source, runtime, font, fixture, gallery, and packaging changes
  were removed before commit. No public plugin surface changed.

## Scope

### Future Upstream Scope

- A renderer-level hook operating before backend SVG serialization.
- Semantic role-aware treatment of marks, axes, grids, labels, legends, and
   chart furniture.
- Transform-safe rough stroke decisions and z-order rules.
- Renderer-owned visual regression fixtures and before/after judgment.

### Out of Scope

- A new Flint preset, a new chart type, or a change to `ChartAssemblyInput`.
- Mutation of the interactive `create_chart_view` MCP App.
- Chart.js PNG treatment, ECharts support, raster filters, animation, or a
  claim of backend parity.
- Use of third-party artwork, a proprietary font, or a named artist's font.
- An upstream pull request before the local prototype is independently useful.

## Withdrawn Prototype Record

The remaining task details below are historical evidence of the local
experiment. They are not active Illustrator work items and must not be
implemented from this repository. A future upstream proposal should use the
failure evidence above to define a renderer-level design instead.

### Task 1: Define the output contract and acceptance fixtures

**Objective:** Establish the modifier's input, output, deterministic seed, and
source-preservation rules before adding a runtime dependency.

**Files:**

- Create: `.github/skills/flint-chart/references/unrefined-svg-contract.md`
- Create: `.github/skills/flint-chart/fixtures/unrefined-bar.svg`
- Create: `.github/skills/flint-chart/fixtures/unrefined-line.svg`
- Create: `.github/skills/flint-chart/fixtures/unrefined-scatter.svg`
- Modify: `scripts/test-verify-install.mjs`

**Steps:**

1. Write failing fixture tests that assert each input SVG has a stable source
   hash and known data-mark bounds.
2. Define modifier options: `seed`, `strength`, `fontFamily`, and output path.
3. Add failure cases for malformed XML, unsupported elements, absent font
   asset, and a request to overwrite the source SVG.
4. Run `node --test scripts/test-verify-install.mjs`; expected result: new
   contract tests fail because the modifier does not exist.

### Task 2: Select and license the deterministic SVG roughening dependency

**Objective:** Choose an SVG library only after proving it supports seeded,
repeatable rough paths and has a compatible redistribution license.

**Files:**

- Create: `docs/plans/2026-08-15-unrefined-svg-dependency-review.md`
- Create: `package.json` with exact source-local development dependency pins;
   do not commit a registry-specific `package-lock.json`
- Modify: `.github/skills/setup-illustrator-runtime/scripts/provision-runtime.mjs`
   and `runtime-launcher.mjs` only if the reviewed dependency belongs in the
   existing plugin-private runtime
- Modify: `LICENSE` or attribution documentation if the selected dependency
  requires notice

**Steps:**

1. Compare the candidate library against the contract: SVG input coverage,
   deterministic seed support, no browser-only runtime assumption, maintained
   release, and license.
2. Reject global `feTurbulence` plus `feDisplacementMap` as the primary
   renderer: it shifts rendered pixels indiscriminately and degrades text.
3. Use source-local exact dependencies only for tests, and install the same
   exact dependencies in the plugin-private runtime for installed execution.
   Ignore a generated lockfile when it records the configured registry's
   resolved tarball URLs.
4. Pin the exact versions and record provenance and license evidence.
5. Rerun the existing verification suite; expected result: no current feature
   behavior changes before the modifier is implemented.

### Task 3: Build the source-preserving SVG modifier

**Objective:** Generate a separate treated SVG from a validated Flint SVG.

**Files:**

- Create: `.github/skills/flint-chart/scripts/unrefine-svg.mjs`
- Add: `.github/skills/flint-chart/assets/kalam/Kalam-Regular-Latin.woff2`
- Add: `.github/skills/flint-chart/assets/kalam/Kalam-Bold-Latin.woff2`
- Add: `.github/skills/flint-chart/assets/kalam/OFL.txt`
- Modify: `manifest.json`
- Modify: `scripts/test-verify-install.mjs`

**Steps:**

1. Add a failing test that invokes `unrefine-svg.mjs` against each fixture and
   expects a new output file, an unchanged source hash, and a metadata seed.
2. Parse the SVG with a structured XML API. Reject malformed or unsupported
   input before writing output.
3. Reproduce eligible non-text vector shapes as deterministic rough overlays
   derived from the source's exact coordinates. Keep original fills and
   semantic geometry as the base layer.
4. Apply the bundled handwritten font stack to text. Do not distort glyphs.
5. Write the output atomically and leave the source file untouched.
6. Rerun the focused test. Expected result: seeded output is deterministic,
   source hashes stay unchanged, and unsupported input fails closed.

### Task 4: Add geometry and visual regression checks

**Objective:** Prove that the presentation treatment did not alter data
meaning or make the artifact unreadable.

**Files:**

- Modify: `scripts/test-verify-install.mjs`
- Create: `.github/skills/flint-chart/fixtures/unrefined-expected.json`
- Create: `.github/skills/flint-chart/fixtures/unrefined-screenshots/`

**Steps:**

1. Assert the source SVG's data-mark coordinates remain available and unchanged
   in the treated output's base layer.
2. Assert the seed produces the same output hash across two runs and a distinct
   output for a different seed.
3. Render source and treated fixtures at desktop and mobile widths, then check
   text fit, no clipping, nonblank marks, and no overlapping labels.
4. Run `render-verify` on bar, line, and scatter outputs. Verify the Big Idea,
   axes, values, and title/deck remain readable.
5. Reject the modifier if the treatment changes the first focal point or makes
   the chart cost more study than its stated audience can afford.

### Task 5: Integrate the modifier as an opt-in Illustrator workflow

**Objective:** Make the treatment discoverable without presenting it as a new
   Flint theme or default rendering behavior.

**Files:**

- Modify: `.github/skills/flint-chart/SKILL.md`
- Modify: `.github/prompts/render-chart.prompt.md`
- Modify: `.github/skills/render-verify/SKILL.md`
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `scripts/test-verify-install.mjs`

**Steps:**

1. Add an opt-in path after static Vega-Lite SVG rendering and before visual
   verification.
2. State the explicit boundary: no interactive MCP App mutation, no Chart.js
   PNG support, no ECharts claim, and no replacement of the original SVG.
3. Add trigger guidance for informal explainers, works-in-progress, and
   human-scale teaching visuals; exclude high-density, highly precise, or
   accessibility-critical charts unless the visual verification passes.
4. Add documentation of the seed, font-license provenance, source artifact,
   treated artifact, and validation evidence.
5. Classify the source change as `[behaviour]` and the eventual public release
   as MINOR under the plugin semver contract.

### Task 6: Decide whether to propose the capability upstream

**Objective:** Offer Flint maintainers a scoped renderer-hook proposal only
after the local implementation proves useful.

**Files:**

- Create: `docs/plans/2026-08-15-flint-unrefined-svg-upstream-proposal.md`
- Create: upstream issue or pull request only after explicit authorization

**Steps:**

1. Package a minimal evidence bundle: before/after SVGs, fixed seeds,
   geometry assertions, visual checks, performance data, dependency license,
   and known backend limits.
2. Propose a generic renderer-level hook or optional hand-drawn presentation
   layer. Do not request that Flint misrepresent it as a ThemeSpec capability.
3. Keep the initial request to one renderer and three chart families.
4. Do not create an upstream issue, pull request, or external publication
   without separate approval.

## Validation

Run after each implementation task:

```text
node --test scripts/test-verify-install.mjs
node scripts/check-language.mjs
git diff --check
```

Before any release, also run the full Illustrator verification suite against a
provisioned Flint `0.5.0` runtime and visually inspect all three fixtures at
desktop and mobile sizes. Do not claim live Flint integration while the
plugin-private runtime is absent.

## Rollback

Delete the modifier script, font asset, fixtures, and workflow references as
one unit. Existing Flint charts remain unaffected because they continue to use
the original semantic specification and static renderer.

## Would Revise If

Revisit this plan by **2026-11-15** or sooner if source-preserving roughening
cannot be made deterministic, a visual check finds altered data meaning, a
reviewed font cannot be redistributed, or three real users prefer the original
Flint output after trying the modifier.
