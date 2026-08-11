#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const runtimeRoot = process.env.ALEX_ACT_ILLUSTRATOR_RUNTIME_ROOT
  || join(homedir(), '.copilot', 'plugin-data', 'alex-act-illustrator-plugin', 'runtime');
const routes = {
  flint: join(runtimeRoot, 'node_modules', 'flint-chart-mcp', 'dist', 'cli.js'),
  playwright: join(runtimeRoot, 'node_modules', '@playwright', 'mcp', 'cli.js'),
  replicate: join(runtimeRoot, 'node_modules', 'replicate-mcp', 'index.js'),
};
const [route, ...args] = process.argv.slice(2);
const target = routes[route];

if (!target) {
  console.error(`Unknown Illustrator runtime route: ${route || '(missing)'}`);
  process.exit(2);
}
if (!existsSync(target)) {
  console.error(`Illustrator runtime is not provisioned: ${target}`);
  console.error('Run /alex-act-illustrator-plugin setup-illustrator-runtime.');
  process.exit(3);
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
