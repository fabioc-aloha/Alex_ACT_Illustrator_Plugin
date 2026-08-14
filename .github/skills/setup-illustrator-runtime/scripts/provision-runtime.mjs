#!/usr/bin/env node

import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawnCommand } from '../../../../scripts/process-launch.mjs';

const PINNED_PACKAGES = [
  { name: 'flint-chart-mcp', version: '0.5.0' },
  { name: 'replicate-mcp', version: '0.9.0' },
  { name: '@playwright/mcp', version: '0.0.78' },
];
const PACKAGES = PINNED_PACKAGES.map(({ name, version }) => `${name}@${version}`);
const APPLY = process.argv.includes('--apply');
const CHECK_UPDATES = process.argv.includes('--check-updates');
const rootArgIndex = process.argv.indexOf('--runtime-root');
const RUNTIME_ROOT = rootArgIndex >= 0
  ? resolve(process.argv[rootArgIndex + 1] ?? '')
  : join(homedir(), '.copilot', 'plugin-data', 'alex-act-illustrator-plugin', 'runtime');
const consumed = new Set(['--apply', '--check-updates']);
if (rootArgIndex >= 0) {
  consumed.add('--runtime-root');
  consumed.add(process.argv[rootArgIndex + 1]);
}
const unknownArgs = process.argv.slice(2).filter((arg) => !consumed.has(arg));

if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(2);
}
if (APPLY && CHECK_UPDATES) {
  console.error('--apply and --check-updates are separate operations');
  process.exit(2);
}

function run(command, args, { capture = false, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      cwd: join(dirname(fileURLToPath(import.meta.url)), '..'),
      env: {
        ...process.env,
        NO_UPDATE_NOTIFIER: '1',
        NPM_CONFIG_PROGRESS: 'false',
        ...env,
      },
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
  });
}

try {
  const registryResult = await run('npm', ['config', 'get', 'registry'], { capture: true });
  const registry = registryResult.stdout.trim();
  if (!registry) throw new Error('npm returned an empty configured registry');

  console.log(`mode:     ${APPLY ? 'apply' : 'preview'}`);
  console.log(`registry: ${registry}`);
  console.log(`runtime:  ${RUNTIME_ROOT}`);
  console.log('packages:');
  for (const packageSpec of PACKAGES) console.log(`  - ${packageSpec}`);
  console.log('policy:   exact versions; configured registry install; direct Node runtime');

  if (CHECK_UPDATES) {
    console.log('\nstable version audit:');
    let updates = 0;
    for (const pinned of PINNED_PACKAGES) {
      const result = await run('npm', [
        'view',
        pinned.name,
        'dist-tags.latest',
        '--json',
        '--prefer-offline',
      ], {
        capture: true,
        env: { NPM_CONFIG_REGISTRY: registry },
      });
      const latest = JSON.parse(result.stdout.trim());
      const current = latest === pinned.version;
      if (!current) updates += 1;
      console.log(`  ${current ? 'current' : 'UPDATE '} ${pinned.name}: ${pinned.version} -> ${latest}`);
    }
    console.log(updates === 0
      ? '\nAll bundled MCP pins match their stable dist-tags.'
      : `\n${updates} stable update(s) require compatibility review before changing source pins.`);
    process.exit(0);
  }

  if (!APPLY) {
    console.log('\nPreview only. Re-run with --apply after reviewing the registry and package set.');
    process.exit(0);
  }

  mkdirSync(RUNTIME_ROOT, { recursive: true });
  for (const packageSpec of PACKAGES) {
    console.log(`installing: ${packageSpec}`);
    await run('npm', [
      'install',
      '--save-exact',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      '--loglevel=error',
      '--prefix',
      RUNTIME_ROOT,
      packageSpec,
    ], {
      env: { NPM_CONFIG_REGISTRY: registry },
    });
  }

  console.log('\nProvisioned direct runtime. Reload the host, then run node scripts/verify-install.mjs.');
} catch (error) {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
}
