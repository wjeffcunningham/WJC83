class SiteInclude extends HTMLElement {
  static get observedAttributes() { return ['src']; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }

  async connectedCallback() { this.load(); }
  attributeChangedCallback() { this.load(); }

  async load() {
    const src = this.getAttribute('src');
    if (!src) return;
    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch ${src}`);
      const html = await res.text();

      // Adopt page styles inside shadow root
      const styleLinks = [...document.querySelectorAll('link[rel="stylesheet"]')]
        .map(l => `<link rel="stylesheet" href="${l.getAttribute('href')}">`)
        .join('');

      this.shadowRoot.innerHTML = `${styleLinks}${html}`;

      // Mark active nav link (based on path)
      const path = location.pathname.replace(/index\.html$/, '');
      this.shadowRoot.querySelectorAll('nav a, .site-footer a').forEach(a => {
        try {
          const aUrl = new URL(a.getAttribute('href'), location.origin);
          const aPath = aUrl.pathname.replace(/index\.html$/, '');
          if (aPath === path) a.classList.add('active');
        } catch {}
      });
    } catch (err) {
      console.error(err);
      this.shadowRoot.innerHTML = `<div style="color:#f88">Include failed: ${src}</div>`;
    }
  }
}

// <site-include src="/components/header.html"></site-include>
customElements.define('site-include', SiteInclude);

// Convenience tags:
class SiteHeader extends SiteInclude {
  constructor(){ super(); this.setAttribute('src', this.getAttribute('src') || '/components/header.html'); }
}
class SiteFooter extends SiteInclude {
  constructor(){ super(); this.setAttribute('src', this.getAttribute('src') || '/components/footer.html'); }
}
customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);