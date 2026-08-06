import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export function resolveWindowsCommand(command, {
  platform = process.platform,
  locate = spawnSync,
} = {}) {
  if (platform !== 'win32') return command;
  const result = locate('where.exe', [command], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  if (result.status !== 0) return command;
  const candidates = String(result.stdout || '').split(/\r?\n/).filter(Boolean);
  return candidates.find((candidate) => /\.cmd$/i.test(candidate))
    || candidates.find((candidate) => /\.exe$/i.test(candidate))
    || candidates.find((candidate) => /\.bat$/i.test(candidate))
    || candidates[0]
    || command;
}

export function spawnCommand(command, args, options = {}, {
  platform = process.platform,
  locate = spawnSync,
  launch = spawn,
  fileExists = existsSync,
} = {}) {
  const resolved = resolveWindowsCommand(command, { platform, locate });
  if (platform === 'win32' && /\.cmd$/i.test(resolved)) {
    if (command.toLowerCase() !== 'npx') {
      throw new Error(`refusing shell execution for unsupported command shim: ${resolved}`);
    }
    const cli = join(dirname(resolved), 'node_modules', 'npm', 'bin', 'npx-cli.js');
    if (!fileExists(cli)) throw new Error(`npx CLI entry point not found beside shim: ${cli}`);
    return launch(process.execPath, [cli, ...args], { ...options, shell: false });
  }
  return launch(resolved, args, { ...options, shell: false });
}
