#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const runtimeRoot = process.env.ALEX_ACT_ILLUSTRATOR_RUNTIME_ROOT
  || join(homedir(), '.copilot', 'plugin-data', 'alex-act-illustrator-plugin', 'runtime');
const routes = {
  flint: {
    expectedVersion: '0.5.0',
    packagePath: join(runtimeRoot, 'node_modules', 'flint-chart-mcp', 'package.json'),
    target: join(runtimeRoot, 'node_modules', 'flint-chart-mcp', 'dist', 'cli.js'),
  },
  playwright: {
    expectedVersion: '0.0.78',
    packagePath: join(runtimeRoot, 'node_modules', '@playwright', 'mcp', 'package.json'),
    target: join(runtimeRoot, 'node_modules', '@playwright', 'mcp', 'cli.js'),
  },
  replicate: {
    expectedVersion: '0.9.0',
    packagePath: join(runtimeRoot, 'node_modules', 'replicate-mcp', 'package.json'),
    target: join(runtimeRoot, 'node_modules', 'replicate-mcp', 'index.js'),
  },
};
const [route, ...args] = process.argv.slice(2);
const config = routes[route];

if (!config) {
  console.error(`Unknown Illustrator runtime route: ${route || '(missing)'}`);
  process.exit(2);
}
const { expectedVersion, packagePath, target } = config;
if (!existsSync(target)) {
  console.error(`Illustrator runtime is not provisioned: ${target}`);
  console.error('Run /alex-act-illustrator-plugin setup-illustrator-runtime.');
  process.exit(3);
}
if (!existsSync(packagePath)) {
  console.error(`Illustrator runtime package metadata is missing: ${packagePath}`);
  console.error('Run /alex-act-illustrator-plugin setup-illustrator-runtime.');
  process.exit(3);
}

let installedVersion;
try {
  installedVersion = JSON.parse(readFileSync(packagePath, 'utf8')).version;
} catch (error) {
  console.error(`Illustrator runtime package metadata is invalid: ${error.message}`);
  process.exit(3);
}
if (installedVersion !== expectedVersion) {
  console.error(`Illustrator runtime version mismatch for ${route}: expected ${expectedVersion}, found ${installedVersion || '(missing)'}.`);
  console.error('Run /alex-act-illustrator-plugin setup-illustrator-runtime.');
  process.exit(4);
}

const child = spawn(process.execPath, [target, ...args], {
  env: process.env,
  stdio: 'inherit',
  windowsHide: true,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('error', (error) => {
  console.error(`Illustrator runtime launch failed: ${error.message}`);
  process.exit(1);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
