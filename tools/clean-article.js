/**
 * Usage:
 *   node tools/clean-article.js "<inputSavedHtml>" <category> <date:YYYY-MM-DD> <slug>
 *
 * Example:
 *   node tools/clean-article.js "imports/Digital Exile_ How I Got Banned for Life from AirBnB _ by Jackson Cunningham _ Medium.html" criticism 2018-07-18 digital-exile
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');

const [,, inputHtmlPath, category, dateStr, slugArg] = process.argv;
if (!inputHtmlPath || !category || !dateStr || !slugArg) {
  console.error('Usage: node tools/clean-article.js "<inputSavedHtml>" <category> <date:YYYY-MM-DD> <slug>');
  process.exit(1);
}
const slug = slugify(slugArg, { lower: true, strict: true });

const siteRoot       = process.cwd();
const templatePath   = path.join(siteRoot, 'archive', '_templates', 'article.html');
const inputDir       = path.dirname(inputHtmlPath);
const inputBase      = path.basename(inputHtmlPath, '.html');
const savedAssetsDir = path.join(inputDir, inputBase + '_files');

const outHtmlDir   = path.join(siteRoot, 'archive', 'writing', category);
const outHtmlPath  = path.join(outHtmlDir, `${dateStr}-${slug}.html`);
const outAssetsDir = path.join(siteRoot, 'assets', category, slug);

fs.mkdirSync(outHtmlDir, { recursive: true });
fs.mkdirSync(outAssetsDir, { recursive: true });

const read  = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');

/* ---------------- helpers ---------------- */

function cleanUrlParams(u) {
  try {
    const url = new URL(u, 'https://example.com');
    [
      'utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id',
      'mc_cid','mc_eid','ga_source','ga_medium','ga_campaign'
    ].forEach(k => url.searchParams.delete(k));
    return url.pathname + (url.search || '') + (url.hash || '');
  } catch { return u; }
}

function detectSource(document) {
  const host = (document.location && document.location.host) || '';
  const ogSite = document.querySelector('meta[property="og:site_name"]')?.content?.toLowerCase() || '';
  const app    = document.querySelector('meta[name="application-name"]')?.content?.toLowerCase() || '';
  const title  = (document.querySelector('title')?.textContent || '').toLowerCase();

  const str = [host, ogSite, app, title].join(' | ');
  if (/medium\.com|medium/i.test(str)) return 'medium';
  if (/starcitygames|star city/i.test(str)) return 'starcity';
  if (/t[cg]gplayer|tcgplayer/i.test(str)) return 'tcgplayer';
  return 'generic';
}

function pickArticleNode(document) {
  const candidates = [
    'article',
    '[data-test-id="post-content"]',
    'main article',
    'main',
    '#root article',
    '#rendered-content',
    '[role="main"] article',
    '.content article',
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 100) return el;
  }
  // Fallback: heaviest text block
  let best = null;
  [...document.querySelectorAll('article, main, #content, .content, .container, div')]
    .forEach(el => {
      const len = (el.textContent || '').trim().length;
      if (!best || len > best.len) best = { el, len };
    });
  return best ? best.el : document.body;
}

function normalizeInline(document, el) {
  // b/i → strong/em
  el.querySelectorAll('b').forEach(n => { const s = document.createElement('strong'); s.innerHTML = n.innerHTML; n.replaceWith(s); });
  el.querySelectorAll('i').forEach(n => { const e = document.createElement('em');    e.innerHTML = n.innerHTML; n.replaceWith(e); });

  // images: drop width/height/srcset, clean query junk
  el.querySelectorAll('img').forEach(img => {
    img.removeAttribute('width'); img.removeAttribute('height'); img.removeAttribute('srcset');
    const src = img.getAttribute('src'); if (src) img.setAttribute('src', cleanUrlParams(src));
  });

  // links: strip trackers, open new tab
  el.querySelectorAll('a[href]').forEach(a => {
    a.setAttribute('href', cleanUrlParams(a.getAttribute('href')));
    a.setAttribute('target','_blank'); a.setAttribute('rel','noopener');
  });

  // generic junk
  el.querySelectorAll('script, iframe, noscript, style').forEach(n => n.remove());
}

/** Remove site-specific cruft but keep core content. */
function removeCruft(document, rootEl, source) {
  // Common wrappers/ads/related across sites
  rootEl.querySelectorAll([
    '.related', '.recommendations', '.newsletter', '.newsletter-signup',
    '.ad', '.ads', '.advert', '.advertisement', '[class*="ad-"]',
    '#sidebar', '#secondary', '.sidebar', '.breadcrumbs',
    '.share', '.social', '.social-share', '.article-share',
    '.promo', '.sticky', '.cookie', '.consent'
  ].join(',')).forEach(n => n.remove());

  // Medium
  if (source === 'medium') {
    rootEl.querySelectorAll([
      'aside',
      'footer',
      '[data-test-id="related"]',
      '[data-test-id="subscribe"]',
      'header + div' // top social strip sometimes saved
    ].join(',')).forEach(n => n.remove());
  }

  // StarCityGames: keep article, decklists; drop sidebars/market cruft
  if (source === 'starcity') {
    rootEl.querySelectorAll([
      '.article-sidebar', '.article-actions', '.article-meta .share',
      '.marketplace-cta', '.scg-shop', '.related-articles',
      '.author-social', '.author-follow'
    ].join(',')).forEach(n => n.remove());
    // do NOT remove decklists
  }

  // TCGplayer
  if (source === 'tcgplayer') {
    rootEl.querySelectorAll([
      '.card-marketplace', '.marketplace-cta', '.related-articles',
      '.author-social', '.author-follow', '.article-actions'
    ].join(',')).forEach(n => n.remove());
  }

  // Text-based interstitials (keep to text nodes only; don't remove containers)
  rootEl.querySelectorAll('p, span, div').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;

    // Medium/Generic junk
    if (/^follow$/i.test(t)) el.remove();
    if (/^listen$/i.test(t)) el.remove();
    if (/^share$/i.test(t)) el.remove();
    if (/subscribe|stories in your inbox/i.test(t)) el.remove();
    if (/press enter|click to view image/i.test(t)) el.remove();
    if (/highlighted/i.test(t)) el.remove();

    // orphaned counters (numbers or numbers with K/M)
    if (/^\d+(\.\d+)?[kKmM]?$/.test(t)) el.remove();
  });
}

function rewriteAndCopyAssets(rootEl) {
  const replaced = new Map();

  function relink(attr, el) {
    const val = el.getAttribute(attr);
    if (!val || /^https?:\/\//i.test(val) || val.startsWith('data:')) return;

    // Try resolve to actual saved file
    let sourcePath = val;
    const asInputRel = path.join(path.dirname(inputHtmlPath), sourcePath);
    const asFilesRel = path.join(savedAssetsDir, path.basename(sourcePath));

    if (fs.existsSync(asInputRel)) sourcePath = asInputRel;
    else if (fs.existsSync(asFilesRel)) sourcePath = asFilesRel;
    else return;

    const baseName = path.basename(sourcePath).replace(/[#?].*$/, '');
    const destPath = path.join(outAssetsDir, baseName);

    if (!replaced.has(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      replaced.set(sourcePath, baseName);
    }
    const relFromHtml = path.relative(path.dirname(outHtmlPath), destPath).split(path.sep).join('/');
    el.setAttribute(attr, relFromHtml);
  }

  rootEl.querySelectorAll('img[src]').forEach(el => relink('src', el));
  rootEl.querySelectorAll('link[rel="stylesheet"][href]').forEach(el => relink('href', el));
}

/* ---------------- run ---------------- */

const raw = read(inputHtmlPath);
const dom = new JSDOM(raw);
const { document } = dom.window;

const source     = detectSource(document);
let   title      = (document.querySelector('title')?.textContent || '').trim() || slug.replace(/-/g, ' ');

// Extract → normalize → remove cruft
let articleNode = pickArticleNode(document).cloneNode(true);
normalizeInline(document, articleNode);
removeCruft(document, articleNode, source);

// Safety fallback: if too little remains, re-extract without cruft removal
const hasUseful =
  (articleNode.textContent || '').trim().length >= 200 ||
  articleNode.querySelectorAll('img, p, h2, h3, h4, blockquote, pre, figure, table, li').length >= 3;

if (!hasUseful) {
  const fresh = pickArticleNode(document).cloneNode(true);
  normalizeInline(document, fresh);
  articleNode = fresh;
}

// Assets → copy & rewrite paths
rewriteAndCopyAssets(articleNode);

// Sanitize to safe minimal HTML (but allow lists/tables/decklists)
const cleaned = sanitizeHtml(articleNode.innerHTML, {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img','figure','figcaption',
    'h2','h3','h4',
    'pre','code','blockquote',
    'ul','ol','li',
    'table','thead','tbody','tr','th','td'
  ]),
  allowedAttributes: {
    a:   ['href','name','target','rel'],
    img: ['src','alt','title'],
    '*': ['id','class']
  },
  allowedSchemes: ['http','https','data','mailto']
});

// Inject into your site template
const template   = read(templatePath);
const sourceHost = (new URL(document.location?.href || 'https://example.com')).host || 'Original Source';
const outHtml    = template
  .replaceAll('{{TITLE}}',  title)
  .replaceAll('{{SOURCE}}', sourceHost)
  .replace('{{BODY}}',      cleaned);

write(outHtmlPath, outHtml);

console.log('✓ Source detected:', source);
console.log('✓ Clean HTML written:', path.relative(siteRoot, outHtmlPath));
console.log('✓ Assets copied to  :', path.relative(siteRoot, outAssetsDir));