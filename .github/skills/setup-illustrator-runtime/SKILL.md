---
name: setup-illustrator-runtime
description: "Audit Illustrator's stable Flint, Replicate, and Playwright MCP versions through npm's configured registry, install exact reviewed pins once, and verify direct Node runtime readiness. Use when checking for MCP updates, after installing or updating Illustrator, or when private runtime state is missing."
lastReviewed: 2026-08-14
---

# Setup Illustrator Runtime

Install Illustrator's three exact MCP package closures once, using the npm registry the user has already approved. Runtime launches call a plugin-private Node shim and do not start npm or npx.

## Procedure

1. Resolve this skill's `scripts/provision-runtime.mjs` path inside the installed plugin.
2. For an update audit, run it with `--check-updates`. This compares each exact pin with `dist-tags.latest` through npm's configured registry and makes no changes.
3. If a stable update exists, stop. Run the package's compatibility checks, update source pins and guidance together, and release through the governed plugin flow. Never auto-upgrade private runtime state ahead of source.
4. For setup, run the script without flags. It prints the effective `npm config get registry`, exact package set, and mutation boundary.
5. Show that preview to the user and ask whether to apply it. Plugin installation is not consent for a separate package-network operation.
6. On approval, rerun the same script with `--apply`.
7. Reload the host so its MCP processes restart through the direct Node launcher.
8. From the plugin root, run `node scripts/verify-install.mjs`. Add `--all-mcps` when Replicate and Playwright are configured and their prerequisites are available.

The provisioner installs nothing globally and never passes `--registry` or edits `.npmrc`. Microsoft-configured npm uses the internal proxy; external users keep their own approved registry.

## Expected Packages

| Pinned package | Runtime role |
| --- | --- |
| `flint-chart-mcp@0.5.1` | Required chart rendering, Calendar Heatmap support on Vega-Lite and ECharts, ThemeSpec discovery, and version-matched chart/theme authoring resources |
| `replicate-mcp@0.9.0` | Optional AI image generation |
| `@playwright/mcp@0.0.78` | Optional browser verification |

## Failure Handling

| Signal | Action |
| --- | --- |
| Registry is unexpected | Stop. Correct npm configuration outside this skill, then preview again. |
| Provisioning fails | Report npm's error without adding a registry override. |
| Runtime reports missing private state | Run this skill again; do not replace the launcher with npx. |
| Runtime reports a version mismatch | Re-run the reviewed source version through this skill; never launch stale private state. |
| `--check-updates` reports a stable update | Run Illustrator's compatibility review before changing the pin or provisioning set. |

## Anti-Patterns

| Anti-pattern | Correction |
| --- | --- |
| Detect Microsoft network and inject a registry | npm configuration is the authority; network location is not. |
| Run `npm install -g` | Global binaries can collide, especially Replicate's generic `mcp-server` name. |
| Restore npx after a missing-runtime error | Re-provision once; runtime remains direct. |
| Apply before showing the registry and package set | Preview first, then obtain explicit consent. |
| Auto-install a newer stable version discovered by the audit | Compatibility first, then source update and release; runtime never outruns reviewed source. |

## Would Revise If

Revise by **2026-11-10** if a supported host cannot launch the private runtime directly, a direct launch starts npm or npx, or two users complete setup but later receive unexplained missing-runtime failures.
