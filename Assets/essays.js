(async function () {
  const mount = document.getElementById('essaysList');
  if (!mount) return;

  function badge(source) {
    if (source === 'substack') {
      return `<span class="pill pill-ext" title="Substack">Substack</span>`;
    }
    return `<span class="pill" title="Local file">Local</span>`;
  }

  function fmtDate(d) {
    try {
      const dt = new Date(d);
      if (!isNaN(dt)) return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch {}
    return '';
  }

  try {
    const res = await fetch('/archive/essays/essays.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('essays.json not found');
    const items = await res.json();

    // sort newest first (optional)
    items.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    mount.innerHTML = items.map(item => {
      const href = item.url;
      const title = item.title || href;
      const date = item.date ? ` <span class="muted">(${fmtDate(item.date)})</span>` : '';
      const isExternal = /^https?:\/\//i.test(href);
      const attrs = isExternal ? `target="_blank" rel="noopener"` : '';
      return `<li>
        <a href="${href}" ${attrs}>${title}</a>${date} ${badge(item.source)}
      </li>`;
    }).join('');
  } catch (e) {
    console.error(e);
    mount.innerHTML = `<li class="muted">No essays yet.</li>`;
  }
})();