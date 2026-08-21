import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveWindowsCommand, spawnCommand } from './process-launch.mjs';
import './test-docs-shell-audit.mjs';
import './test-docs-shell-starter.mjs';
import { evaluateCompatibility, parseCatalogEntries } from './verify-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function frontmatterDescription(relativePath) {
  const match = read(relativePath).match(/^description:\s*"([^"]+)"/m);
  assert(match, `missing one-line description in ${relativePath}`);
  return match[1];
}

test('Windows command resolution treats where.exe output as data', () => {
  const locate = (command, args, options) => {
    assert.equal(command, 'where.exe');
    assert.deepEqual(args, ['npx']);
    assert.equal(options.shell, false);
    return { status: 0, stdout: 'C:\\tools\\npx\r\nC:\\tools\\npx.cmd\r\n' };
  };
  assert.equal(resolveWindowsCommand('npx', { platform: 'win32', locate }),
    'C:\\tools\\npx.cmd');
});

test('process launch preserves argument boundaries and forbids a shell', () => {
  let observed;
  const launch = (command, args, options) => {
    observed = { command, args, options };
    return { pid: 42 };
  };
  const child = spawnCommand('npx', ['-y', 'package@1.0.0;echo unsafe'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  }, {
    platform: 'win32',
    locate: () => ({ status: 0, stdout: 'C:\\tools\\npx.cmd\r\n' }),
    fileExists: () => true,
    launch,
  });
  assert.equal(child.pid, 42);
  assert.equal(observed.command, process.execPath);
  assert.deepEqual(observed.args, [
    'C:\\tools\\node_modules\\npm\\bin\\npx-cli.js',
    '-y',
    'package@1.0.0;echo unsafe',
  ]);
  assert.equal(observed.options.shell, false);
});

test('process launch resolves npm shims without a shell', () => {
  let observed;
  const launch = (command, args, options) => {
    observed = { command, args, options };
    return { pid: 42 };
  };
  const child = spawnCommand('npm', ['config', 'get', 'registry'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  }, {
    platform: 'win32',
    locate: () => ({ status: 0, stdout: 'C:\\tools\\npm.cmd\r\n' }),
    fileExists: () => true,
    launch,
  });
  assert.equal(child.pid, 42);
  assert.equal(observed.command, process.execPath);
  assert.deepEqual(observed.args, [
    'C:\\tools\\node_modules\\npm\\bin\\npm-cli.js',
    'config',
    'get',
    'registry',
  ]);
  assert.equal(observed.options.shell, false);
});

test('all Illustrator MCP declarations use the plugin-private Node launcher', () => {
  const sources = [
    ['.vscode/mcp.json', JSON.parse(read('.vscode/mcp.json')).servers],
    ['plugin.json', JSON.parse(read('plugin.json')).mcpServers],
    ['manifest.json', Object.fromEntries(JSON.parse(read('manifest.json')).assets.mcp.servers
      .map((server) => [server.server_name, server]))],
  ];
  for (const [label, servers] of sources) {
    for (const [name, server] of Object.entries(servers)) {
      assert.equal(server.command, 'node', `${label} ${name} command`);
      assert.equal(server.args[0], '.github/skills/setup-illustrator-runtime/scripts/runtime-launcher.mjs',
        `${label} ${name} launcher path`);
      assert.equal(server.args[1], name, `${label} ${name} launcher route`);
      assert.doesNotMatch(JSON.stringify({ command: server.command, args: server.args }),
        /\bnpx\b|--offline|--prefer-offline/,
        `${label} ${name} must not invoke npm runtime resolution`);
    }
  }
});

test('runtime provisioner previews the configured registry without mutating npm state', () => {
  const cache = mkdtempSync(join(tmpdir(), 'illustrator-runtime-preview-'));
  const script = join(root, '.github', 'skills', 'setup-illustrator-runtime',
    'scripts', 'provision-runtime.mjs');
  try {
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: cache,
        NPM_CONFIG_REGISTRY: 'https://registry.example.invalid/npm/',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /mode:\s+preview/i);
    assert.match(result.stdout, /https:\/\/registry\.example\.invalid\/npm\//);
    for (const packageSpec of [
      'flint-chart-mcp@0.5.0',
      'replicate-mcp@0.9.0',
      '@playwright/mcp@0.0.78',
    ]) {
      assert(result.stdout.includes(packageSpec), `preview missing ${packageSpec}`);
    }
    assert.doesNotMatch(result.stdout, /--registry\b/);
    assert.match(read('.github/skills/setup-illustrator-runtime/scripts/provision-runtime.mjs'),
      /NPM_CONFIG_REGISTRY:\s*registry/,
      'provisioning must propagate the resolved configured registry into npm install');
    assert.equal(existsSync(join(cache, '_npx')), false, 'preview must not provision packages');
  } finally {
    rmSync(cache, { recursive: true, force: true });
  }
});

test('setup skill bundles the direct runtime launcher', () => {
  const launcher = '.github/skills/setup-illustrator-runtime/scripts/runtime-launcher.mjs';
  assert(existsSync(join(root, launcher)), 'runtime launcher source is missing');
  const manifest = JSON.parse(read('manifest.json'));
  const setup = manifest.assets.skills.find((skill) => skill.name === 'setup-illustrator-runtime');
  assert(setup.bundled_resources.some((resource) => resource.path === launcher));
});

test('runtime launcher rejects a stale Flint package after a failed upgrade', () => {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'illustrator-stale-runtime-'));
  const packageRoot = join(runtimeRoot, 'node_modules', 'flint-chart-mcp');
  const launcher = join(root, '.github', 'skills', 'setup-illustrator-runtime',
    'scripts', 'runtime-launcher.mjs');
  try {
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ version: '0.4.1' }));
    writeFileSync(join(packageRoot, 'dist', 'cli.js'), 'process.exit(0);');

    const result = spawnSync(process.execPath, [launcher, 'flint'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ALEX_ACT_ILLUSTRATOR_RUNTIME_ROOT: runtimeRoot },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /version mismatch.*expected 0\.5\.0.*found 0\.4\.1/is);
  } finally {
    rmSync(runtimeRoot, { recursive: true, force: true });
  }
});

test('runtime launcher accepts the reviewed Flint package version', () => {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'illustrator-current-runtime-'));
  const packageRoot = join(runtimeRoot, 'node_modules', 'flint-chart-mcp');
  const launcher = join(root, '.github', 'skills', 'setup-illustrator-runtime',
    'scripts', 'runtime-launcher.mjs');
  try {
    mkdirSync(join(packageRoot, 'dist'), { recursive: true });
    writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ version: '0.5.0' }));
    writeFileSync(join(packageRoot, 'dist', 'cli.js'), 'process.exit(0);');

    const result = spawnSync(process.execPath, [launcher, 'flint'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, ALEX_ACT_ILLUSTRATOR_RUNTIME_ROOT: runtimeRoot },
    });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(runtimeRoot, { recursive: true, force: true });
  }
});

test('runtime setup audits stable dist-tags through the configured registry', () => {
  const provisioner = read('.github/skills/setup-illustrator-runtime/scripts/provision-runtime.mjs');
  const setupSkill = read('.github/skills/setup-illustrator-runtime/SKILL.md');
  assert.match(provisioner, /--check-updates/);
  assert.match(provisioner, /dist-tags\.latest/);
  assert.match(provisioner, /NPM_CONFIG_REGISTRY:\s*registry/);
  for (const packageSpec of [
    'flint-chart-mcp@0.5.0',
    'replicate-mcp@0.9.0',
    '@playwright/mcp@0.0.78',
  ]) {
    assert(setupSkill.includes(packageSpec), `setup guidance missing ${packageSpec}`);
  }
  assert.match(setupSkill, /--check-updates/);
  assert.match(setupSkill, /compatibility.*before.*pin|pin.*after.*compatibility/is);
});

test('feature skills route missing MCP runtime through setup', () => {
  const replicate = read('.github/skills/replicate-imagery/SKILL.md');
  const render = read('.github/skills/render-verify/SKILL.md');
  assert.match(replicate, /setup-illustrator-runtime/);
  assert.doesNotMatch(replicate, /Starts automatically on first `replicate` tool invocation/);
  assert.match(render, /setup-illustrator-runtime/);
});

test('compatibility evaluation reports every invalid or missing reply', () => {
  const specs = [{ name: 'valid' }, { name: 'invalid' }, { name: 'wrong type' }, { name: 'missing' }];
  const messages = [
    { id: 10, result: { content: [{ type: 'text', text: '{"valid":true}' }] } },
    { id: 11, result: { content: [{ type: 'text', text: '{"valid":false,"errors":["bad"]}' }] } },
    { id: 12, result: { content: [{ type: 'text', text: '{"valid":"false"}' }] } },
  ];
  const result = evaluateCompatibility(messages, specs, 10);
  assert.equal(result.bad, 3);
  assert.deepEqual(result.rows.map((row) => row.verdict), ['valid', 'INVALID', 'INVALID', 'NO REPLY']);
});

test('catalog parsing fails on missing or malformed requested output', () => {
  assert.throws(() => parseCatalogEntries([]), /no text content/);
  assert.throws(() => parseCatalogEntries([
    { id: 3, result: { content: [{ type: 'text', text: 'not json' }] } },
  ]), /could not parse/);
  assert.throws(() => parseCatalogEntries([
    { id: 3, result: { content: [{ type: 'text', text: '{}' }] } },
  ]), /nonempty backend array/);
  assert.throws(() => parseCatalogEntries([
    { id: 3, result: { content: [{ type: 'text', text: '[{}]' }] } },
  ]), /invalid backend entry/);
  assert.throws(() => parseCatalogEntries([
    { id: 3, result: { content: [{ type: 'text', text: '[{"backend":"vegalite","count":0,"chartTypes":[]},{"backend":" vegalite ","count":0,"chartTypes":[]}]' }] } },
  ]), /invalid backend entry|duplicate backend/);
  assert.deepEqual(parseCatalogEntries([
    { id: 3, result: { content: [{ type: 'text', text: '[{"backend":"vegalite","count":1,"chartTypes":["Bar Chart"]}]' }] } },
  ]), [{ backend: 'vegalite', count: 1, chartTypes: ['Bar Chart'] }]);
});

test('manifest copies current discovery metadata and report dependencies', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const plugin = JSON.parse(read('plugin.json'));
  assert.equal(manifest.version, '2.4.0');
  assert.equal(plugin.version, '2.4.0');
  assert.match(read('README.md'), /Current release: v2\.4\.0/);
  assert.match(read('CHANGELOG.md'), /## \[2\.2\.2\] - 2026-08-15/);
  const skills = new Map(manifest.assets.skills.map((skill) => [skill.name, skill]));
  for (const name of ['docs-shell', 'setup-illustrator-runtime', 'svg-banner']) {
    assert.equal(skills.get(name).frontmatter.description,
      frontmatterDescription(`.github/skills/${name}/SKILL.md`));
  }
  assert(skills.get('docs-shell').bundled_resources.some((resource) =>
    resource.path === '.github/skills/docs-shell/starter/example-report.html'));
  assert(skills.get('docs-shell').bundled_resources.some((resource) =>
    resource.path === '.github/skills/docs-shell/starter/assets/report-topnav.js'));
  assert.match(read('.github/skills/docs-shell/starter/example-report.html'),
    /<script src="assets\/report-topnav\.js" defer><\/script>/);
  const flint = manifest.assets.mcp.servers.find((server) => server.server_name === 'flint');
  assert.match(flint.notes, /0\.5\.0/);
  assert.doesNotMatch(flint.notes, /0\.4\.1/);
});

test('user-facing prompts and skill guidance use the plugin namespace', () => {
  for (const name of [
    'render-chart',
    'banner',
    'install-visual-companions',
    'setup-illustrator-runtime',
  ]) {
    const prompt = read(`.github/prompts/${name}.prompt.md`);
    assert.match(prompt, new RegExp(`# /alex-act-illustrator-plugin ${name}`));
    assert.doesNotMatch(prompt, new RegExp(`# /${name}(?:\\s|$)`));
  }
  const install = read('.github/skills/install-visual-companions/SKILL.md');
  assert.match(install, /\/alex-act-illustrator-plugin install-visual-companions/);
  assert.doesNotMatch(install, /invoke `\/install-visual-companions`/);
});

test('Flint 0.5.x runtime contracts expose themes and source-owned authoring guidance', () => {
  const provisioner = read('.github/skills/setup-illustrator-runtime/scripts/provision-runtime.mjs');
  const verifier = read('scripts/verify-install.mjs');
  const manifest = JSON.parse(read('manifest.json'));
  const flint = manifest.assets.mcp.servers.find((server) => server.server_name === 'flint');

  assert.match(provisioner, /name:\s*'flint-chart-mcp',\s*version:\s*'0\.5\.0'/);
  assert.match(verifier, /list_themes/);
  assert.match(verifier, /flint:\/\/agent-skill/);
  assert.match(verifier, /flint:\/\/theme-skill/);
  assert.match(verifier, /author_flint_chart/);
  assert.match(verifier, /author_flint_theme/);
  assert.match(flint.notes, /0\.5\.0/);
  assert.doesNotMatch(flint.notes, /0\.4\.1/);
});

test('Flint verifier covers the documented backend artifact boundaries', () => {
  const verifier = read('scripts/verify-install.mjs');

  assert.match(verifier, /WANT_ARTIFACTS/);
  assert.match(verifier, /Vega-Lite themed bar SVG/);
  assert.match(verifier, /ECharts Tree SVG/);
  assert.match(verifier, /Chart\.js bar PNG/);
  assert.match(verifier, /chartjs backend supports png output only/i);
  assert.match(verifier, /compile_chart \(\$\{spec\.name\}\)/);
  assert.match(verifier, /render_chart \(\$\{spec\.name\}\)/);
});

test('Flint language reference stays linked to the pinned grammar and rendered evidence', () => {
  const reference = read('.github/skills/flint-chart/references/flint-language-reference.md');
  const skill = read('.github/skills/flint-chart/SKILL.md');

  assert.match(reference, /Pinned runtime.*flint-chart-mcp@0\.5\.0/is);
  assert.match(reference, /ChartAssemblyInput/);
  assert.match(reference, /semantic_types/);
  assert.match(reference, /chart_spec/);
  assert.match(reference, /create_chart_view/);
  assert.match(reference, /--disable-file-reference/);
  assert.match(reference, /Heart with Axes demo/);
  assert.match(reference, /https:\/\/github\.com\/fabioc-aloha\/Alex_ACT_Illustrator_Plugin\/blob\/main\/demos\/heart-with-axes\/report\.html/);
  for (const link of [
    'https://github.com/microsoft/flint-chart/blob/0.5/docs/api-reference.md',
    'https://github.com/microsoft/flint-chart/blob/0.5/docs/design-semantics.md',
    'https://github.com/microsoft/flint-chart/blob/0.5/docs/architecture.md',
    'https://github.com/microsoft/flint-chart/blob/0.5/packages/flint-mcp/README.md',
  ]) {
    assert(reference.includes(link), `missing Flint reference link: ${link}`);
  }
  assert.match(skill, /references\/flint-language-reference\.md/);
  const manifest = JSON.parse(read('manifest.json'));
  const flintSkill = manifest.assets.skills.find((skillEntry) => skillEntry.name === 'flint-chart');
  assert(flintSkill.bundled_resources.some((resource) =>
    resource.path === '.github/skills/flint-chart/references/flint-language-reference.md'));
});

test('Flint matrix and guidance qualify backend capabilities and demo provenance', () => {
  const matrix = read('docs/flint-mcp-0.5.0-capability-matrix.md');
  const conformance = read('docs/flint-mcp-conformance.md');
  const skill = read('.github/skills/flint-chart/SKILL.md');
  const prompt = read('.github/prompts/render-chart.prompt.md');
  const demo = read('demos/README.md');
  const readme = read('README.md');

  for (const boundary of [
    /Vega-Lite themed bar/,
    /ECharts Tree/,
    /Chart\.js bar/,
    /Chart\.js rejects SVG/,
    /create_chart_view.*Vega-Lite/is,
  ]) assert.match(matrix, boundary);
  assert.match(skill, /`"Tree"` \(ECharts only\)/);
  assert.doesNotMatch(skill, /Hierarchy Tree\s*\|\s*Not in Flint's scope/);
  assert.match(skill, /"Sankey Diagram"/);
  assert.match(prompt, /For a Vega-Lite candidate, default to `create_chart_view`/);
  assert.match(prompt, /Chart\.js renders PNG only/);
  assert.match(demo, /illustrative direct Vega-Lite demo/);
  assert.match(readme, /direct Vega-Lite narrative artifact/);
  assert.match(readme, /rather than a `ChartAssemblyInput` conformance fixture/);
  assert.match(conformance, /ARTIFACT_SPECS/);
});

test('render-chart orchestrates bounded expert storytelling over one semantic truth layer', () => {
  const prompt = read('.github/prompts/render-chart.prompt.md');
  const flint = read('.github/skills/flint-chart/SKILL.md');
  const bigIdea = read('.github/skills/chart-big-idea/SKILL.md');

  assert.match(prompt, /explanatory.*exploratory.*persuasive/is);
  assert.match(prompt, /same `data` and `semantic_types`|keep.*`semantic_types`.*stable/is);
  assert.match(prompt, /familiar.*expressive/is);
  assert.match(prompt, /materially different|not.*palette-only/is);
  assert.match(prompt, /claim.*conflict.*data|data.*conflict.*claim/is);
  assert.match(prompt, /diagnostic.*fully formed spec.*explicit treatment/is);
  assert.match(prompt, /strongest rejected alternative/i);
  assert.match(prompt, /chart_spec\.title/);
  assert.match(prompt, /chart_spec\.subtitle/);
  assert.match(prompt, /standalone Vega-Lite chart/i);
  assert.match(flint, /title\?: string/);
  assert.match(flint, /subtitle\?: string/);
  assert.match(flint, /Carry the Big Idea into the chart/);
  assert.match(bigIdea, /chart_spec\.title/);
  assert.match(bigIdea, /chart_spec\.subtitle/);
});

test('focused skills own expert storytelling techniques and audience-side critique', () => {
  const bigIdea = read('.github/skills/chart-big-idea/SKILL.md');
  const vocabulary = read('.github/skills/chart-vocabulary/SKILL.md');
  const verify = read('.github/skills/render-verify/SKILL.md');

  assert.match(bigIdea, /explanatory.*exploratory.*persuasive/is);
  assert.match(bigIdea, /theme.*tone|tone.*theme/is);
  for (const technique of [
    /direct label/i,
    /focal contrast/i,
    /reference (?:line|band|structure)/i,
    /small multiples/i,
    /redundant encoding/i,
  ]) assert.match(vocabulary, technique);
  assert.match(verify, /first focal point/i);
  assert.match(verify, /reading order/i);
  assert.match(verify, /accessib/i);
  assert.match(verify, /without relying on surrounding prose|without the explanation/is);
});

test('flint-theme composes upstream grammar with Theme Lab iteration and render verification', () => {
  const path = '.github/skills/flint-theme/SKILL.md';
  assert(existsSync(join(root, path)), 'flint-theme skill is missing');
  const skill = read(path);

  assert.match(skill, /flint:\/\/theme-skill/);
  assert.match(skill, /author_flint_theme/);
  assert.match(skill, /Theme Lab/);
  assert.match(skill, /untrusted/i);
  assert.match(skill, /bare.*ThemeSpec|ThemeSpec.*bare/is);
  assert.match(skill, /render-verify/);
  assert.match(skill, /line.*matrix.*part-to-whole.*multiseries.*distribution.*diverging/is);
  assert.match(skill, /Would Revise If/);
});

test('storytelling composition preserves focused owners and optional companions', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const names = manifest.assets.skills.map((skill) => skill.name);
  const companions = read('.github/skills/install-visual-companions/SKILL.md');

  assert.equal(names.length, 15);
  assert(names.includes('flint-theme'));
  assert(names.includes('ascii-chart'));
  assert(names.includes('annotate-screenshot'));
  assert(!names.includes('flint-chart-author'));
  assert(!names.includes('visual-storytelling'));
  // storytelling-requirements retired with its plugin under ADR-039; chart-big-idea owns the framing gate.
  assert(!/copilot plugin install storytelling-requirements/.test(companions));
  for (const stage of [
    /requirements and audience/i,
    /spatial ideation/i,
    /independent reading/i,
    /render QA/i,
    /evidence-rich review/i,
    /critique and handoff/i,
  ]) assert.match(companions, stage);
  assert.match(companions, /never install.*silently|never install without.*consent/is);
  assert.match(companions, /absence.*healthy|not.*incomplete/is);
});
