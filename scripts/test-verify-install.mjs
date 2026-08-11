import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
      'flint-chart-mcp@0.4.1',
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

test('runtime setup audits stable dist-tags through the configured registry', () => {
  const provisioner = read('.github/skills/setup-illustrator-runtime/scripts/provision-runtime.mjs');
  const setupSkill = read('.github/skills/setup-illustrator-runtime/SKILL.md');
  assert.match(provisioner, /--check-updates/);
  assert.match(provisioner, /dist-tags\.latest/);
  assert.match(provisioner, /NPM_CONFIG_REGISTRY:\s*registry/);
  for (const packageSpec of [
    'flint-chart-mcp@0.4.1',
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
  assert.match(flint.notes, /0\.4\.1/);
  assert.doesNotMatch(flint.notes, /0\.3\.0/);
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
