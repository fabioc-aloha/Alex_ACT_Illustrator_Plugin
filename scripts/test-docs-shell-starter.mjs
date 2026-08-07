import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const starterRoot = join(root, '.github', 'skills', 'docs-shell', 'starter');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory()
      ? walkFiles(join(directory, entry.name))
      : [join(directory, entry.name)]);
}

test('docs-shell manifest declares every starter file', () => {
  const manifest = JSON.parse(read('manifest.json'));
  const skill = manifest.assets.skills.find((candidate) => candidate.name === 'docs-shell');
  assert(skill, 'docs-shell missing from manifest');

  const declared = skill.bundled_resources
    .map((resource) => resource.path.replaceAll('\\', '/'))
    .filter((path) => path.startsWith('.github/skills/docs-shell/starter/'))
    .sort();
  const actual = walkFiles(starterRoot)
    .map((file) => relative(root, file).replaceAll('\\', '/'))
    .sort();

  assert.deepEqual(declared, actual,
    'every starter file must be declared so manifest-driven adoption is complete');
});

test('standalone report navigation preserves report spacing and print output', () => {
  const navigator = read('.github/skills/docs-shell/starter/assets/report-topnav.js');

  assert.match(navigator, /report-topnav-spacer/,
    'fixed navigation needs an in-flow spacer instead of replacing body padding');
  assert.match(navigator, /ResizeObserver/,
    'the spacer must track navigation height changes after resize or wrapping');
  assert.match(navigator, /@media print[^}]*report-topnav-spacer/s,
    'print must hide the spacer together with the navigation');
  assert.doesNotMatch(navigator, /body\.style\.paddingTop/,
    'navigation must not overwrite an adopter report\'s body padding');
});

test('standalone report navigation matches the shell mobile overflow policy', () => {
  const navigator = read('.github/skills/docs-shell/starter/assets/report-topnav.js');
  const mobile = navigator.match(/@media \(max-width: 700px\) \{[\s\S]*?\n    \}/)?.[0] ?? '';

  assert.match(mobile, /\.topnav-areas,[\s\S]*\.topnav-docs/);
  assert.match(mobile, /flex-wrap:\s*nowrap/);
  assert.match(mobile, /overflow-x:\s*auto/);
});

test('standalone report navigation follows generic manifest area order', () => {
  const navigator = read('.github/skills/docs-shell/starter/assets/report-topnav.js');

  assert.match(navigator, /manifest\.areas\.map/);
  assert.doesNotMatch(navigator, /deployedAreas|data-secondary|\.secondary/,
    'project-specific deployment ordering does not belong in the generic starter');
});

test('quickJump guidance matches the starter opt-in runtime', () => {
  const skill = read('.github/skills/docs-shell/SKILL.md');
  const manifest = read('.github/skills/docs-shell/starter/manifest.json');
  const reference = read('docs/shell/README.md');

  assert.doesNotMatch(skill, /quickJumps rendered by default/i);
  assert.doesNotMatch(manifest, /renders these .* by default|adopters who want them get them by default/i);
  assert.doesNotMatch(reference, /renders quickJumps by default/i);
  assert.match(reference, /quickJumps.*opt-in/is);
});

test('docs-shell guidance describes the complete starter without stale counts', () => {
  const files = [
    '.github/skills/docs-shell/SKILL.md',
    'docs/shell/README.md',
    'README.md',
    'manifest.json',
  ];
  const staleCount = /three-file|four-file|three files|four files|index\.html \+ manifest\.json \+ about\.md/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), staleCount, `${file} contains a stale starter inventory`);
  }
  assert.match(read('.github/skills/docs-shell/SKILL.md'), /report-topnav\.js/,
    'the skill must explain the optional persistent navigation asset');
});


test('starter bundles a portable adoption guide with upgrade pitfalls', () => {
  const guide = read('.github/skills/docs-shell/starter/ADOPTION.md');
  const manifest = read('.github/skills/docs-shell/starter/manifest.json');
  const navigator = read('.github/skills/docs-shell/starter/assets/report-topnav.js');

  assert.match(guide, /fresh adoption/i);
  assert.match(guide, /upgrade an existing shell/i);
  assert.match(guide, /audit-docs-shell\.mjs/);
  assert.match(guide, /repository root/i);
  assert.match(guide, /stable subfolder/i);
  assert.match(guide, /file:\/\//i);
  assert.match(guide, /http:\/\//i);
  assert.match(guide, /do not overwrite.*manifest/i);
  assert.match(manifest, /paths.*relative to.*manifest/i);
  assert.doesNotMatch(navigator, /sets body \{ padding-top \}/);
  assert.match(navigator, /spacer/i);
});

test('docs-shell guidance supports stable roots and declares the read-only audit', () => {
  const skill = read('.github/skills/docs-shell/SKILL.md');
  const reference = read('docs/shell/README.md');
  const manifest = JSON.parse(read('manifest.json'));
  const docsShell = manifest.assets.skills.find((candidate) => candidate.name === 'docs-shell');

  assert.match(skill, /repository root is recommended[\s\S]*stable subfolder/i);
  assert.match(reference, /--project-root/);
  assert.match(reference, /read-only/i);
  assert(docsShell.bundled_resources.some((resource) =>
    resource.path === '.github/skills/docs-shell/scripts/audit-docs-shell.mjs'),
  'the audit script must travel with manifest-driven installs');
});
