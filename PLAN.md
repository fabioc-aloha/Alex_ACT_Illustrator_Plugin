# Flint MCP 0.5.0 Capability-Parity Plan

**Status:** Core Flint MCP parity complete
**Created:** 2026-08-18
**Scope:** `flint-chart-mcp@0.5.0` as launched by this plugin's private runtime

## Goal

Make the plugin's Flint guidance, examples, verification, and Illustrator
handoff accurately represent the capabilities of the pinned
`flint-chart-mcp@0.5.0` runtime.

This is **MCP parity**, not parity with every package exported by the upstream
`flint-chart` library. Plotly and Excel are library-level capabilities and
remain out of scope unless the plugin deliberately adds a non-MCP integration.

## Research Baseline

| Fact | Verified source |
| --- | --- |
| Pinned upstream baseline | [`microsoft/flint-chart` tag `0.5`](https://github.com/microsoft/flint-chart/tree/0.5), package `flint-chart-mcp@0.5.0` |
| MCP tools | [`flint-mcp` README](https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/README.md): `render_chart`, `compile_chart`, `validate_chart`, `list_chart_types`, `list_themes`, `create_chart_view` |
| MCP backends | Vega-Lite, ECharts, and Chart.js only |
| Static formats | Vega-Lite and ECharts: SVG or PNG; Chart.js: PNG only |
| Theme boundary | `ThemeSpec` realizes in Vega-Lite only for 0.5.0 |
| App boundary | `create_chart_view` is the Vega-Lite/SVG MCP App path, not a generic interactive view for every backend |
| Renderer boundary | No public rough/hand-drawn renderer, semantic SVG hook, or runtime renderer-extension API exists in 0.5.0 |

## Confirmed Gaps

| ID | Gap | Impact | Priority |
| --- | --- | --- | --- |
| G1 | The root and demo documentation present a direct Vega-Lite 0.3.0 heart artifact as a Flint MCP feature walkthrough. | The main visual example cannot prove the pinned MCP contract. | High |
| G2 | The coverage table says Hierarchy Tree is outside Flint even though ECharts 0.5 includes `Tree`. | Supported work can be incorrectly routed away from Flint. | High |
| G3 | Compatibility tests validate mostly legacy/Vega-Lite input patterns and do not retain or inspect actual rendered artifacts. | Backend, format, and generated-output claims have no executable proof. | High |
| G4 | The plugin has no explicit Illustrator vector-delivery contract. | “SVG output” can be mistaken for reliable editable-vector import. | High |
| G5 | `create_chart_view` and ThemeSpec guidance can be read as cross-backend behavior. | Users can select a backend that cannot satisfy the requested interaction or theme. | Medium |
| G6 | The withdrawn hand-drawn SVG proposal is correctly historical but needs a durable product boundary. | A future change could revive an unsafe post-SVG approach. | Medium |

## Decision Guardrails

1. Keep the exact `flint-chart-mcp@0.5.0` pin. Do not install, upgrade, or
   probe a public registry as part of this work.
2. Treat the runtime `list_chart_types` response as the executable source of
   truth. Tagged upstream documents explain the contract; they do not override
   the runtime installed through the approved registry.
3. Qualify every capability by **surface**, **backend**, **format**, and
   **version**. Never infer cross-backend parity from one renderer.
4. Preserve `ChartAssemblyInput`, backend name, MCP package version, and
   generated output as separate artifacts. An edited backend specification or
   imported Illustrator SVG is a terminal presentation artifact, not a
   regenerable Flint input.
5. Do not revive the generic SVG roughening prototype. A hand-drawn treatment
   remains a future upstream-design question after parity work is complete.

## Execution Plan

### Phase 0 — Capture the reviewed runtime baseline

**Objective:** Establish whether a provisioned private 0.5.0 runtime is
available, without changing runtime state.

1. Run `node scripts/verify-install.mjs --catalog --compat`.
2. Record the package version, six-tool handshake, backend catalog, chart-type
   counts, compatibility results, and warnings in the execution log below.
3. If the plugin-private runtime is unavailable, mark P0 blocked and stop
   runtime-dependent work. Route provisioning through the existing
   `setup-illustrator-runtime` consent flow; do not substitute `npx`, a global
   package, or an alternate registry.

**Exit criteria**

- The baseline records a successful 0.5.0 handshake and live catalog, or the
  exact provisioning blocker is recorded.

### Phase 1 — Create a capability source of truth

**Objective:** Replace implicit capability assumptions with a reviewable,
versioned matrix.

1. Add a generated or carefully recorded 0.5.0 capability matrix under
   `docs/` with provenance to the runtime catalog and upstream tag `0.5`.
2. For every documented chart type, record:
   - MCP surface: `create_chart_view`, `render_chart`, and/or `compile_chart`
   - Backend and exact registered chart type
   - Required channels and relevant constraints
   - Static formats
   - ThemeSpec behavior
   - Illustrator delivery classification: SVG candidate, PNG-only, or not
     applicable
3. Separate library-only capabilities from MCP capabilities.
4. Include explicit rows for the boundary cases:
   - Vega-Lite + ThemeSpec + SVG
   - ECharts `Tree` + SVG
   - Chart.js + PNG-only
   - `create_chart_view` + Vega-Lite/SVG only

**Exit criteria**

- A reviewer can determine whether a requested chart is available without
  relying on memory, a current website, or an unqualified “Flint supports it”
  claim.

### Phase 2 — Correct user-facing guidance

**Objective:** Align skills, prompts, references, and README copy with the
matrix.

1. Update `.github/skills/flint-chart/SKILL.md`.
   - Replace the false “Hierarchy Tree” exclusion with an ECharts-only Tree
     visualization entry.
   - Preserve the distinction from unsupported decomposition-tree analytics.
   - Route ECharts/Chart.js requests to static rendering or compilation.
   - Reserve `create_chart_view` guidance for its Vega-Lite App boundary.
2. Update
   `.github/skills/flint-chart/references/flint-language-reference.md` and
   `.github/skills/flint-theme/SKILL.md` so format and ThemeSpec limitations are
   consistently backend-qualified.
3. Update `.github/prompts/render-chart.prompt.md` and `README.md` to make
   backend selection explicit before promising interactive output, SVG, or
   custom-theme results.
4. Search for stale version references (`0.3.0`, `0.4.1`) and either remove
   them, label them as historical, or preserve them only when a migration note
   requires the historical value.

**Exit criteria**

- No current guidance claims Tree is unsupported.
- No workflow implies ThemeSpec, SVG, or MCP App parity across all three
  backends.
- All non-historical examples identify the pinned 0.5.0 boundary.

### Phase 3 — Add executable artifact conformance

**Objective:** Test real MCP output, not only schema validity.

1. Extend the existing `scripts/test-verify-install.mjs` and
   `scripts/verify-install.mjs` patterns rather than adding a new test runner.
2. Add small prepared fixture inputs. Each fixture must identify the expected
   backend, chart type, format, required channels, and expected warning policy.
3. Add these minimum fixtures:

| Fixture | Calls | Assertions |
| --- | --- | --- |
| Vega-Lite themed bar | `list_chart_types`, `validate_chart`, `compile_chart`, `render_chart` | Catalog contains type; ThemeSpec is accepted; returned SVG is nonempty and parseable; warnings are reviewed. |
| ECharts Tree | `list_chart_types`, `validate_chart`, `compile_chart`, `render_chart` | Tree is in the ECharts catalog; required data/channels validate; returned SVG is nonempty and parseable. |
| Chart.js common chart | `list_chart_types`, `validate_chart`, `compile_chart`, `render_chart` | PNG render succeeds; SVG request is rejected or unavailable as documented. |

4. Retain generated validation evidence in a temporary test location only.
   Commit stable fixtures and expected metadata, not opaque generated images
   unless visual-review evidence requires a versioned reference artifact.
5. Fail a requested conformance run if catalog parsing, validation, format
   enforcement, output parsing, or explicitly prohibited warnings fail.

**Exit criteria**

- The plugin has executable proof of one representative fixture for each MCP
  backend and each critical format/feature boundary.

### Phase 4 — Repair example provenance

**Objective:** Stop representing a direct Vega-Lite artwork as MCP conformance.

1. Relabel `demos/heart-with-axes/` and root README references as an
   illustrative direct Vega-Lite narrative artifact.
2. Preserve the heart demo because its 12-layer composition may not be
   faithfully reproducible through a `ChartAssemblyInput`.
3. Add a separate, deliberately simple 0.5.0 MCP conformance example with its
   source fixture, backend, package version, invocation evidence, and rendered
   output classification.
4. Do not replace the heart demo unless a reviewed `ChartAssemblyInput`
   reproduces its required semantics and visual narrative without direct
   hand-authored Vega-Lite layers.

**Exit criteria**

- A reader can distinguish demonstration artwork from MCP-generated evidence
  without following external links or reading implementation details.

### Phase 5 — Define Illustrator SVG delivery acceptance

**Objective:** Turn “SVG output” into a narrow, testable handoff promise.

1. Document the target Illustrator version(s) and operating-system scope.
2. Define which output paths are eligible:
   - Vega-Lite SVG: eligible for inspection.
   - ECharts SVG: eligible for inspection.
   - Chart.js PNG: not an editable-vector delivery path.
3. Define import acceptance checks:
   - File opens without Illustrator repair prompts.
   - Text/font substitution behavior is recorded.
   - Marks, labels, and legends remain visible and readable.
   - Required objects are selectable/editable where expected.
   - Transforms, clipping, grouping, and embedded styles do not invalidate the
     delivery requirement.
4. Preserve the original unmodified SVG and metadata beside any Illustrator
   edited export. Mark the edited file as terminal artwork.
5. Perform manual review on the Phase 3 Vega-Lite and ECharts SVG artifacts at
   a useful desktop size and a narrow review size.

**Exit criteria**

- The plugin makes only tested claims about editable-vector import and clearly
  excludes the raster Chart.js path.

### Phase 6 — Defer and bound the hand-drawn renderer question

**Objective:** Avoid treating a new Flint capability as parity remediation.

1. Keep `docs/plans/2026-08-15-flint-unrefined-svg.md` as historical failure
   evidence.
2. Do not add roughening dependencies, fonts, SVG filters, or post-SVG geometry
   mutation to this plugin for the parity release.
3. Reassess only after Phases 0-5 pass and a concrete user need remains.
4. If reassessment is approved, prepare a private design brief that evaluates
   ThemeSpec extension, a renderer-stage treatment API, and other
   transform-safe designs. Require deterministic output, semantic-role
   preservation, text accessibility, renderer-owned fixtures, and explicit
   backend scope.
5. Do not open an upstream issue, pull request, or external publication without
   separate authorization.

**Exit criteria**

- The release describes the current cartoon-like ThemeSpec styling honestly and
  makes no unsupported hand-drawn-renderer claim.

## Execution Tracker

| ID | Work item | Depends on | Status | Evidence required |
| --- | --- | --- | --- | --- |
| P0 | Capture live 0.5.0 runtime baseline | Approved private runtime | Complete | Verifier: 0.5.0, six tools, ten themes, resources/prompts, catalogs 35/37/22, and legacy compatibility patterns passed |
| P1 | Publish MCP capability matrix | P0 | Complete | `docs/flint-mcp-0.5.0-capability-matrix.md` links tag `0.5`, live catalog boundary, formats, themes, App scope, and exact registered types |
| P2 | Correct backend-qualified guidance | P1 | Complete | Tree, exact ECharts chart names, App, SVG/PNG, ThemeSpec, manifest, and demo-provenance statements corrected |
| P3 | Add artifact conformance fixtures | P0, P1 | Complete | `--artifacts` verifies Vega-Lite themed SVG, ECharts Tree SVG, and Chart.js PNG/SVG rejection |
| P4 | Relabel heart demo and add MCP evidence example | P1, P3 | Complete | Heart demo is labeled direct Vega-Lite; dedicated conformance-fixture reference documents reproducible MCP evidence |
| P5 | Define and execute Illustrator SVG acceptance | P3 | Deferred (optional) | The project has no Adobe Illustrator integration. The handoff contract remains available only if a future delivery needs editable-vector import evidence. |
| P6 | Decide whether to research a renderer treatment | P0-P5 | Deferred | Approved product requirement and design brief |

## Completion Definition

The work is complete when:

1. The live 0.5.0 MCP catalog, documentation, and tests agree.
2. Every current capability claim is qualified by the appropriate MCP surface,
   backend, format, and version.
3. Representative Vega-Lite, ECharts, and Chart.js artifacts are rendered and
   verified by the existing test infrastructure.
4. The direct Vega-Lite heart demo is not represented as MCP conformance.
5. Any future editable-Illustrator SVG handoff claim has manual acceptance evidence.
6. No release material describes ThemeSpec or a generic SVG postprocessor as a
   hand-drawn Flint renderer.

## Execution Log

| Date | Tracker ID | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-18 | — | Plan created | Research completed; no runtime, dependency, or source changes performed. |
| 2026-08-18 | P0 | Blocked | Restored `.vscode/mcp.json` from the byte-equivalent `plugin.json` and manifest declarations. Registry policy and manifest-integrity checks now pass. The private runtime is not provisioned: `C:\Users\fabioc\.copilot\plugin-data\alex-act-illustrator-plugin\runtime\node_modules\flint-chart-mcp\dist\cli.js` is absent. Provisioning remains consent-gated; no package, registry, or runtime state was changed. |
| 2026-08-18 | P0 | Awaiting approval | Previewed the configured `https://packagefeedproxy.microsoft.io/npm/` registry. Applying the existing setup flow will install `flint-chart-mcp@0.5.0`, `replicate-mcp@0.9.0`, and `@playwright/mcp@0.0.78` into the plugin-private runtime only; it will not install globally, override the registry, or edit `.npmrc`. |
| 2026-08-18 | P0 | Complete | Provisioned the approved private runtime and verified Flint 0.5.0: protocol `2024-11-05`, six tools, ten themes, two authoring resources, two prompts, 35/37/22 backend catalogs, and all seven legacy compatibility patterns. |
| 2026-08-18 | P1-P2 | Complete | Added the version-pinned capability matrix and corrected backend-qualified guidance: ECharts `Tree`, exact ECharts type names, Vega-Lite-only App/ThemeSpec behavior, SVG/PNG limits, and direct-Vega heart-demo provenance. |
| 2026-08-18 | P3-P4 | Complete | Added `--artifacts` conformance checks plus fixture documentation. The live runtime validated, compiled, and rendered Vega-Lite themed SVG and ECharts Tree SVG; Chart.js returned PNG and rejected SVG. |
| 2026-08-18 | P5 | Awaiting manual review | Added the SVG handoff contract and acceptance-record template. Automated SVG rendering is proven; Illustrator import, font substitution, selectability, and export still need human verification in the delivery version. |
| 2026-08-18 | P5 | Blocked | Read-only inspection found no `Illustrator.exe` in the standard `C:\Program Files\Adobe` or `C:\Program Files (x86)\Adobe` locations and no running Illustrator process. Complete the documented acceptance checklist on a target machine before claiming editable-vector delivery. |
| 2026-08-18 | P5 | Deferred (optional) | Confirmed that this is an agent visual-authoring plugin, not an Adobe Illustrator extension. SVG import acceptance is not required for Flint MCP parity and does not block the core release. |
