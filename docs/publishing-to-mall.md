# Publishing to the Alex ACT Plugin Mall

Step-by-step runbook for vendoring this plugin (or a new version of it) into the [Alex ACT Plugin Mall](https://github.com/fabioc-aloha/Alex_Skill_Mall). Complete this when:

- (a) Publishing this plugin to the Mall for the first time
- (b) Shipping a new version — `manifest.json` bumped, `CHANGELOG.md` entry added
- (c) Refreshing the Mall's vendored README or docs after upstream doc edits (no version bump)

The Mall vendors a **snapshot** of this repo at a specific commit. It does **not** auto-track — you must run this runbook (or wait for the Mall's weekly automated catalog-refresh cron to pick up changes).

## Prerequisites

1. **Local clone of the Mall repo** at `..\Alex_ACT_Plugin_Mall\` (sibling to this repo). If not present:

   ```pwsh
   cd ..
   gh repo clone fabioc-aloha/Alex_Skill_Mall Alex_ACT_Plugin_Mall
   ```

2. **`gh` authenticated as an account with write access** to `fabioc-aloha/Alex_Skill_Mall`. Verify:

   ```pwsh
   gh auth status
   ```

   Expected: at least one active account showing `repo` and `workflow` scopes.

3. **This repo's `main` branch clean and pushed**:

   ```pwsh
   git -C C:\Development\flint-chart-plugin status --short   # should be empty
   git -C C:\Development\flint-chart-plugin rev-list --left-right --count 'origin/main...HEAD'   # should be "0  0"
   ```

4. **Version numbers aligned** between `manifest.json` and `CHANGELOG.md`:

   ```pwsh
   (Get-Content C:\Development\flint-chart-plugin\manifest.json -Raw | ConvertFrom-Json).version
   (Select-String -Path C:\Development\flint-chart-plugin\CHANGELOG.md -Pattern '^## \[' | Select-Object -First 1).Line
   ```

   Both should show the same version.

## Mall submission shape

The Mall vendors plugin files under `plugins/data-analytics/flint-chart-plugin/`. **Note the paths differ from this repo** — the Mall drops the `.github/` prefix and puts skills and prompts under `skills/` and `prompts/` at the plugin folder root:

```text
Alex_ACT_Plugin_Mall/plugins/data-analytics/flint-chart-plugin/
├── plugin.json              Mall-specific manifest (NOT this repo's manifest.json)
├── README.md                Vendored copy of this repo's top-level README.md
├── mcp.json                 Byte-identical copy of this repo's mcp.json
├── skills/
│   ├── chart-big-idea/SKILL.md
│   └── flint-chart/SKILL.md
└── prompts/
    └── render-chart.prompt.md
```

Do **not** vendor `assets/`, `demos/`, `docs/`, `LICENSE`, `CHANGELOG.md`, `.gitignore`, or `.markdownlintignore` — those live only in this repo.

## Steps

### 1. Refresh the Mall clone

```pwsh
cd C:\Development\Alex_ACT_Plugin_Mall
git pull --rebase origin main
```

Weekly `[behaviour] catalog refresh` commits often land automatically — always rebase before starting to avoid a diverging-branch merge later.

### 2. Copy the current asset files into the Mall

```pwsh
$up = 'C:\Development\flint-chart-plugin'
$ma = 'C:\Development\Alex_ACT_Plugin_Mall\plugins\data-analytics\flint-chart-plugin'

# Ensure target folder structure exists
New-Item -ItemType Directory -Force -Path "$ma\skills\chart-big-idea" | Out-Null
New-Item -ItemType Directory -Force -Path "$ma\skills\flint-chart"    | Out-Null
New-Item -ItemType Directory -Force -Path "$ma\prompts"               | Out-Null

# Copy the four installable payload files byte-for-byte
Copy-Item "$up\.github\skills\chart-big-idea\SKILL.md" -Destination "$ma\skills\chart-big-idea\SKILL.md" -Force
Copy-Item "$up\.github\skills\flint-chart\SKILL.md"     -Destination "$ma\skills\flint-chart\SKILL.md"    -Force
Copy-Item "$up\.github\prompts\render-chart.prompt.md"  -Destination "$ma\prompts\render-chart.prompt.md" -Force
Copy-Item "$up\mcp.json"                                -Destination "$ma\mcp.json"                       -Force

# Copy the README (Mall renders this on the plugin's page)
Copy-Item "$up\README.md" -Destination "$ma\README.md" -Force
```

### 3. Rewrite image references in the vendored README

The Mall does **not** vendor the `assets/` folder — the vendored README must use absolute `raw.githubusercontent.com` URLs for images that would otherwise resolve to `assets/…`. This lets the vendored copy stay self-contained AND auto-track upstream image changes without re-vendoring.

```pwsh
$readmePath = "$ma\README.md"
$content = Get-Content $readmePath -Raw
$new = $content -replace 'src="assets/', 'src="https://raw.githubusercontent.com/fabioc-aloha/flint-chart-plugin/main/assets/'
Set-Content -Path $readmePath -Value $new -Encoding UTF8 -NoNewline
# Verify: should show no remaining "src=\"assets/" refs
(Select-String -Path $readmePath -Pattern 'src="assets/' -AllMatches).Matches.Count
```

Expected output: `0`.

### 4. Update the Mall's plugin.json

The Mall's `plugin.json` is _not_ a copy of this repo's `manifest.json` — it uses the Mall's own schema. Key fields to verify:

- `version` — must match this repo's `manifest.json` version
- `upstream.repo` — `https://github.com/fabioc-aloha/flint-chart-plugin`
- `upstream.ref` — usually `main`; can be a specific commit SHA if pinning
- `artifacts.skills`, `artifacts.prompts`, `artifacts.mcp` — paths _inside the Mall folder_ (e.g. `skills/chart-big-idea/SKILL.md`, not `.github/skills/…`)
- `install_paths.*` — where a heir installs each artifact (`.github/skills/local/…`, etc.)
- `frontmatter.description` under each asset — copy the current description from the source file's frontmatter

Open the current file at `Alex_ACT_Plugin_Mall\plugins\data-analytics\flint-chart-plugin\plugin.json` for the template. Update `version` and any frontmatter descriptions that changed since last publish.

### 5. Append a curation-log entry

`Alex_ACT_Plugin_Mall/docs/curation-log.md` is append-only. Add one row using the table format at the top of that file:

| Column           | Value                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Date             | Today's date, `YYYY-MM-DD`                                                                                                             |
| Tag              | `` `[PLUGIN-UPDATE]` `` for version bump, `` `[PLUGIN-ADDITION]` `` for first publish, `` `[PLUGIN-DOC-REFRESH]` `` for docs-only sync |
| Source / trigger | What surfaced the update — new version, docs improvement, etc.                                                                         |
| Decision         | `S — accept` with a one-sentence rationale                                                                                             |
| Evidence         | Commit SHA in this repo + short summary                                                                                                |

The tag vocabulary is defined at the top of `curation-log.md`. `[PLUGIN-ADDITION]` covers this plugin's initial submission (already logged 2026-07-24) — for subsequent updates use `[PLUGIN-UPDATE]` or `[PLUGIN-DOC-REFRESH]`.

### 6. Verify before commit

```pwsh
# All Mall pending changes
git -C C:\Development\Alex_ACT_Plugin_Mall status --short

# Vendored files should be byte-identical to upstream (except README + plugin.json)
foreach ($p in @(
  @('.github\skills\chart-big-idea\SKILL.md', 'skills\chart-big-idea\SKILL.md'),
  @('.github\skills\flint-chart\SKILL.md',     'skills\flint-chart\SKILL.md'),
  @('.github\prompts\render-chart.prompt.md',  'prompts\render-chart.prompt.md'),
  @('mcp.json',                                 'mcp.json')
)) {
  $uh = (Get-FileHash "$up\$($p[0])").Hash.Substring(0, 12)
  $mh = (Get-FileHash "$ma\$($p[1])").Hash.Substring(0, 12)
  "$(if($uh -eq $mh){'IDENT'}else{'DIFF '})  $($p[0])"
}

# plugin.json + README parse OK
Get-Content "$ma\plugin.json" -Raw | ConvertFrom-Json | Select-Object name, version

# plugin.json version matches upstream manifest.json version
$upVersion = (Get-Content "$up\manifest.json" -Raw | ConvertFrom-Json).version
$maVersion = (Get-Content "$ma\plugin.json" -Raw | ConvertFrom-Json).version
"upstream=$upVersion  mall=$maVersion  $(if($upVersion -eq $maVersion){'MATCH'}else{'MISMATCH — fix plugin.json before commit'})"
```

All four vendored payload files should report `IDENT`. `plugin.json` should parse and return the correct `name` + `version`, and the version-consistency line should report `MATCH`.

### 7. Commit and push

```pwsh
cd C:\Development\Alex_ACT_Plugin_Mall

git add -A
git commit -m "[behaviour] flint-chart-plugin - vendor v<X.Y.Z>" `
           -m "Sync from upstream fabioc-aloha/flint-chart-plugin@<short-sha>. Byte-identical vendoring of the four installable payload files (2 skills + 1 prompt + mcp.json). README updated to use absolute raw.githubusercontent.com URLs for image references (Mall does not vendor the assets/ folder). Curation-log entry [PLUGIN-UPDATE] appended."

# Rebase against origin one more time in case the weekly cron landed while you were working
git pull --rebase origin main

git push origin main
```

Use `[typo]` instead of `[behaviour]` for doc-only refreshes with no version bump.

### 8. Verify the Mall reflects the update

```pwsh
gh api repos/fabioc-aloha/Alex_Skill_Mall/contents/plugins/data-analytics/flint-chart-plugin --jq '.[] | "\(.type)\t\(.size)\t\(.name)"'
gh api repos/fabioc-aloha/Alex_Skill_Mall/commits/main --jq '.sha[0:10] + "  " + .commit.message'
```

The commit message should be the one you just pushed. The file listing should show the updated file sizes.

## Verification checklist

Before declaring the publish complete:

- [ ] Byte-identical vendored files (2 skills, 1 prompt, mcp.json) — `Get-FileHash` matches
- [ ] `plugin.json` version matches upstream `manifest.json` version
- [ ] Mall README image `src` attributes use `raw.githubusercontent.com/...` (no `src="assets/…"` remains)
- [ ] Curation-log entry present with today's date and correct tag
- [ ] Commit tagged appropriately (`[behaviour]` version bump, `[typo]` doc-only, `[PLUGIN-ADDITION]` first publish)
- [ ] Rebased on `origin/main` before push
- [ ] Push successful — `gh api commits/main` shows the new commit SHA

## Common gotchas

- **`gh repo create --push` uses SSH by default.** When creating a new sibling repo, `gh` configures `origin` as `git@github.com:…` — which needs SSH keys. If keys aren't set up, the initial push fails silently. Fix: `git remote set-url origin https://github.com/<owner>/<repo>.git` and re-push. `gh`'s HTTPS credential helper handles auth automatically once the URL is HTTPS.
- **Mall README drift is expected between publishes.** The vendored README is a snapshot at publish time; subsequent doc-only edits in this repo won't reach the Mall until the next explicit publish (or the weekly automated catalog-refresh cron, whichever comes first).
- **Weekly catalog-refresh cron.** The Mall runs an automated `[behaviour] catalog refresh` commit weekly. Always rebase before push (Step 1 does this before you start, and Step 7 does it again — both are cheap).
- **Backtick hazard on commit messages.** Multi-line commit messages containing backticks require a temp file: `git commit -F <tempfile>` instead of ``-m "…`…`…"``. See Alex ACT Edition's `terminal-command-safety.instructions.md` for the full pattern. In practice, if the message is short and backtick-free, `-m "…" -m "…"` works fine.

## What NOT to include in the Mall

- `assets/` — README-only, and the Mall vendored README references them via absolute URL instead
- `demos/` — capability-demo reports, tied to this repo's structure
- `docs/` — internal design docs and this publishing runbook itself
- `LICENSE`, `CHANGELOG.md` — remain in this repo only
- `.gitignore`, `.markdownlint.json`, `.markdownlintignore`, `.github/copilot-instructions.md` — repo-tooling, not shipping payload

## Related

- Alex ACT Plugin Mall repo: <https://github.com/fabioc-aloha/Alex_Skill_Mall>
- Full plan for the first publish (with locked-decisions table): [`plans/2026-07-24-mall-plugin.md`](plans/2026-07-24-mall-plugin.md)
- Repo conventions for AI agents: [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md)
