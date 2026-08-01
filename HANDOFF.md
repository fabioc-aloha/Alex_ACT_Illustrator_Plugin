# Session Handoff

Last updated: 2026-08-01

## Current State

- Illustrator remains on `flint-chart-mcp@0.3.0` until the approved npm registry carries a later version that passes the compatibility suite.
- MCP package specs are exact: Flint `0.3.0`, Replicate MCP `0.9.0`, Playwright MCP `0.0.78`.
- Every MCP invocation uses `--prefer-offline`: cache first, then npm's configured registry only.
- `scripts/verify-install.mjs` rejects loose package versions and any hardcoded `registry.npmjs.org` reference in `.vscode/mcp.json`, `plugin.json`, or `manifest.json`.

## Registry Boundary

Do not probe, compare, or override the public npm registry from a corporate machine.

- Do not pass `--registry` to npm or npx.
- Do not edit `.npmrc` to bypass the configured registry.
- Do not run latest-version discovery as part of install, startup, verification, or session checks.
- Missing exact packages fail closed. There is no fallback to another registry or a GitHub tarball.
- Version upgrades are explicit release decisions after the approved registry contains the candidate and `node scripts/verify-install.mjs --catalog --compat` passes.

## Verification

```pwsh
node scripts/verify-install.mjs --catalog --compat
```

Expected first line:

```text
OK    npm registry policy: exact pins, cache-first, configured registry only
```

The verifier must then report Flint `0.3.0`, five tools, three backends, and valid documented spec patterns.

## Pending

- Publish the registry-policy changes through the normal plugin release and Mall vendor workflow when approved.
- Re-evaluate Flint only when the configured registry carries the candidate version. Do not use public npm availability as a release trigger.

## Resume Point

Start by running the verifier. If registry policy fails, repair the three source manifests together before any release or Mall refresh.
