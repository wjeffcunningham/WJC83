// --- Run-once guard (prevents doubling if the script is ever included twice) ---
if (window.__ARCHIVE_APP_RAN__) {
  console.debug('Archive app: already ran, skipping.');
} else {
  window.__ARCHIVE_APP_RAN__ = true;

  const STATE = { loaded: false };

  const MANIFESTS = [
    // Add more sections later if you want (old-movies, essays, etc.)
    {
      key: 'writing',
      title: 'Writing',
      // MAIN ARCHIVE lives at /archive/index.html, so Dojo manifest is here:
      manifestUrl: './dojo/manifest.json',
      // Items in the Dojo manifest have url like "./t2.980117jcu.pdf" (flat, no /files).
      // From this page we need to prefix "dojo/" so links resolve:
      prefixForLinks: 'dojo/'
    },
    {
      key: 'old-movies',
      title: 'Old Movies',
      manifestUrl: null // placeholder until you have one
    }
  ];

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const app = $('#app');

  function clearApp() {
    if (!app) return;
    app.innerHTML = '';
  }

  function el(tag, attrs = {}, html = '') {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') node.className = v;
      else node.setAttribute(k, v);
    }
    if (html) node.innerHTML = html;
    return node;
  }

  function renderShell() {
    const frag = document.createDocumentFragment();
    // optional status note
    frag.appendChild(el('div', { class: 'msg ok', id: 'status' }, 'Loading archive…'));

    MANIFESTS.forEach(({ key, title }) => {
      const details = el('details', { open: key === 'writing' });
      const summary = el('summary', {}, title);
      const ul = el('ul', { id: `${key}-list`, style: 'list-style:none;padding-left:0' });
      details.appendChild(summary);
      details.appendChild(ul);
      frag.appendChild(details);
    });

    app.appendChild(frag);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function liFromItem(item, linkPrefix = '') {
    const date = item.date ? new Date(item.date).toLocaleDateString() : '';
    const fmt = item.format ? item.format.toUpperCase() : '';
    const source = item.source || '';
    const title = item.title || item.filename;
    // item.url is "./<filename>" inside /archive/dojo/
    // From /archive/ we need "dojo/<filename>"
    const href = linkPrefix + item.url.replace(/^\.\//, '');
    return `
      <li style="margin:.5rem 0; padding:.5rem .75rem; border:1px solid #eee; border-radius:.5rem;">
        <div><a href="${href}" target="_blank" rel="noopener">${title}</a></div>
        <div style="opacity:.7;font-size:.9rem">${[date, fmt, source].filter(Boolean).join(' • ')}</div>
        ${item.blurb ? `<div>${item.blurb}</div>` : ''}
      </li>
    `;
  }

  async function render() {
    const status = $('#status');
    try {
      // Clear and build the shell ONCE to avoid duplicates
      clearApp();
      renderShell();

      // For each section, load and render (if it has a manifest)
      for (const m of MANIFESTS) {
        const ul = $(`#${m.key}-list`);
        if (!ul) continue;

        // Always clear the target list before appending (idempotent)
        ul.innerHTML = '';

        if (!m.manifestUrl) continue;

        const data = await fetchJson(m.manifestUrl);
        const items = Array.isArray(data.items) ? data.items.slice() : [];

        // newest first by ISO date
        items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        ul.innerHTML = items.map(i => liFromItem(i, m.prefixForLinks || '')).join('');
      }

      if (status) status.textContent = 'Archive loaded.';
      STATE.loaded = true;
    } catch (err) {
      console.error(err);
      if (status) status.classList.add('err'),
                   status.classList.remove('ok'),
                   status.textContent = `Error: ${err.message}`;
    }
  }

  // Kick off
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
}