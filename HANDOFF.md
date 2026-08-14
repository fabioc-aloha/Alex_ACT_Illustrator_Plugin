# Session Handoff

Last updated: 2026-08-14

## Current State

- Release source targets `v2.1.0` with `flint-chart-mcp@0.5.0`; installed runtime remains at `0.4.1` until separate provisioning approval.
- MCP package specs in source are exact: Flint `0.5.0`, Replicate MCP `0.9.0`, Playwright MCP `0.0.78`.
- Source now carries thirteen skills, including thin `flint-theme` composition, and an expert `/render-chart` workflow that explores familiar and expressive treatments over one semantic truth layer.
- A disposable 2026-08-14 source canary passed Flint `0.5.0`, protocol `2024-11-05`, six tools, ten themes, two authoring resources, two prompts, catalogs `35/37/22`, all seven compatibility specs, and temporary cleanup.
- MCP packages install once through npm's configured registry; every runtime invocation uses the plugin-private Node launcher and fails closed on missing runtime state.
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
OK    npm registry policy: exact pins, provisioned cache, offline runtime
```

The verifier must report Flint `0.5.0`, six tools, ten themes, both authoring resources and prompts, three backends, and valid documented spec patterns.

## Pending

- Commit, push, release, and Mall publication are approved for the coordinated release pass.
- Installed-runtime provisioning and canary execution remain separately gated until publication is coherent.

## Resume Point

Publish source and Mall records first. Do not mutate the installed private runtime until source, tag, GitHub Release, and Mall origin are coherent.
