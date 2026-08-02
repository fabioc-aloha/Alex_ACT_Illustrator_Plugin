# Install the Alex ACT Constellation

This guide installs Alex ACT for an end user, activates Core's instruction
layer, and verifies the complete constellation. Core is the required baseline;
the other plugins are selected according to the work you do.

## Published Versions

Last verified: 2026-08-02.

| Component | Version | Distribution |
| --- | --- | --- |
| Core | `0.6.6` | `alex-act-core@alex-mall` |
| Illustrator | `0.6.5` | `alex-act-illustrator-plugin@alex-mall` |
| Enterprise | `0.1.5` | `alex-act-enterprise@alex-mall` |
| MSFT | `0.1.4` | Private direct install, tenant-gated |

## Prerequisites

- Copilot CLI `1.0.75` or newer.
- Git available on `PATH`.
- VS Code with GitHub Copilot Chat, or another Copilot CLI host.
- GitHub authentication through `gh auth` only when installing private MSFT.
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

## 2. Install Core

Install the required baseline plugin:

```powershell
copilot plugin install alex-act-core@alex-mall
copilot plugin list
```

The list must show `alex-act-core@alex-mall` at the published version above.
If it does not, refresh `alex-mall` and investigate before continuing.

## 3. Complete Constellation Setup

Reload your host, start a new Copilot Chat conversation, and invoke:

```text
/alex-act-core install-constellation
```

The guided flow offers these components:

| Component | Choose it when |
| --- | --- |
| Core | Always. It supplies Alex's baseline identity and ACT discipline. |
| Illustrator | You author charts, figures, imagery, visual reports, or documentation shells. |
| Enterprise | Your projects use the public Azure, Fabric, Power BI, or Microsoft 365 plugin ecosystem. |
| MSFT | You are a Microsoft employee on the corporate network and need internal Agency, WorkIQ, or organization-reporting capability. |

MSFT is private. The setup flow must confirm both Microsoft employment and
corporate-network access before offering its direct GitHub installation.

## 4. Activate Core's Instruction Layer

Plugin installation makes Core's skills and namespaced commands available, but
Copilot plugins do not load instruction files directly. During
`/alex-act-core install-constellation`, separately review and approve the
17-file user-scope instruction bootstrap.

Before approving:

1. Review the exact destination files under `~/.copilot/instructions/`.
2. Review the workspace-overlap report.
3. Confirm that user-scope instructions should apply across every workspace on
   the machine.

Reload the host after installing new plugins or instruction files.

## 5. Verify the Four Activation Planes

Start a new conversation and invoke:

```text
/alex-act-core plugin-status
```

Confirm each plane independently:

| Plane | Expected evidence |
| --- | --- |
| `installed` | Plugin files and `plugin.json` report the published version. |
| `enabled` | The exact plugin key is enabled at the intended scope. |
| `instruction-loaded` | The Core receipt owns 17 files whose versions and hashes match. |
| `skill-invokable` | The namespaced command runs, or reports `host-limited` with a healthy installed-file fallback. |

If plugin files are current but the instruction receipt or hashes drifted,
invoke `/alex-act-core install-constellation` again and take the compact
bootstrap-only repair path.

## 6. Configure Optional Workloads

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

## 7. Keep the Constellation Current

Use Core's guided update flow:

```text
/alex-act-core update-plugins
```

Review each changelog and consent separately to breaking updates. After a Core
update, invoke `/alex-act-core install-constellation` again so the user-scope
instruction receipt and hashes are checked against the newly installed Core.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `os error 5` or `os error 32` during a plugin write | Close all VS Code windows and retry from a standalone terminal. |
| A public plugin version is stale | Run `copilot plugin marketplace update alex-mall`, then retry the targeted install or update. |
| Core skills exist but ACT instructions do not fire | Invoke `/alex-act-core install-constellation` and approve the separate instruction bootstrap. |
| A generic skill call fails while the namespaced command exists | Use the namespaced command; report the generic bridge as `host-limited`, not missing. |
| MSFT installs but internal tools fail | Confirm Microsoft corporate identity and network access, then run `/alex-act-msft setup-msft` in audit mode. |

## Expected End State

- [ ] Core is installed from `alex-mall` at the published version.
- [ ] Selected specialization plugins are installed and enabled.
- [ ] The 17-file Core instruction bootstrap is verified or explicitly
  declined.
- [ ] All four activation planes are reported separately.
- [ ] Optional workload configuration is limited to the projects that need it.
