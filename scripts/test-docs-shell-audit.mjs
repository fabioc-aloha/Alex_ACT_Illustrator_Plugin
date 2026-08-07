import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const auditScript = join(root, '.github', 'skills', 'docs-shell', 'scripts', 'audit-docs-shell.mjs');
const canonicalShell = join(root, '.github', 'skills', 'docs-shell', 'starter', 'index.html');

function digest(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function runAudit(shell, projectRoot) {
  const result = spawnSync(process.execPath, [
    auditScript,
    '--shell',
    shell,
    '--project-root',
    projectRoot,
    '--json',
  ], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    assert.fail(`audit emitted invalid JSON: ${result.stdout || result.stderr}`);
  }
  return { ...result, report };
}

test('canonical starter passes the capability audit without mutation', () => {
  const manifest = join(dirname(canonicalShell), 'manifest.json');
  const before = [digest(canonicalShell), digest(manifest)];
  const result = runAudit(canonicalShell, dirname(canonicalShell));

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.status, 'current');
  assert.equal(result.report.summary.requiredFailed, 0);
  assert.equal(result.report.location, 'root');
  assert.deepEqual([digest(canonicalShell), digest(manifest)], before);
});

test('legacy subfolder shell reports required gaps and local extensions without mutation', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'docs-shell-audit-'));
  try {
    const shell = join(fixture, 'docs', 'index.html');
    const manifest = join(fixture, 'docs', 'manifest.json');
    const source = join(fixture, 'docs', 'about.md');
    mkdirSync(dirname(shell), { recursive: true });
    writeFileSync(shell, '<!doctype html><html><body><main id="content"></main></body></html>');
    writeFileSync(source, '# About\n');
    writeFileSync(manifest, JSON.stringify({
      brand: { label: 'Fixture', href: 'index.html' },
      defaultArea: 'docs',
      site: { deployedAreas: ['docs'] },
      areas: [{
        id: 'docs',
        label: 'Docs',
        secondary: true,
        defaultDoc: 'about',
        docs: [{
          id: 'about',
          label: 'About',
          title: 'About',
          sourceLink: { href: 'about.md' },
          sources: ['about.md'],
        }],
      }],
    }, null, 2));
    const before = [digest(shell), digest(manifest), digest(source)];
    const result = runAudit(shell, fixture);

    assert.equal(result.status, 2);
    assert.equal(result.report.status, 'needs-upgrade');
    assert(result.report.summary.requiredFailed > 0);
    assert(result.report.required.some((check) => check.id === 'sanitized-markdown' && !check.pass));
    assert(result.report.required.some((check) => check.id === 'content-overflow-contained' && !check.pass));
    assert(result.report.extensions.topLevel.includes('site'));
    assert(result.report.extensions.area.includes('secondary'));
    assert(result.report.extensions.doc.includes('sourceLink'));
    assert.equal(result.report.location, 'nested');
    assert.deepEqual([digest(shell), digest(manifest), digest(source)], before);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('invalid routing and root-relative report dependencies fail closed', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'docs-shell-invalid-'));
  try {
    const shell = join(fixture, 'index.html');
    const manifest = join(fixture, 'manifest.json');
    writeFileSync(shell, `${readFileSync(canonicalShell, 'utf8')}\n<script src='https://cdn.example/latest.js'></script>`);
    writeFileSync(join(fixture, 'report.html'), "<script src='/assets/missing.js'></script>");
    writeFileSync(manifest, JSON.stringify({
      brand: { label: 'Fixture', href: 'index.html' },
      defaultArea: 'missing',
      areas: [{
        id: 'docs',
        label: 'Docs',
        defaultDoc: 'missing',
        docs: [
          { id: 'empty', label: 'Empty', title: 'Empty', sources: [] },
          { id: 'report', label: 'Report', title: 'Report', sources: ['report.html'] },
        ],
      }],
    }, null, 2));

    const result = runAudit(shell, fixture);
    assert.equal(result.status, 2);
    assert(result.report.required.some((check) => check.id === 'manifest-routing' && !check.pass));
    assert(result.report.required.some((check) => check.id === 'integrity-pinned-cdn' && !check.pass));
    const dependencies = result.report.required.find((check) =>
      check.id === 'local-html-dependencies-resolve');
    assert.equal(dependencies.pass, false);
    assert.match(dependencies.detail, /assets\\missing\.js|assets\/missing\.js/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('missing project-root value returns a structured invalid report', () => {
  const result = spawnSync(process.execPath, [
    auditScript,
    '--shell',
    canonicalShell,
    '--project-root',
    '--json',
  ], { cwd: root, encoding: 'utf8', shell: false });

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, 'invalid');
  assert.match(report.error, /Usage:/);
});

test('canonical containment preserves child horizontal scrollers', () => {
  const html = readFileSync(canonicalShell, 'utf8');

  assert.match(html, /#content\s*\{[^}]*overflow-x:\s*clip/s);
  assert.match(html, /#content \.table-wrap\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(html, /#content pre\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(html, /\.mermaid\s*\{[^}]*overflow-x:\s*auto/s);
});
