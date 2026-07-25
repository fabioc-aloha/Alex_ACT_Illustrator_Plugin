#!/usr/bin/env node
// Verify the flint-chart MCP server is installable and healthy, independently of
// any MCP host. This is check 1 of the README's "Verify your install" ladder,
// deliberately executable: if your agent is the thing that's broken, you still
// need a way to prove the server half works.
//
//   node scripts/verify-install.mjs
//
// Exit 0 = server handshakes and advertises all expected tools.
// Exit 1 = server failed to start, handshake, or advertise the expected tools.
//
// No dependencies. Speaks newline-delimited JSON-RPC over stdio, which is what
// flint-chart-mcp expects.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verify the spec the workspace actually asks for, not a copy of it. Reading
// `.vscode/mcp.json` means bumping the pin in one place cannot leave this
// checker silently validating a different version than the host will launch.
const FALLBACK_PACKAGE = 'flint-chart-mcp@^0.2.2';
const CONFIG_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '.vscode', 'mcp.json');

function resolvePackage() {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    const args = config?.servers?.flint?.args;
    const spec = Array.isArray(args)
      ? args.find((a) => typeof a === 'string' && a.startsWith('flint-chart-mcp'))
      : undefined;
    if (spec) return { spec, source: '.vscode/mcp.json' };
  } catch {
    // Missing or unparseable config is not fatal — fall back to the known pin.
  }
  return { spec: FALLBACK_PACKAGE, source: 'built-in default' };
}

const { spec: PACKAGE, source: PACKAGE_SOURCE } = resolvePackage();
const EXPECTED_TOOLS = [
  'render_chart',
  'compile_chart',
  'validate_chart',
  'list_chart_types',
  'create_chart_view',
];
const TIMEOUT_MS = 120_000;

const REQUESTS = [
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'flint-chart-plugin-verify', version: '1.0.0' },
    },
  },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
];

// Windows ships `npx` as a .cmd shim, and since the CVE-2024-27980 fix Node
// refuses to spawn one without a shell (EINVAL). There is no injection surface
// here: the command is a hard-coded constant with no interpolation. The package
// spec stays double-quoted so cmd.exe does not treat the `^` in the version
// range as an escape character. On POSIX we spawn without a shell.
const isWindows = process.platform === 'win32';

console.log(`      spec: ${PACKAGE}  (from ${PACKAGE_SOURCE})`);

const child = isWindows
  ? spawn(`npx -y "${PACKAGE}"`, { stdio: ['pipe', 'pipe', 'pipe'], shell: true })
  : spawn('npx', ['-y', PACKAGE], { stdio: ['pipe', 'pipe', 'pipe'], shell: false });

let stdout = '';
let stderr = '';

child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  stdout += chunk;
});
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

const timer = setTimeout(() => {
  child.kill();
  fail(`server did not respond within ${TIMEOUT_MS / 1000}s`);
}, TIMEOUT_MS);

child.on('error', (err) => {
  clearTimeout(timer);
  fail(`could not launch npx: ${err.message}`, [
    'Is Node 22+ installed and on PATH?',
  ]);
});

child.on('close', () => {
  clearTimeout(timer);
  report();
});

// If the server dies before reading stdin, writing to the closed pipe raises
// EPIPE. Swallow it so the user gets the diagnostic below rather than a stack
// trace from an unhandled stream error.
child.stdin.on('error', () => {});

for (const request of REQUESTS) {
  child.stdin.write(`${JSON.stringify(request)}\n`);
}
child.stdin.end();

function parseMessages(text) {
  const messages = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // Non-JSON output (banners, npm noise) is not an error on its own.
    }
  }
  return messages;
}

function fail(reason, hints = []) {
  console.error(`FAIL  ${reason}`);
  for (const hint of hints) console.error(`      ${hint}`);
  if (stderr.trim()) console.error(`\nserver stderr:\n${stderr.trim()}`);
  process.exit(1);
}

function report() {
  const messages = parseMessages(stdout);

  const initialize = messages.find((m) => m.result?.serverInfo);
  if (!initialize) {
    fail('no initialize response — the server never completed a handshake', [
      'Run `npx -y flint-chart-mcp` by hand to see what it prints.',
    ]);
  }

  const { name, version } = initialize.result.serverInfo;
  console.log(`OK    server: ${name} v${version}`);
  console.log(`OK    protocol: ${initialize.result.protocolVersion}`);

  const listing = messages.find((m) => Array.isArray(m.result?.tools));
  if (!listing) {
    fail('handshake succeeded but tools/list returned nothing');
  }

  const found = listing.result.tools.map((t) => t.name);
  const missing = EXPECTED_TOOLS.filter((t) => !found.includes(t));
  if (missing.length > 0) {
    fail(`missing expected tools: ${missing.join(', ')}`, [
      `advertised: ${found.join(', ') || '(none)'}`,
      `A version mismatch is the usual cause — spec was ${PACKAGE}.`,
    ]);
  }

  console.log(`OK    tools (${found.length}): ${found.join(', ')}`);
  console.log('\nPASS  Server half is healthy.');
  console.log('      If your host still shows no flint tools, the fault is on the');
  console.log('      client side: config path, trust prompt, or a stale session.');
  console.log('      See README "If the tools still don\'t appear".');
}
