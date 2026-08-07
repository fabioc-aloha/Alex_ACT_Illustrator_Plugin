#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');

function optionValue(name) {
  const index = args.indexOf(name);
  const value = index >= 0 ? args[index + 1] : null;
  return value && !value.startsWith('--') ? value : null;
}
const shellArg = optionValue('--shell');
const projectRootArg = optionValue('--project-root');
const invalidArgs = (args.includes('--shell') && !shellArg)
  || (args.includes('--project-root') && !projectRootArg);
const projectRoot = resolve(projectRootArg ?? process.cwd());

function emit(report, exitCode) {
  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`docs-shell audit: ${report.status}`);
    console.log(`Shell: ${report.shell}`);
    console.log(`Manifest: ${report.manifest}`);
    for (const check of report.required ?? []) {
      console.log(`${check.pass ? 'PASS' : 'FAIL'}  ${check.id}: ${check.detail}`);
    }
    const present = Object.entries(report.optional ?? {})
      .filter(([, value]) => value === true || (Number.isInteger(value) && value > 0))
      .map(([key]) => key);
    console.log(`Optional capabilities: ${present.length ? present.join(', ') : 'none detected'}`);
    const extensionCount = Object.values(report.extensions ?? {}).reduce((sum, values) => sum + values.length, 0);
    console.log(`Local manifest extensions: ${extensionCount}`);
  }
  process.exitCode = exitCode;
}

function fail(message) {
  emit({
    schemaVersion: 1,
    status: 'invalid',
    error: message,
    required: [],
    optional: {},
    extensions: { topLevel: [], area: [], doc: [], hero: [] },
    summary: { requiredPassed: 0, requiredFailed: 0 },
  }, 1);
}

if (invalidArgs || !shellArg) {
  fail('Usage: audit-docs-shell.mjs --shell <path-to-index.html> [--project-root <path>] [--json]');
} else {
  const shellPath = resolve(shellArg);
  const manifestPath = join(dirname(shellPath), 'manifest.json');

  if (!existsSync(shellPath)) {
    fail(`Shell not found: ${shellPath}`);
  } else if (!existsSync(manifestPath)) {
    fail(`Adjacent manifest not found: ${manifestPath}`);
  } else {
    let manifest;
    let shell;
    try {
      shell = readFileSync(shellPath, 'utf8');
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      fail(`Could not read shell contract: ${error.message}`);
    }

    if (manifest) {
      const shellRoot = dirname(shellPath);
      const areas = Array.isArray(manifest.areas) ? manifest.areas : [];
      const docs = areas.flatMap((area) => Array.isArray(area.docs) ? area.docs : []);
      const required = [];
      const check = (id, pass, detail) => required.push({ id, pass: Boolean(pass), detail });

      check('manifest-areas', areas.length > 0,
        areas.length > 0 ? `${areas.length} area(s)` : 'areas must be a non-empty array');

      const routingIssues = [];
      const areaIds = new Set();
      if (!areas.some((area) => area.id === manifest.defaultArea)) {
        routingIssues.push(`defaultArea does not resolve: ${manifest.defaultArea ?? '(missing)'}`);
      }
      for (const area of areas) {
        if (!area.id || areaIds.has(area.id)) routingIssues.push(`invalid or duplicate area id: ${area.id ?? '(missing)'}`);
        areaIds.add(area.id);
        const areaDocs = Array.isArray(area.docs) ? area.docs : [];
        const docIds = new Set();
        if (!areaDocs.some((doc) => doc.id === area.defaultDoc)) {
          routingIssues.push(`${area.id ?? '(unnamed)'} defaultDoc does not resolve: ${area.defaultDoc ?? '(missing)'}`);
        }
        for (const doc of areaDocs) {
          if (!doc.id || docIds.has(doc.id)) routingIssues.push(`${area.id ?? '(unnamed)'} has invalid or duplicate doc id: ${doc.id ?? '(missing)'}`);
          docIds.add(doc.id);
          if (!Array.isArray(doc.sources) || doc.sources.length === 0
            || doc.sources.some((source) => typeof source !== 'string' || !source.trim())) {
            routingIssues.push(`${area.id ?? '(unnamed)'}/${doc.id ?? '(unnamed)'} sources must be non-empty strings`);
          }
        }
      }
      check('manifest-routing', routingIssues.length === 0,
        routingIssues.length === 0 ? 'default routes, ids, and sources are coherent' : routingIssues.join('; '));

      const missingSources = [];
      for (const doc of docs) {
        const sources = Array.isArray(doc.sources) ? doc.sources : [];
        for (const source of sources) {
          if (typeof source !== 'string' || !source.trim()) continue;
          const target = isAbsolute(source) ? source : resolve(shellRoot, source);
          if (!existsSync(target)) missingSources.push(`${doc.id ?? '(unnamed)'}: ${source}`);
        }
      }
      check('manifest-sources-exist', missingSources.length === 0,
        missingSources.length === 0 ? `${docs.length} doc(s) resolved` : missingSources.join('; '));

      // These are source-level capability checks, not an HTML parser. Keep each
      // pattern tied to one observable contract and backed by a regression fixture.
      check('sanitized-markdown', /DOMPurify\.sanitize\s*\(/.test(shell),
        'rendered Markdown passes through DOMPurify');
      check('strict-mermaid', /securityLevel:\s*['"]strict['"]/.test(shell),
        'Mermaid uses strict security mode');

      const externalTags = [
        ...shell.matchAll(/<(?:link|script)\b[^>]+(?:href|src)="https:\/\/[^>]+>/gi),
        ...shell.matchAll(/<(?:link|script)\b[^>]+(?:href|src)='https:\/\/[^>]+>/gi),
      ].map((match) => match[0]);
      const unpinned = externalTags.filter((tag) => !/integrity=(?:"sha384-[^"]+"|'sha384-[^']+')/.test(tag)
        || !/crossorigin=(?:"anonymous"|'anonymous')/.test(tag));
      check('integrity-pinned-cdn', unpinned.length === 0,
        externalTags.length === 0 ? 'no external CDN assets' : `${externalTags.length - unpinned.length}/${externalTags.length} external assets pinned`);

      check('mobile-horizontal-nav', /@media \(max-width: 700px\)[\s\S]*?overflow-x:\s*auto/.test(shell),
        'compact navigation scrolls horizontally');
      check('bounded-mobile-toc', /@media \(max-width: 1100px\)[\s\S]*?max-height:\s*360px/.test(shell),
        'compact table of contents is bounded');
      check('content-overflow-contained', /#content\s*\{[^}]*overflow-x:\s*clip/s.test(shell),
        'wide descendants cannot enlarge the page');

      const missingHtmlDependencies = [];
      for (const doc of docs) {
        for (const source of Array.isArray(doc.sources) ? doc.sources : []) {
          if (!/\.html$/i.test(source)) continue;
          const htmlPath = isAbsolute(source) ? source : resolve(shellRoot, source);
          if (!existsSync(htmlPath)) continue;
          const html = readFileSync(htmlPath, 'utf8');
          const dependencies = [
            ...html.matchAll(/<(?:script|link|img)\b[^>]+(?:src|href)="([^"]+)"/gi),
            ...html.matchAll(/<(?:script|link|img)\b[^>]+(?:src|href)='([^']+)'/gi),
          ];
          for (const match of dependencies) {
            const dependency = match[1];
            if (/^(?:https?:|data:|#|\/\/)/i.test(dependency)) continue;
            const dependencyPath = dependency.split(/[?#]/, 1)[0];
            // Root-relative report assets resolve from the adopter's project root;
            // ordinary relative assets resolve from the report file itself.
            const target = dependencyPath.startsWith('/')
              ? resolve(projectRoot, dependencyPath.replace(/^\/+/, ''))
              : resolve(dirname(htmlPath), dependencyPath);
            if (!existsSync(target)) missingHtmlDependencies.push(`${source}: ${dependency}`);
          }
        }
      }
      check('local-html-dependencies-resolve', missingHtmlDependencies.length === 0,
        missingHtmlDependencies.length === 0 ? 'all local HTML dependencies resolve' : missingHtmlDependencies.join('; '));

      // Unknown manifest fields are adoption evidence, not corruption. Report them
      // separately so an upgrade can preserve project-owned extensions.
      const collectExtensions = (objects, standard) => [...new Set(objects.flatMap((object) =>
        Object.keys(object ?? {}).filter((key) => !key.startsWith('$') && !standard.has(key))))].sort();
      const standardTopLevel = new Set(['brand', 'theme', 'defaultArea', 'areas']);
      const standardArea = new Set(['id', 'label', 'folder', 'defaultDoc', 'docs', 'quickJumps']);
      const standardDoc = new Set(['id', 'label', 'icon', 'title', 'verified', 'hero', 'sources']);
      const standardHero = new Set(['eyebrow', 'title', 'subtitle', 'description']);
      const extensions = {
        topLevel: collectExtensions([manifest], standardTopLevel),
        area: collectExtensions(areas, standardArea),
        doc: collectExtensions(docs, standardDoc),
        hero: collectExtensions(docs.map((doc) => doc.hero).filter(Boolean), standardHero),
      };

      const htmlDocs = docs.filter((doc) => Array.isArray(doc.sources)
        && doc.sources.length > 0
        && doc.sources.every((source) => /\.html$/i.test(source)));
      const quickJumpCount = areas.reduce((sum, area) => sum + (Array.isArray(area.quickJumps) ? area.quickJumps.length : 0), 0);
      const reportNavigation = htmlDocs.some((doc) => doc.sources.some((source) => {
        const htmlPath = isAbsolute(source) ? source : resolve(shellRoot, source);
        return existsSync(htmlPath) && /report-topnav\.js/.test(readFileSync(htmlPath, 'utf8'));
      }));

      const canonicalShell = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'starter', 'index.html');
      const shellHash = createHash('sha256').update(shell).digest('hex');
      const canonicalHash = existsSync(canonicalShell)
        ? createHash('sha256').update(readFileSync(canonicalShell)).digest('hex')
        : null;
      const requiredFailed = required.filter((item) => !item.pass).length;
      const report = {
        schemaVersion: 1,
        status: requiredFailed === 0 ? 'current' : 'needs-upgrade',
        shell: shellPath,
        manifest: manifestPath,
        location: dirname(shellPath) === projectRoot ? 'root' : 'nested',
        required,
        optional: {
          readAloud: /setupReadAloud/.test(shell),
          directHtmlDocs: /isStandaloneHtmlDoc/.test(shell),
          viewTransitions: /@view-transition/.test(shell),
          preHydrate: /preHydrateShell/.test(shell),
          persistentReportNavigation: reportNavigation,
          quickJumpsDeclared: quickJumpCount,
          rendererMatchesCanonical: canonicalHash !== null && shellHash === canonicalHash,
        },
        extensions,
        summary: {
          areas: areas.length,
          docs: docs.length,
          requiredPassed: required.length - requiredFailed,
          requiredFailed,
          extensionFields: Object.values(extensions).reduce((sum, values) => sum + values.length, 0),
        },
      };
      // Exit 2 means a valid audit found upgrade work; exit 1 is reserved for
      // invalid input, so automation can distinguish findings from tool failure.
      emit(report, requiredFailed === 0 ? 0 : 2);
    }
  }
}
