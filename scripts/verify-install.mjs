#!/usr/bin/env node
// Verify the plugin's MCP servers are installable and healthy, independently of
// any MCP host. This is check 1 of the README's "Verify your install" ladder,
// deliberately executable: if your agent is the thing that's broken, you still
// need a way to prove the server half works.
//
//   node scripts/verify-install.mjs
//   node scripts/verify-install.mjs --catalog     (also list backends + chart-type counts)
//   node scripts/verify-install.mjs --compat      (also validate this plugin's spec patterns)
//   node scripts/verify-install.mjs --artifacts   (also render representative backend artifacts)
//   node scripts/verify-install.mjs --replicate   (also handshake replicate MCP; needs REPLICATE_API_TOKEN)
//   node scripts/verify-install.mjs --playwright  (also handshake playwright MCP; needs a browser)
//   node scripts/verify-install.mjs --all-mcps    (all three MCP servers with graceful skip)
//
// Exit 0 = flint server handshakes and advertises all expected tools. Optional
//          server checks (replicate, playwright) never fail the run — they
//          report pass / skip / fail as info.
// Exit 1 = flint server failed to start, handshake, or advertise the expected tools.
//
// `--catalog` additionally calls list_chart_types. Use it when bumping the pin:
// the README and skill quote a backend list and a Vega-Lite chart-type count,
// and both are version-dependent facts that need re-checking on every bump.
//
// `--compat` validates the chart-property patterns this plugin documents,
// including every item from the 0.3.0 migration notes. Use it to decide whether
// one set of skill content can serve two pinned versions at once: a dual range
// like `^0.3.0||^0.4.0` is only safe if every pattern validates on both.
// A failing spec here does not fail the run — it is reported for judgment.
//
// `--artifacts` validates, compiles, and renders three small fixtures that pin
// the documented backend boundaries: Vega-Lite themes plus SVG, ECharts Tree
// plus SVG, and Chart.js PNG-only output. It fails if the catalog, response
// shape, or format boundary changes.
//
// `--replicate` handshakes the optional `replicate` MCP server declared in
// `.vscode/mcp.json` (`replicate-mcp@0.9.0`, the Replicate feature). Skips if
// `REPLICATE_API_TOKEN` is unset. Never fails the run — Replicate is optional.
//
// `--playwright` handshakes the optional `playwright` MCP server declared in
// `.vscode/mcp.json` (`@playwright/mcp@0.0.78 --headless --isolated`, the
// render-verify browser sidecar). Skips if the browser launch fails. Never
// fails the run — Playwright is only needed on hosts without built-in browser
// tools (e.g. Copilot CLI).
//
// No dependencies. Speaks newline-delimited JSON-RPC over stdio, which is what
// all three MCP servers expect.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { spawnCommand } from './process-launch.mjs';
import { evaluateCompatibility, parseCatalogEntries } from './verify-contract.mjs';

// Verify the spec the workspace actually asks for, not a copy of it. Reading
// `.vscode/mcp.json` means bumping the pin in one place cannot leave this
// checker silently validating a different version than the host will launch.
const ROOT_PATH = join(dirname(fileURLToPath(import.meta.url)), '..');
const FALLBACK_PACKAGE = 'flint-chart-mcp@0.5.1';
const EXPECTED_SERVER_VERSION = '0.5.1';
const CONFIG_PATH = join(ROOT_PATH, '.vscode', 'mcp.json');

function registryPolicyFail(reason) {
  console.error(`FAIL  npm registry policy: ${reason}`);
  process.exit(1);
}

function frontmatterDescription(file) {
  const match = readFileSync(file, 'utf8').match(/^description:\s*"([^"]+)"/m);
  if (!match) throw new Error(`missing one-line description: ${file}`);
  return match[1];
}

function assertManifestIntegrity() {
  const manifest = JSON.parse(readFileSync(join(ROOT_PATH, 'manifest.json'), 'utf8'));
  const declared = [];
  for (const skill of manifest.assets.skills) {
    declared.push(skill.path);
    for (const resource of skill.bundled_resources ?? []) declared.push(resource.path);
    const source = join(ROOT_PATH, skill.path);
    if (skill.frontmatter?.description !== frontmatterDescription(source)) {
      throw new Error(`manifest description drift: ${skill.name}`);
    }
  }
  for (const prompt of manifest.assets.prompts) {
    declared.push(prompt.path);
    const source = join(ROOT_PATH, prompt.path);
    if (prompt.frontmatter?.description !== frontmatterDescription(source)) {
      throw new Error(`manifest description drift: ${prompt.name}`);
    }
  }
  declared.push(manifest.assets.mcp.path, manifest.assets.settings.path);
  for (const relativePath of declared) {
    if (!existsSync(join(ROOT_PATH, relativePath))) {
      throw new Error(`manifest path does not exist: ${relativePath}`);
    }
  }

  const docsShell = manifest.assets.skills.find((skill) => skill.name === 'docs-shell');
  const bundled = new Set((docsShell?.bundled_resources ?? []).map((resource) => resource.path));
  const starter = JSON.parse(readFileSync(
    join(ROOT_PATH, '.github', 'skills', 'docs-shell', 'starter', 'manifest.json'), 'utf8'));
  const sources = starter.areas.flatMap((area) => area.docs.flatMap((doc) => doc.sources ?? []));
  for (const source of sources) {
    const declaredPath = `.github/skills/docs-shell/starter/${source}`;
    if (!bundled.has(declaredPath)) throw new Error(`starter dependency is not bundled: ${source}`);
  }
  console.log(`OK    manifest integrity: ${declared.length} paths and copied metadata verified`);
}

function assertRegistryPolicy() {
  const sources = [
    {
      label: '.vscode/mcp.json',
      raw: readFileSync(CONFIG_PATH, 'utf8'),
      servers: JSON.parse(readFileSync(CONFIG_PATH, 'utf8')).servers,
    },
    {
      label: 'plugin.json',
      raw: readFileSync(join(ROOT_PATH, 'plugin.json'), 'utf8'),
      servers: JSON.parse(readFileSync(join(ROOT_PATH, 'plugin.json'), 'utf8')).mcpServers,
    },
  ];

  const manifestRaw = readFileSync(join(ROOT_PATH, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestRaw);
  sources.push({
    label: 'manifest.json',
    raw: manifestRaw,
    servers: Object.fromEntries(
      manifest.assets.mcp.servers.map((server) => [server.server_name, server]),
    ),
  });

  for (const source of sources) {
    if (/registry\.npmjs\.org/i.test(source.raw)) {
      registryPolicyFail(`${source.label} hardcodes the public npm registry`);
    }
    for (const [name, server] of Object.entries(source.servers ?? {})) {
      if (server.command !== 'node') {
        registryPolicyFail(`${source.label} server ${name} must launch through node`);
      }
      const args = server.args ?? [];
      if (args[0] !== '.github/skills/setup-illustrator-runtime/scripts/runtime-launcher.mjs') {
        registryPolicyFail(`${source.label} server ${name} does not use the plugin-private launcher`);
      }
      if (args[1] !== name) {
        registryPolicyFail(`${source.label} server ${name} has the wrong launcher route`);
      }
      if (/\bnpx\b|--offline|--prefer-offline/.test(JSON.stringify({ command: server.command, args }))) {
        registryPolicyFail(`${source.label} server ${name} still invokes npm runtime resolution`);
      }
    }
  }

  console.log('OK    npm registry policy: exact private install, direct Node runtime');
}

assertRegistryPolicy();
try {
  assertManifestIntegrity();
} catch (error) {
  registryPolicyFail(error.message);
}

function resolveServer(name) {
  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  const server = config?.servers?.[name];
  if (!server) throw new Error(`missing ${name} server in ${CONFIG_PATH}`);
  const expectedLauncher = '.github/skills/setup-illustrator-runtime/scripts/runtime-launcher.mjs';
  const args = [...(server.args ?? [])];
  if (args[0] !== expectedLauncher) {
    throw new Error(`${name} server does not use the expected launcher template`);
  }
  return { ...server, args, cwd: ROOT_PATH };
}

const PACKAGE = FALLBACK_PACKAGE;
const PACKAGE_SOURCE = '.vscode/mcp.json via plugin-private runtime';
const WANT_CATALOG = process.argv.includes('--catalog');
const WANT_COMPAT = process.argv.includes('--compat');
const WANT_ARTIFACTS = process.argv.includes('--artifacts');
const WANT_ALL_MCPS = process.argv.includes('--all-mcps');
const WANT_REPLICATE = WANT_ALL_MCPS || process.argv.includes('--replicate');
const WANT_PLAYWRIGHT = WANT_ALL_MCPS || process.argv.includes('--playwright');

// Optional MCP servers declared in .vscode/mcp.json. These are the "Replicate"
// and "Shell / render-verify browser sidecar" features. They are optional at
// install time: users who don't need them shouldn't pay for the check.
const OPTIONAL_MCPS = {
  replicate: {
    label: 'replicate',
    ...resolveServer('replicate'),
    envRequired: 'REPLICATE_API_TOKEN',
    expectedToolPrefixes: ['predictions', 'models'],
    role: 'AI image generation (Replicate feature)',
  },
  playwright: {
    label: 'playwright',
    ...resolveServer('playwright'),
    envRequired: null,
    expectedToolPrefixes: ['browser'],
    role: 'browser sidecar for render-verify (Copilot CLI hosts)',
  },
};
const OPTIONAL_TIMEOUT_MS = 30_000;

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
    name: 'Pie + innerRadius (legacy donut idiom, valid on all backends)',
    chart_spec: {
      chartType: 'Pie Chart',
      encodings: { size: { field: 'qty' }, color: { field: 'cat' } },
      chartProperties: { innerRadius: 60 },
    },
  },
  {
    // First-class type added in 0.4.1, Vega-Lite only. Guards against a
    // future version dropping it and silently reverting the skill's guidance
    // back to the Pie + innerRadius workaround.
    name: 'Donut Chart (0.4.1 added it as a first-class Vega-Lite type)',
    chart_spec: {
      chartType: 'Donut Chart',
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
  {
    name: 'Calendar Heatmap (0.5.1, Vega-Lite)',
    backend: 'vegalite',
    data: {
      values: [
        { day: '2026-08-01', qty: 4 },
        { day: '2026-08-02', qty: 9 },
      ],
    },
    semantic_types: { day: 'Date', qty: 'Quantity' },
    chart_spec: {
      chartType: 'Calendar Heatmap',
      encodings: { x: { field: 'day' }, color: { field: 'qty' } },
    },
  },
  {
    name: 'Calendar Heatmap (0.5.1, ECharts)',
    backend: 'echarts',
    data: {
      values: [
        { day: '2026-08-01', qty: 4 },
        { day: '2026-08-02', qty: 9 },
      ],
    },
    semantic_types: { day: 'Date', qty: 'Quantity' },
    chart_spec: {
      chartType: 'Calendar Heatmap',
      encodings: { x: { field: 'day' }, color: { field: 'qty' } },
    },
  },
];
const COMPAT_BASE_ID = 10;

const ARTIFACT_BASE_ID = 100;
const ARTIFACT_SPECS = [
  {
    name: 'Vega-Lite themed bar SVG',
    backend: 'vegalite',
    chartType: 'Bar Chart',
    format: 'svg',
    input: {
      data: {
        values: [
          { category: 'North', value: 12 },
          { category: 'South', value: 9 },
        ],
      },
      semantic_types: { category: 'Category', value: 'Quantity' },
      theme_spec: 'economist',
      chart_spec: {
        chartType: 'Bar Chart',
        encodings: { x: { field: 'category' }, y: { field: 'value' } },
      },
    },
  },
  {
    name: 'ECharts Tree SVG',
    backend: 'echarts',
    chartType: 'Tree',
    format: 'svg',
    input: {
      data: {
        values: [
          { node: 'North', parent: 'All regions', value: 6 },
          { node: 'South', parent: 'All regions', value: 4 },
        ],
      },
      semantic_types: { node: 'Category', parent: 'Category', value: 'Quantity' },
      chart_spec: {
        chartType: 'Tree',
        encodings: {
          color: { field: 'parent' },
          detail: { field: 'node' },
          size: { field: 'value' },
        },
      },
    },
  },
  {
    name: 'Chart.js bar PNG',
    backend: 'chartjs',
    chartType: 'Bar Chart',
    format: 'png',
    unsupportedFormat: 'svg',
    input: {
      data: {
        values: [
          { category: 'North', value: 12 },
          { category: 'South', value: 9 },
        ],
      },
      semantic_types: { category: 'Category', value: 'Quantity' },
      chart_spec: {
        chartType: 'Bar Chart',
        encodings: { x: { field: 'category' }, y: { field: 'value' } },
      },
    },
  },
  {
    name: 'Vega-Lite Calendar Heatmap SVG',
    backend: 'vegalite',
    chartType: 'Calendar Heatmap',
    format: 'svg',
    input: {
      data: {
        values: [
          { day: '2026-08-01', value: 4 },
          { day: '2026-08-02', value: 9 },
        ],
      },
      semantic_types: { day: 'Date', value: 'Quantity' },
      chart_spec: {
        chartType: 'Calendar Heatmap',
        encodings: { x: { field: 'day' }, color: { field: 'value' } },
      },
    },
  },
  {
    name: 'ECharts Calendar Heatmap SVG',
    backend: 'echarts',
    chartType: 'Calendar Heatmap',
    format: 'svg',
    input: {
      data: {
        values: [
          { day: '2026-08-01', value: 4 },
          { day: '2026-08-02', value: 9 },
        ],
      },
      semantic_types: { day: 'Date', value: 'Quantity' },
      chart_spec: {
        chartType: 'Calendar Heatmap',
        encodings: { x: { field: 'day' }, color: { field: 'value' } },
      },
    },
  },
];

function artifactId(index, offset) {
  return ARTIFACT_BASE_ID + (index * 10) + offset;
}

function artifactRequests() {
  return ARTIFACT_SPECS.flatMap((spec, index) => {
    const input = { ...spec.input, backend: spec.backend };
    const requests = [
      {
        jsonrpc: '2.0',
        id: artifactId(index, 1),
        method: 'tools/call',
        params: { name: 'validate_chart', arguments: input },
      },
      {
        jsonrpc: '2.0',
        id: artifactId(index, 2),
        method: 'tools/call',
        params: { name: 'compile_chart', arguments: input },
      },
      {
        jsonrpc: '2.0',
        id: artifactId(index, 3),
        method: 'tools/call',
        params: { name: 'render_chart', arguments: { ...input, format: spec.format } },
      },
    ];
    if (spec.unsupportedFormat) {
      requests.push({
        jsonrpc: '2.0',
        id: artifactId(index, 4),
        method: 'tools/call',
        params: {
          name: 'render_chart',
          arguments: { ...input, format: spec.unsupportedFormat },
        },
      });
    }
    return requests;
  });
}

const EXPECTED_TOOLS = [
  'render_chart',
  'compile_chart',
  'validate_chart',
  'list_chart_types',
  'list_themes',
  'create_chart_view',
];
const EXPECTED_THEMES = [
  'nyt',
  'economist',
  'swiss',
  'nature',
  'mckinsey',
  'datawrapper',
  'powerbi',
  'powerbi-light',
  'pop',
  'cartoon',
];
const EXPECTED_RESOURCES = ['flint://agent-skill', 'flint://theme-skill'];
const EXPECTED_PROMPTS = ['author_flint_chart', 'author_flint_theme'];
const EXPECTED_CATALOG = [
  { backend: 'vegalite', count: 36, required: ['Calendar Heatmap'] },
  { backend: 'echarts', count: 37, required: ['Calendar Heatmap'] },
  { backend: 'chartjs', count: 22, excluded: ['Calendar Heatmap'] },
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
      clientInfo: { name: 'alex-act-illustrator-plugin-verify', version: '2.2.2' },
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
  {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: { name: 'list_themes', arguments: {} },
  },
  { jsonrpc: '2.0', id: 5, method: 'resources/list', params: {} },
  { jsonrpc: '2.0', id: 6, method: 'prompts/list', params: {} },
  ...COMPAT_SPECS.map((s, i) => ({
    jsonrpc: '2.0',
    id: COMPAT_BASE_ID + i,
    method: 'tools/call',
    params: {
      name: 'validate_chart',
      arguments: {
        data: s.data ?? { values: ROWS },
        semantic_types: s.semantic_types ?? { qty: 'Quantity' },
        chart_spec: s.chart_spec,
        backend: s.backend ?? 'vegalite',
      },
    },
  })),
  ...(WANT_ARTIFACTS ? artifactRequests() : []),
];

console.log(`      spec: ${PACKAGE}  (from ${PACKAGE_SOURCE})`);

const flintServer = resolveServer('flint');
const child = spawnCommand(flintServer.command, flintServer.args, {
  cwd: flintServer.cwd,
  stdio: ['pipe', 'pipe', 'pipe'],
});

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
  fail(`could not launch Illustrator runtime: ${err.message}`, [
    'Is Node 22+ installed and on PATH?',
    'Did you run /alex-act-illustrator-plugin setup-illustrator-runtime?',
  ]);
});

child.on('close', () => {
  clearTimeout(timer);
  report();
});

// If the server dies before reading stdin, writing to the closed pipe raises
// EPIPE. Swallow it so the user gets the diagnostic below rather than a stack
// trace from an unhandled stream error.
child.stdin.on('error', () => { });

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
  if (/not provisioned|ENOENT|Cannot find module/i.test(stderr)) {
    console.error('      The plugin-private runtime is missing or incomplete.');
    console.error('      Run setup-illustrator-runtime, review its preview, then approve --apply.');
  }
  for (const hint of hints) console.error(`      ${hint}`);
  if (stderr.trim()) console.error(`\nserver stderr:\n${stderr.trim()}`);
  process.exit(1);
}

function report() {
  const messages = parseMessages(stdout);

  const initialize = messages.find((m) => m.result?.serverInfo);
  if (!initialize) {
    fail('no initialize response — the server never completed a handshake', [
      'Run `node ".github/skills/setup-illustrator-runtime/scripts/runtime-launcher.mjs" flint` by hand to see what it prints.',
    ]);
  }

  const { name, version } = initialize.result.serverInfo;
  if (version !== EXPECTED_SERVER_VERSION) {
    fail(`server version mismatch: expected ${EXPECTED_SERVER_VERSION}, found ${version || '(missing)'}`);
  }
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
  reportLanguageSurface(messages);
  assertCatalogContract(messages);

  if (WANT_CATALOG) reportCatalog(messages);
  if (WANT_COMPAT) reportCompat(messages);
  if (WANT_ARTIFACTS) reportArtifactConformance(messages);

  const optionalChecks = [];
  if (WANT_REPLICATE) optionalChecks.push(verifyOptionalMcp(OPTIONAL_MCPS.replicate));
  if (WANT_PLAYWRIGHT) optionalChecks.push(verifyOptionalMcp(OPTIONAL_MCPS.playwright));

  Promise.all(optionalChecks).then(() => {
    console.log('\nPASS  Flint server half is healthy.');
    console.log('      If your host still shows no flint tools, the fault is on the');
    console.log('      client side: config path, trust prompt, or a stale session.');
    console.log('      See README "If the tools still don\'t appear".');
  });
}

function reportLanguageSurface(messages) {
  const themeCall = messages.find((message) => message.id === 4 && message.result?.content);
  const themeText = themeCall?.result.content.find((content) => content.type === 'text')?.text;
  if (!themeText) fail('list_themes returned no text content');
  let themePayload;
  try {
    themePayload = JSON.parse(themeText);
  } catch {
    fail('list_themes returned unparseable JSON');
  }
  const themeEntries = Array.isArray(themePayload) ? themePayload : themePayload?.themes;
  const themeIds = Array.isArray(themeEntries)
    ? themeEntries.map((entry) => (typeof entry === 'string' ? entry : entry?.id)).filter(Boolean)
    : [];
  const missingThemes = EXPECTED_THEMES.filter((id) => !themeIds.includes(id));
  if (themeIds.length !== new Set(themeIds).size || missingThemes.length > 0) {
    fail(`invalid theme catalog${missingThemes.length ? `; missing: ${missingThemes.join(', ')}` : ''}`);
  }

  const resources = messages.find((message) => message.id === 5)?.result?.resources;
  if (!Array.isArray(resources)) fail('resources/list returned no resource array');
  const resourceUris = resources.map((resource) => resource.uri);
  const missingResources = EXPECTED_RESOURCES.filter((uri) => !resourceUris.includes(uri));
  if (missingResources.length > 0) fail(`missing authoring resources: ${missingResources.join(', ')}`);

  const prompts = messages.find((message) => message.id === 6)?.result?.prompts;
  if (!Array.isArray(prompts)) fail('prompts/list returned no prompt array');
  const promptNames = prompts.map((prompt) => prompt.name);
  const missingPrompts = EXPECTED_PROMPTS.filter((name) => !promptNames.includes(name));
  if (missingPrompts.length > 0) fail(`missing authoring prompts: ${missingPrompts.join(', ')}`);

  console.log(`OK    themes (${themeIds.length}): ${themeIds.join(', ')}`);
  console.log(`OK    authoring resources: ${EXPECTED_RESOURCES.join(', ')}`);
  console.log(`OK    authoring prompts: ${EXPECTED_PROMPTS.join(', ')}`);
}

function reportCompat(messages) {
  console.log(`\n      spec-pattern compatibility (validate_chart, vegalite):`);
  const result = evaluateCompatibility(messages, COMPAT_SPECS, COMPAT_BASE_ID);
  for (const row of result.rows) {
    console.log(`        ${row.verdict.padEnd(8)} ${row.name}${row.detail}`);
  }

  console.log(
    result.bad === 0
      ? '        → all documented patterns validate on this version'
      : `        → ${result.bad} pattern(s) need attention before a dual-range pin`,
  );
  if (result.bad > 0) fail(`--compat: ${result.bad} documented pattern(s) failed validation`);
}

function reportCatalog(messages) {
  try {
    const entries = parseCatalogEntries(messages);
    console.log(`OK    backends (${entries.length}):`);
    for (const entry of entries) {
      const count = entry.count ?? entry.chartTypes?.length ?? '?';
      console.log(`        ${String(entry.backend).padEnd(10)} ${count} chart types`);
    }
  } catch (error) {
    fail(`--catalog: ${error.message}`);
  }
}

function assertCatalogContract(messages) {
  let entries;
  try {
    entries = parseCatalogEntries(messages);
  } catch (error) {
    fail(`chart catalog is invalid: ${error.message}`);
  }
  for (const expected of EXPECTED_CATALOG) {
    const entry = entries.find((candidate) => candidate.backend === expected.backend);
    if (!entry || entry.count !== expected.count) {
      fail(`unexpected ${expected.backend} chart catalog: expected ${expected.count}, found ${entry?.count ?? '(missing)'}`);
    }
    const names = entry.chartTypes.map((type) => type.chartType);
    const missing = (expected.required ?? []).filter((name) => !names.includes(name));
    const unsupported = (expected.excluded ?? []).filter((name) => names.includes(name));
    if (missing.length || unsupported.length) {
      fail(`unexpected ${expected.backend} Calendar Heatmap support${missing.length ? `; missing: ${missing.join(', ')}` : ''}${unsupported.length ? `; unsupported backend exposes: ${unsupported.join(', ')}` : ''}`);
    }
  }
  console.log('OK    catalog contract: Vega-Lite 36, ECharts 37, Chart.js 22; Calendar Heatmap on Vega-Lite and ECharts');
}

function toolMessage(messages, id, name) {
  const message = messages.find((entry) => entry.id === id);
  if (!message?.result?.content) fail(`${name} returned no content for request ${id}`);
  return message;
}

function textContent(message, name) {
  const text = message.result.content.find((content) => content.type === 'text')?.text;
  if (!text) fail(`${name} returned no text content`);
  return text;
}

function parsedToolJson(messages, id, name) {
  const text = textContent(toolMessage(messages, id, name), name);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${name} returned unparseable JSON`);
  }
}

function assertValidFixture(messages, id, spec) {
  const result = parsedToolJson(messages, id, `validate_chart (${spec.name})`);
  if (result.valid !== true || !Array.isArray(result.warnings) || result.warnings.length > 0) {
    fail(`validate_chart (${spec.name}) did not return a warning-free valid result`);
  }
}

function assertCompiledFixture(messages, id, spec) {
  const result = parsedToolJson(messages, id, `compile_chart (${spec.name})`);
  if (!result?.spec || !Array.isArray(result.warnings) || result.warnings.length > 0) {
    fail(`compile_chart (${spec.name}) did not return a warning-free backend spec`);
  }
}

function assertRenderedFixture(messages, id, spec) {
  const message = toolMessage(messages, id, `render_chart (${spec.name})`);
  const content = message.result.content;
  const note = content.find((entry) => entry.type === 'text' && entry.text.includes(' · '))?.text;
  if (!note?.startsWith(`${spec.backend} · ${spec.format} · `)) {
    fail(`render_chart (${spec.name}) returned an unexpected backend or format note`);
  }

  if (spec.format === 'svg') {
    const svg = content.find((entry) => entry.type === 'text' && /^\s*<svg\b/i.test(entry.text))?.text;
    if (!svg || !/<\/svg>\s*$/i.test(svg)) {
      fail(`render_chart (${spec.name}) did not return a complete SVG document`);
    }
    return;
  }

  const image = content.find((entry) => entry.type === 'image');
  if (!image?.data || image.mimeType !== 'image/png') {
    fail(`render_chart (${spec.name}) did not return a PNG image payload`);
  }
}

function assertUnsupportedFormat(messages, id, spec) {
  const message = toolMessage(messages, id, `render_chart (${spec.name}, ${spec.unsupportedFormat})`);
  const text = textContent(message, `render_chart (${spec.name}, ${spec.unsupportedFormat})`);
  if (message.result.isError !== true || !/chartjs backend supports png output only/i.test(text)) {
    fail(`render_chart (${spec.name}) did not reject ${spec.unsupportedFormat} as PNG-only`);
  }
}

function reportArtifactConformance(messages) {
  let catalog;
  try {
    catalog = parseCatalogEntries(messages);
  } catch (error) {
    fail(`--artifacts: ${error.message}`);
  }

  console.log('\n      artifact conformance:');
  for (const [index, spec] of ARTIFACT_SPECS.entries()) {
    const backend = catalog.find((entry) => entry.backend === spec.backend);
    if (!backend?.chartTypes.some((entry) => entry?.chartType === spec.chartType)) {
      fail(`--artifacts: ${spec.chartType} is absent from the ${spec.backend} catalog`);
    }
    assertValidFixture(messages, artifactId(index, 1), spec);
    assertCompiledFixture(messages, artifactId(index, 2), spec);
    assertRenderedFixture(messages, artifactId(index, 3), spec);
    if (spec.unsupportedFormat) assertUnsupportedFormat(messages, artifactId(index, 4), spec);
    console.log(`        valid    ${spec.name}`);
  }
}

// Optional MCP server handshake. Never fails the run — these servers are
// declared optional in .vscode/mcp.json. Reports SKIP (env missing), OK
// (handshake + tools/list succeeded), or FAIL (server didn't respond in time
// or advertised no tools matching the expected prefixes).
function verifyOptionalMcp(config) {
  const { label, command, args, envRequired, expectedToolPrefixes, role } = config;

  if (envRequired && !process.env[envRequired]) {
    console.log(`\n      optional ${label} MCP: SKIP (${envRequired} not set)`);
    console.log(`        role: ${role}`);
    return Promise.resolve();
  }

  console.log(`\n      optional ${label} MCP: handshaking (${command} ${args.join(' ')})`);

  return new Promise((resolve) => {
    const proc = spawnCommand(command, args, {
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    let err = '';
    let done = false;

    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      out += chunk;
    });
    proc.stderr.on('data', (chunk) => {
      err += chunk;
    });

    const finish = (verdict, detail = '') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        proc.kill();
      } catch {
        // ignore
      }
      const line = detail ? ` — ${detail}` : '';
      console.log(`        ${verdict}${line}`);
      if (verdict.startsWith('FAIL') && err.trim()) {
        // Show first line of stderr as a debugging hint, indented.
        const first = err.trim().split('\n')[0].slice(0, 160);
        console.log(`        stderr: ${first}`);
      }
      resolve();
    };

    const timer = setTimeout(
      () => finish('FAIL', `no handshake within ${OPTIONAL_TIMEOUT_MS / 1000}s`),
      OPTIONAL_TIMEOUT_MS,
    );

    proc.on('error', (e) => finish('FAIL', `could not launch: ${e.message}`));
    proc.stdin.on('error', () => {
      // Server closed stdin early — surface via close event.
    });

    proc.on('close', () => {
      if (done) return;
      const messages = parseMessages(out);
      const init = messages.find((m) => m.result?.serverInfo);
      const listing = messages.find((m) => Array.isArray(m.result?.tools));
      if (!init) {
        finish('FAIL', 'no initialize response');
        return;
      }
      const toolNames = listing?.result?.tools?.map((t) => t.name) ?? [];
      const matched = toolNames.filter((t) =>
        expectedToolPrefixes.some((p) => t === p || t.startsWith(`${p}.`) || t.startsWith(`${p}_`)),
      );
      if (matched.length === 0) {
        finish(
          'FAIL',
          `advertised no tools matching prefixes ${expectedToolPrefixes.join(', ')} (got: ${toolNames.slice(0, 4).join(', ') || 'none'})`,
        );
        return;
      }
      const { name, version } = init.result.serverInfo;
      finish('OK', `${name} v${version}, ${matched.length}/${toolNames.length} tools match (${matched.slice(0, 3).join(', ')}${matched.length > 3 ? '…' : ''})`);
    });

    const initReq = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'alex-act-illustrator-plugin-verify', version: '2.2.2' },
      },
    };
    const listReq = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };
    proc.stdin.write(`${JSON.stringify(initReq)}\n`);
    proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
    proc.stdin.write(`${JSON.stringify(listReq)}\n`);
    proc.stdin.end();
  });
}
