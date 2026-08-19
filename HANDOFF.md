# Session Handoff

Last updated: 2026-08-18

## Current State

- Published release remains `v2.3.1`. Source is an unreleased `2.4.0` candidate;
  do not describe it as published until its commit, tag, GitHub Release, and Mall
  origin record agree.
- The candidate carries fifteen skills, four prompts, seven authoring areas, and
  three MCP sidecars. `annotate-screenshot` is the new fifteenth skill; Pillow is
  its only hard dependency, and `image-annotations` remains optional.
- Exact runtime package specs remain Flint `0.5.0`, Replicate MCP `0.9.0`, and
  Playwright MCP `0.0.78`, launched directly from plugin-private state.
- The 2.4.0 candidate passed the language check and the 35-test install and
  contract suite. The suite exercises compatibility, catalog parsing, malformed
  runtime output, artifact conformance, and negative paths.
- DPI metadata is not treated as proof of source scale. Raster annotation uses
  pixel dimensions, intended display size, and visual inspection to decide
  whether upscaling is needed.

## Registry Boundary

Do not probe, compare, or override the public npm registry from a corporate machine.

- Do not pass `--registry` to npm or npx.
- Do not edit `.npmrc` to bypass the configured registry.
- Do not run latest-version discovery as part of install, startup, verification, or session checks.
- Missing exact packages fail closed. There is no fallback to another registry or a GitHub tarball.
- Version upgrades are explicit release decisions after the approved registry contains the candidate and `node scripts/verify-install.mjs --catalog --compat` passes.

## Verification

```pwsh
node scripts/check-language.mjs
node --test scripts/test-verify-install.mjs
node scripts/verify-contract.mjs
node scripts/verify-install.mjs --catalog --compat
```

Expected first line:

```text
OK    npm registry policy: exact pins, provisioned cache, offline runtime
```

The verifier must report Flint `0.5.0`, six tools, ten themes, both authoring
resources and prompts, three backends, and valid documented spec patterns.

## Pending

- Inspect the complete candidate diff and confirm no unrelated work is staged.
- Decide whether launch requires hosted CI; this repository currently has no
  `.github/workflows/` directory.
- Commit and push the source candidate only after all local gates pass.
- Tag, publish the GitHub Release, and advance the Mall origin record only under
  separate release authorization.

## Resume Point

Finish the local 2.4.0 candidate review. Preserve `v2.3.1` as the public-release
claim until publication is complete. Do not mutate the installed private runtime
without separate approval.
