// Big Idea report topnav — injects the shell's primary navigation into
// standalone HTML reports so navigation persists across the shell → report boundary.
// Loaded via <script src="../../assets/report-topnav.js" defer></script> from any
// report at reports/YYYY-MM-DD-slug/report.html. Manifest URL and shell root are
// derived from the script's own src, so the same file works from any depth.
// Fails silently if manifest.json can't be fetched (report still renders standalone).

(function () {
  'use strict';

  const scriptEl = document.currentScript
    || document.querySelector('script[src*="report-topnav.js"]');
  if (!scriptEl) return;

  let manifestUrl, shellRoot;
  try {
    // Script at <root>/assets/report-topnav.js → manifest at <root>/manifest.json.
    manifestUrl = new URL('../manifest.json', scriptEl.src).href;
    shellRoot = new URL('../', scriptEl.src).href;
  } catch (e) {
    console.warn('report-topnav: could not resolve script src', e);
    return;
  }

  const CSS = `
    nav.report-topnav {
      /* position: fixed + full viewport width so the nav spans the top regardless of
         the adopter report's body constraints (max-width, padding, centered layout).
         The render function below measures the nav and sets body { padding-top } so
         content is not overlapped. */
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #0d1117; color: #f0f6fc;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.4rem 1.25rem;
      font-family: "Segoe UI Variable", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 0.8125rem; line-height: 1.4;
      font-variant-numeric: tabular-nums;
      box-sizing: border-box;
    }
    nav.report-topnav .topnav-inner {
      max-width: 1400px; margin: 0 auto;
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: nowrap;
    }
    nav.report-topnav .topnav-brand {
      color: #f0f6fc; font-weight: 600; text-decoration: none;
      padding: 0.25rem 0.6rem 0.25rem 0;
      border-right: 1px solid rgba(255, 255, 255, 0.12);
      margin-right: 0.5rem;
      display: inline-flex; align-items: center; gap: 0.5rem;
    }
    nav.report-topnav .topnav-brand:hover { color: #58a6ff; }
    nav.report-topnav .topnav-list {
      display: flex; gap: 0.15rem; list-style: none;
      margin: 0; padding: 0; flex-wrap: nowrap;
      overflow-x: auto; scrollbar-width: none;
    }
    nav.report-topnav .topnav-list::-webkit-scrollbar { display: none; }
    nav.report-topnav .topnav-areas { min-width: 0; }
    nav.report-topnav .topnav-sub {
      max-width: 1400px; margin: 0.35rem auto 0;
      padding-top: 0.35rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex; align-items: center; gap: 0.5rem; min-width: 0;
    }
    nav.report-topnav .topnav-docs { width: 100%; }
    nav.report-topnav .topnav-areas a { font-weight: 600; }
    nav.report-topnav .topnav-sub .topnav-docs a { font-size: 0.78125rem; }
    nav.report-topnav a[data-nav] {
      color: #9198a1; text-decoration: none;
      padding: 0.3rem 0.7rem; border-radius: 4px;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
    }
    nav.report-topnav a[data-nav]:hover {
      background: rgba(255, 255, 255, 0.06); color: #f0f6fc;
    }
    nav.report-topnav a[data-nav].active {
      background: rgba(88, 166, 255, 0.15); color: #58a6ff; font-weight: 600;
    }
    nav.report-topnav a:focus-visible {
      outline: 2px solid #58a6ff; outline-offset: 2px;
    }
    @media (max-width: 700px) {
      nav.report-topnav { padding: 0.4rem 0.75rem; }
      nav.report-topnav .topnav-inner { gap: 0.5rem; }
      nav.report-topnav .topnav-brand {
        flex: 0 0 auto; margin-right: 0; padding-right: 0.65rem;
      }
    }
    @media print { nav.report-topnav { display: none; } }
  `;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render(manifest) {
    if (!manifest || !Array.isArray(manifest.areas) || !manifest.areas.length) return;

    const currentHref = location.href.toLowerCase();
    let currentArea = null, currentDoc = null;
    for (const area of manifest.areas) {
      for (const doc of (area.docs || [])) {
        for (const src of (doc.sources || [])) {
          const abs = new URL(src, shellRoot).href.toLowerCase();
          if (currentHref === abs || currentHref.endsWith('/' + src.toLowerCase())) {
            currentDoc = doc; currentArea = area; break;
          }
        }
        if (currentDoc) break;
      }
      if (currentDoc) break;
    }
    if (!currentArea) currentArea = manifest.areas[0];

    const brandLabel = (manifest.brand && manifest.brand.label) || 'Docs';
    const shellIndex = shellRoot + 'index.html';

    const areasHtml = manifest.areas.map(a => {
      const active = a.id === currentArea.id ? ' class="active" aria-current="page"' : '';
      const href = `${shellIndex}?area=${encodeURIComponent(a.id)}`;
      return `<li><a data-nav${active} href="${escapeHtml(href)}">${escapeHtml(a.label)}</a></li>`;
    }).join('');

    const docsHtml = (currentArea.docs || []).map(d => {
      const htmlOnly = Array.isArray(d.sources)
        && d.sources.length > 0
        && d.sources.every(s => s.toLowerCase().endsWith('.html'));
      const href = htmlOnly
        ? shellRoot + d.sources[0]
        : `${shellIndex}?area=${encodeURIComponent(currentArea.id)}&doc=${encodeURIComponent(d.id)}`;
      const active = currentDoc && d.id === currentDoc.id ? ' class="active" aria-current="page"' : '';
      return `<li><a data-nav${active} href="${escapeHtml(href)}">${escapeHtml(d.label)}</a></li>`;
    }).join('');

    const nav = document.createElement('nav');
    nav.className = 'report-topnav';
    nav.setAttribute('aria-label', 'Primary navigation');
    nav.innerHTML = `
      <div class="topnav-inner">
        <a class="topnav-brand" href="${escapeHtml(shellIndex)}">
          <span class="topnav-brand-label">${escapeHtml(brandLabel)}</span>
        </a>
        <ul class="topnav-list topnav-areas" aria-label="Sections">${areasHtml}</ul>
      </div>
      <div class="topnav-sub">
        <ul class="topnav-list topnav-docs" aria-label="Documents">${docsHtml}</ul>
      </div>
    `;

    const style = document.createElement('style');
    style.setAttribute('data-source', 'report-topnav');
    style.textContent = CSS;
    document.head.appendChild(style);
    document.body.insertBefore(nav, document.body.firstChild);
    requestAnimationFrame(() => {
      // Fixed nav is out of flow; push body content down by its measured height so
      // the adopter report's own top padding survives as breathing room below the nav.
      const navH = Math.ceil(nav.getBoundingClientRect().height);
      const existing = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
      if (navH > existing) document.body.style.paddingTop = navH + 'px';
      nav.querySelector('.topnav-areas .active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
      nav.querySelector('.topnav-docs .active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  fetch(manifestUrl)
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then(render)
    .catch(err => console.warn('report-topnav: manifest load failed', err));
})();
