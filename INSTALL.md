# Install the Alex ACT Constellation

This guide installs Alex ACT for an end user, activates Core's instruction
layer, and verifies the complete constellation. Manager is the preferred
lifecycle owner; Core remains the compatible baseline and command surface. The
other plugins are selected according to the work you do.

## Published Versions

Last verified: 2026-08-04.

| Component | Version | Distribution |
| --- | --- | --- |
| Manager | `0.3.3` | `alex-act-manager@alex-mall` |
| Core | `0.8.1` | `alex-act-core@alex-mall` |
| Illustrator | `0.6.5` | `alex-act-illustrator-plugin@alex-mall` |
| Enterprise | `0.1.5` | `alex-act-enterprise@alex-mall` |
| MSFT | `0.2.0` | Private direct install, tenant-gated |

## Prerequisites

- Copilot CLI `1.0.75` or newer.
- Git available on `PATH`.
- VS Code with GitHub Copilot Chat, or another Copilot CLI host.
- A Microsoft enterprise-managed GitHub identity with explicit access to
  `fabioc_microsoft/alex-act-msft` when installing private MSFT.
- Microsoft corporate identity and network access when installing MSFT.

Check the tools:

```powershell
copilot --version
git --version
gh auth status
```

## 1. Register the Alex ACT Mall

Register the public marketplace once per machine:

```powershell
copilot plugin marketplace add fabioc-aloha/Alex_Skill_Mall
copilot plugin marketplace update alex-mall
```

## 2. Install the Brain Spine

Install Manager and Core. Neither is optional at workspace scope:

```powershell
copilot plugin install alex-act-manager@alex-mall
copilot plugin install alex-act-core@alex-mall
copilot plugin list
```

The list must show both plugins at their published versions. If either is
absent, refresh `alex-mall` and investigate before continuing.

## 3. Complete Constellation Setup

Reload your host, start a new Copilot Chat conversation, and invoke:

```text
/alex-act-manager install-constellation
```

The Core command remains a compatibility redirect to Manager. The Manager flow
treats user settings, the 17-file instruction bootstrap, current-workspace
files, optional workspace capabilities, and private identifiers as separate
consent decisions.

After the bootstrap is healthy, configure the current repository with:

```text
/alex-act-manager configure-workspace-capabilities
```

Preview is the default. Manager pins Manager and Core to `true`, deep-merges
only explicit optional selections, and reports remaining VS Code plugin/MCP
workspace reconciliation.

The guided flow offers these components:

| Component | Choose it when |
| --- | --- |
| Core | Always. It supplies Alex's baseline identity and ACT discipline. |
| Illustrator | You author charts, figures, imagery, visual reports, or documentation shells. |
| Enterprise | Your projects use the public Azure, Fabric, Power BI, or Microsoft 365 plugin ecosystem. |
| MSFT | You are a Microsoft employee on the corporate network and need internal Agency, WorkIQ, or organization-reporting capability. |

MSFT is private. The setup flow must confirm Microsoft employment,
corporate-network access, and an active Microsoft-managed GitHub account that
can read `fabioc_microsoft/alex-act-msft` before direct installation. External
personal accounts cannot access the managed repository.

## 4. Review User Settings

The Manager flow can preview a portable VS Code user baseline from
`plugin-management/resources/welcome-baseline.json`. Core keeps the compatible
copy at `.github/config/welcome-baseline.json`. Apply it only after separate
consent.

- Object-valued location maps are deep-merged. Unrelated settings keys remain
  unchanged.
- Absolute local user-scope `markdown.styles` paths are reported, not removed
  without separate consent. They are not supported generic guidance.
- Comment-rich JSONC fails closed for automatic apply. Manually merge the
  reported keys in VS Code to preserve comments.

## 5. Set Up the Current Workspace

The workspace bootstrap is separately consented. It copies
`.vscode/markdown-light.css`, sets a relative `markdown.styles` value only
when absent, and narrows a broad `.vscode` ignore rule when needed.

Existing CSS and custom workspace settings are preserved by default. To replace
a differing CSS file, first preview with `--refresh-css`, then explicitly apply
with `--apply`.

## 6. Activate Core's Instruction Layer

Plugin installation makes Core's skills and namespaced commands available, but
Copilot plugins do not load instruction files directly. During
`/alex-act-manager install-constellation`, separately review and approve the
17-file user-scope instruction bootstrap.

Before approving:

1. Review the exact destination files under `~/.copilot/instructions/`.
2. Review the workspace-overlap report.
3. Confirm that user-scope instructions should apply across every workspace on
   the machine.

Reload the host after installing new plugins or instruction files.

## 7. Verify the Six Activation Planes

Start a new conversation and invoke:

```text
/alex-act-manager plugin-status
```

Confirm each plane independently:

| Plane | Expected evidence |
| --- | --- |
| `installed` | Plugin files and `plugin.json` report the published version. |
| `enabled` | The exact plugin key is enabled at the intended scope. |
| `instruction-loaded` | The Core receipt owns 17 files whose versions and hashes match. |
| `skill-invokable` | The namespaced command runs, or reports `host-limited` with a healthy installed-file fallback. |
| `user-settings` | The consented user baseline merge is verified, or a manual JSONC merge remains pending. |
| `workspace` | The workspace bootstrap preserves local settings and reports CSS parity. |

If plugin files are current but the instruction receipt or hashes drifted,
invoke `/alex-act-manager install-constellation` again and take the compact
bootstrap-only repair path.

## 8. Configure Optional Workloads

Use the installed namespaced commands for the workloads you selected:

```text
/alex-act-core bootstrap-workspace
/alex-act-illustrator-plugin install-visual-companions
/alex-act-enterprise setup-enterprise
/alex-act-msft setup-msft
```

- `bootstrap-workspace` previews repository-scoped Markdown and workspace
  settings before asking to apply them.
- Illustrator companions are optional and individually consented.
- Enterprise defaults its downstream Microsoft plugins to repository scope.
- MSFT setup is user-scoped and must fail closed off Microsoft's corporate
  network.
- Agency project skills are not runnable merely because the plugin is
  installed. Run `agency config get profiles`; a missing `profiles` key means
  `installed-unconfigured`, and each configured profile still needs a harmless
  MCP/auth smoke check.

## 9. Keep the Constellation Current

Use Manager's preferred guided update flow:

```text
/alex-act-manager update-plugins
```

Review each changelog and consent separately to breaking updates. After a Core
update, invoke `/alex-act-manager install-constellation` again so the
user-scope instruction receipt and hashes are checked against the newly
installed Core. Core's `/alex-act-core update-plugins` and
`/alex-act-core install-constellation` remain available as compatibility
commands.

## VS Code 1.131 Skill Resolver Workaround

VS Code 1.131 advertises plugin skills that its generic resolver cannot load.
Preserve Agent Skills while disabling only that broken resolver in user
settings:

```jsonc
{
  "chat.useAgentSkills": true,
  "github.copilot.chat.skillTool.enabled": false
}
```

This is a temporary workaround for [microsoft/vscode#314772](https://github.com/microsoft/vscode/issues/314772).
Reload VS Code or start a new Agent chat after changing the setting. Namespaced
commands remain the fallback when a generic skill call is unavailable.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `os error 5` or `os error 32` during a plugin write | Close all VS Code windows and retry from a standalone terminal. |
| A public plugin version is stale | Run `copilot plugin marketplace update alex-mall`, then retry the targeted install or update. |
| Core skills exist but ACT instructions do not fire | Invoke `/alex-act-manager install-constellation` and approve the separate instruction bootstrap. |
| Automatic user-settings apply stops on JSONC | Manually merge the reported keys in VS Code; comments are preserved. |
| Workspace CSS differs from the bundled stylesheet | Preview `--refresh-css`, then use `--apply` only if replacement is intended. |
| A generic skill call fails while the namespaced command exists | Use the namespaced command; report the generic bridge as `host-limited`, not missing. |
| MSFT installs but internal tools fail | Confirm Microsoft corporate identity and network access, then run `/alex-act-msft setup-msft` in audit mode. |

## Expected End State

- [ ] Core is installed from `alex-mall` at the published version.
- [ ] Selected specialization plugins are installed and enabled.
- [ ] The 17-file Core instruction bootstrap is verified or explicitly
  declined.
- [ ] User settings are merged only with consent, or a JSONC-safe manual merge
  is reported.
- [ ] The current workspace preserves its settings and reports CSS parity.
- [ ] All six activation planes are reported separately.
- [ ] Optional workload configuration is limited to the projects that need it.
