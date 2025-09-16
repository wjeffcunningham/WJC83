(function () {
  const el = document.getElementById('app');
  const put = (h) => el.insertAdjacentHTML('beforeend', h);
  const fmt = (s) => (s || '').toString().trim();
  const byDateDesc = (a,b) => (b.date || '').localeCompare(a.date || '');

  const normalizeBucket = (b) => (b || '').toLowerCase() === 'old movies' ? 'old-movies' : (b || '').toLowerCase();

  const card = (it) => `
    <article class="card tier-${it.tier || 3}">
      <a class="thumb" href="../${it.path}" target="_blank" aria-label="Open ${it.title}">
        <img src="../${it.thumbnail || 'assets/thumbs/pdf.png'}" alt="">
      </a>
      <div class="meta">
        <h3><a href="../${it.path}" target="_blank">${it.title}</a></h3>
        ${it.date ? `<div class="date">${it.date}</div>` : ``}
        <p class="blurb">${fmt(it.blurb)}</p>
      </div>
    </article>`;

  const render = (data) => {
    const items = (data.items || []).map(x => ({ ...x, bucket: normalizeBucket(x.bucket) }));
    const pick = (bucket, cat=null) =>
      items.filter(x => x.bucket === bucket && (cat ? x.category === cat : true)).sort(byDateDesc);

    put(`
      <section>
        <details open>
          <summary>${data.buckets?.["writing"]?.label || "Writing"}</summary>
          <p class="section-blurb">${fmt(data.buckets?.["writing"]?.blurb)}</p>
          <div class="category">
            <details>
              <summary>Academic</summary>
              <p class="category-blurb">${fmt(data.categories?.["academic"])}</p>
              <div class="grid">${pick("writing","academic").map(card).join("")}</div>
            </details>
            <details>
              <summary>Criticism</summary>
              <p class="category-blurb">${fmt(data.categories?.["criticism"])}</p>
              <div class="grid">${pick("writing","criticism").map(card).join("")}</div>
            </details>
            <details>
              <summary>Magic Writing</summary>
              <p class="category-blurb">${fmt(data.categories?.["magic-writing"])}</p>
              <div class="grid">
                ${pick("writing","magic-writing").map(card).join("")}
                <article class="card tier-4">
                  <a class="thumb" href="magic-dojo/">
                    <img src="../assets/thumbs/dojo-logo.png" alt="">
                  </a>
                  <div class="meta">
                    <h3><a href="magic-dojo/">Magic Dojo Archive</a></h3>
                    <p class="blurb">Direct-to-text links in an old-school Dojo index.</p>
                  </div>
                </article>
              </div>
            </details>
          </div>
        </details>
      </section>
      <section>
        <details open>
          <summary>${data.buckets?.["old-movies"]?.label || "Old Movies"}</summary>
          <p class="section-blurb">${fmt(data.buckets?.["old-movies"]?.blurb)}</p>
          <div class="grid">${pick("old-movies").map(card).join("")}</div>
        </details>
      </section>
    `);
  };

  async function loadManifest() {
    // If opened via file://, point to localhost path (requires you to have the server running)
    const isFile = location.protocol === 'file:';
    const url = isFile
      ? 'http://localhost:8000/archive/manifest.json'
      : '/archive/manifest.json';

    try {
      const res = await fetch(url + `?v=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      render(json);
    } catch (e) {
      put(`<p style="opacity:.85">⚠️ Could not load manifest.json from <code>${url}</code>: ${e.message}</p>`);
      put(`<p style="opacity:.85">Tip: start a server from your project root:
        <code>python3 -m http.server 8000</code> and open <code>http://localhost:8000/archive/</code>.</p>`);
      console.error(e);
    }
  }

  loadManifest();
})();