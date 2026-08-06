import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveWindowsCommand, spawnCommand } from './process-launch.mjs';
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

test('manifest copies current discovery metadata and every starter dependency', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const skills = new Map(manifest.assets.skills.map((skill) => [skill.name, skill]));
  for (const name of ['docs-shell', 'svg-banner']) {
    assert.equal(skills.get(name).frontmatter.description,
      frontmatterDescription(`.github/skills/${name}/SKILL.md`));
  }
  assert(skills.get('docs-shell').bundled_resources.some((resource) =>
    resource.path === '.github/skills/docs-shell/starter/example-report.html'));
  const flint = manifest.assets.mcp.servers.find((server) => server.server_name === 'flint');
  assert.match(flint.notes, /0\.4\.1/);
  assert.doesNotMatch(flint.notes, /0\.3\.0/);
});

test('user-facing prompts and skill guidance use the plugin namespace', () => {
  for (const name of ['render-chart', 'banner', 'install-visual-companions']) {
    const prompt = read(`.github/prompts/${name}.prompt.md`);
    assert.match(prompt, new RegExp(`# /alex-act-illustrator-plugin ${name}`));
    assert.doesNotMatch(prompt, new RegExp(`# /${name}(?:\\s|$)`));
  }
  const install = read('.github/skills/install-visual-companions/SKILL.md');
  assert.match(install, /\/alex-act-illustrator-plugin install-visual-companions/);
  assert.doesNotMatch(install, /invoke `\/install-visual-companions`/);
});
