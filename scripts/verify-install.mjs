#!/usr/bin/env node
// Verify the flint-chart MCP server is installable and healthy, independently of
// any MCP host. This is check 1 of the README's "Verify your install" ladder,
// deliberately executable: if your agent is the thing that's broken, you still
// need a way to prove the server half works.
//
//   node scripts/verify-install.mjs
//   node scripts/verify-install.mjs --catalog   (also list backends + chart-type counts)
//   node scripts/verify-install.mjs --compat    (also validate this plugin's spec patterns)
//
// Exit 0 = server handshakes and advertises all expected tools.
// Exit 1 = server failed to start, handshake, or advertise the expected tools.
//
// `--catalog` additionally calls list_chart_types. Use it when bumping the pin:
// the README and skill quote a backend list and a Vega-Lite chart-type count,
// and both are version-dependent facts that need re-checking on every bump.
//
// `--compat` validates the chart-property patterns this plugin documents,
// including every item from the 0.3.0 migration notes. Use it to decide whether
// one set of skill content can serve two pinned versions at once: a dual range
// like `^0.2.2||^0.4.0` is only safe if every pattern validates on both.
// A failing spec here does not fail the run — it is reported for judgment.
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
const WANT_CATALOG = process.argv.includes('--catalog');
const WANT_COMPAT = process.argv.includes('--compat');

// Patterns this plugin's skill documents. The first three are the 0.3.0
// migration items — the ones most likely to diverge between pinned versions.
const ROWS = [
  { cat: 'North', qty: 120, grp: 'A', t: 1 },
  { cat: 'South', qty: 90, grp: 'B', t: 2 },
  { cat: 'East', qty: 150, grp: 'A', t: 3 },
];
const COMPAT_SPECS = [
  {
    name: 'Grouped Bar + dodge:auto (0.3.0 dropped "none")',
    chart_spec: {
      chartType: 'Grouped Bar Chart',
      encodings: { x: { field: 'cat' }, y: { field: 'qty' }, group: { field: 'grp' } },
      chartProperties: { dodge: 'auto' },
    },
  },
  {
    name: 'Donut = Pie + innerRadius (0.3.0 dropped it on Rose)',
    chart_spec: {
      chartType: 'Pie Chart',
      encodings: { size: { field: 'qty' }, color: { field: 'cat' } },
      chartProperties: { innerRadius: 60 },
    },
  },
  {
    name: 'Sparkline (0.3.0 dropped independentYAxis here)',
    chart_spec: {
      chartType: 'Sparkline',
      encodings: { x: { field: 't' }, y: { field: 'qty' }, color: { field: 'grp' } },
      chartProperties: { baseline: 'mean' },
    },
  },
  {
    name: 'Rose Chart without innerRadius',
    chart_spec: {
      chartType: 'Rose Chart',
      encodings: { x: { field: 'cat' }, y: { field: 'qty' } },
    },
  },
  {
    name: 'Bar Chart (baseline sanity)',
    chart_spec: {
      chartType: 'Bar Chart',
      encodings: { x: { field: 'cat' }, y: { field: 'qty' } },
    },
  },
  {
    name: 'Scatter Plot with color',
    chart_spec: {
      chartType: 'Scatter Plot',
      encodings: { x: { field: 't' }, y: { field: 'qty' }, color: { field: 'grp' } },
    },
  },
];
const COMPAT_BASE_ID = 10;

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
  {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'list_chart_types', arguments: {} },
  },
  ...COMPAT_SPECS.map((s, i) => ({
    jsonrpc: '2.0',
    id: COMPAT_BASE_ID + i,
    method: 'tools/call',
    params: {
      name: 'validate_chart',
      arguments: {
        data: { values: ROWS },
        semantic_types: { qty: 'Quantity' },
        chart_spec: s.chart_spec,
        backend: 'vegalite',
      },
    },
  })),
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

  if (WANT_CATALOG) reportCatalog(messages);
  if (WANT_COMPAT) reportCompat(messages);

  console.log('\nPASS  Server half is healthy.');
  console.log('      If your host still shows no flint tools, the fault is on the');
  console.log('      client side: config path, trust prompt, or a stale session.');
  console.log('      See README "If the tools still don\'t appear".');
}

function reportCompat(messages) {
  console.log(`\n      spec-pattern compatibility (validate_chart, vegalite):`);
  let bad = 0;

  COMPAT_SPECS.forEach((s, i) => {
    const reply = messages.find((m) => m.id === COMPAT_BASE_ID + i);
    const text = reply?.result?.content?.find((c) => c.type === 'text')?.text;

    let verdict = 'NO REPLY';
    let detail = '';
    if (text) {
      try {
        const r = JSON.parse(text);
        verdict = r.valid ? 'valid' : 'INVALID';
        const notes = [...(r.errors ?? []), ...(r.warnings ?? [])];
        if (notes.length) detail = `  — ${notes.join('; ')}`;
      } catch {
        verdict = text.slice(0, 60);
      }
    }
    if (verdict !== 'valid') bad += 1;
    console.log(`        ${verdict.padEnd(8)} ${s.name}${detail}`);
  });

  console.log(
    bad === 0
      ? '        → all documented patterns validate on this version'
      : `        → ${bad} pattern(s) need attention before a dual-range pin`,
  );
}

function reportCatalog(messages) {
  const call = messages.find((m) => m.id === 3 && m.result?.content);
  const text = call?.result.content.find((c) => c.type === 'text')?.text;
  if (!text) {
    console.log('WARN  --catalog: list_chart_types returned no text content');
    return;
  }

  let catalog;
  try {
    catalog = JSON.parse(text);
  } catch {
    console.log('WARN  --catalog: could not parse list_chart_types output');
    return;
  }

  const entries = Array.isArray(catalog) ? catalog : [catalog];
  console.log(`OK    backends (${entries.length}):`);
  for (const entry of entries) {
    const count = entry.count ?? entry.chartTypes?.length ?? '?';
    console.log(`        ${String(entry.backend).padEnd(10)} ${count} chart types`);
  }
}
