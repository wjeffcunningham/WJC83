#!/usr/bin/env node
/**
 * Usage:
 *   node tools/clean-article.js "<inputSavedHtml>" <category> <date:YYYY-MM-DD> <slug>
 *
 * Example:
 *   node tools/clean-article.js "imports/The End of the Magic_ The Gathering Pro Tour _ TCGplayer.html" magic-writing 2020-03-18 end-of-pro-tour
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const slugify = require('slugify');

/* ------------ args & paths ------------ */
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

const outHtmlDir   = path.join(siteRoot, 'archive', 'writing', category, `${dateStr}-${slug}`);
const outHtmlPath  = path.join(outHtmlDir, 'index.html');
const outAssetsDir = path.join(siteRoot, 'assets', category, slug);

fs.mkdirSync(outHtmlDir, { recursive: true });
fs.mkdirSync(outAssetsDir, { recursive: true });

const read  = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');

/* ------------ helpers ------------ */
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
  const host   = (document.location && document.location.host) || '';
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
    '.content article'
  ];
  for (const sel of candidates) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 100) return el;
  }
  // Fallback: largest text block
  let best = null;
  [...document.querySelectorAll('article, main, #content, .content, .container, div')].forEach(el => {
    const len = (el.textContent || '').trim().length;
    if (!best || len > best.len) best = { el, len };
  });
  return best ? best.el : document.body;
}

function normalizeInline(document, el) {
  el.querySelectorAll('b').forEach(n => { const s = document.createElement('strong'); s.innerHTML = n.innerHTML; n.replaceWith(s); });
  el.querySelectorAll('i').forEach(n => { const e = document.createElement('em');    e.innerHTML = n.innerHTML; n.replaceWith(e); });

  el.querySelectorAll('img').forEach(img => {
    img.removeAttribute('width'); img.removeAttribute('height'); img.removeAttribute('srcset');
    const src = img.getAttribute('src'); if (src) img.setAttribute('src', cleanUrlParams(src));
  });

  el.querySelectorAll('a[href]').forEach(a => {
    a.setAttribute('href', cleanUrlParams(a.getAttribute('href')));
    a.setAttribute('target','_blank'); a.setAttribute('rel','noopener');
  });

  el.querySelectorAll('script, iframe, noscript, style').forEach(n => n.remove());
}

function removeCruft(document, rootEl, source) {
  // Generic junk
  rootEl.querySelectorAll([
    '.related', '.recommendations', '.newsletter', '.newsletter-signup',
    '.ad', '.ads', '.advert', '.advertisement', '[class*="ad-"]',
    '#sidebar', '#secondary', '.sidebar', '.breadcrumbs',
    '.share', '.social', '.social-share', '.article-share',
    '.promo', '.sticky', '.cookie', '.consent'
  ].join(',')).forEach(n => n.remove());

  if (source === 'medium') {
    rootEl.querySelectorAll([
      'aside',
      'footer',
      '[data-test-id="related"]',
      '[data-test-id="subscribe"]',
      'header + div'
    ].join(',')).forEach(n => n.remove());
  }

  if (source === 'starcity') {
    rootEl.querySelectorAll([
      '.article-sidebar', '.article-actions', '.article-meta .share',
      '.marketplace-cta', '.scg-shop', '.related-articles',
      '.author-social', '.author-follow'
    ].join(',')).forEach(n => n.remove());
  }

  if (source === 'tcgplayer') {
    rootEl.querySelectorAll([
      '.card-marketplace', '.marketplace-cta', '.related-articles',
      '.author-social', '.author-follow', '.article-actions'
    ].join(',')).forEach(n => n.remove());
  }

  // Text-based cruft
  rootEl.querySelectorAll('p, div, span').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;
    if (/^follow$/i.test(t)) el.remove();
    if (/^listen$/i.test(t)) el.remove();
    if (/^share$/i.test(t)) el.remove();
    if (/subscribe|stories in your inbox/i.test(t)) el.remove();
    if (/press enter|click to view image/i.test(t)) el.remove();
    if (/highlighted/i.test(t)) el.remove();
    if (/^\d+(\.\d+)?[kKmM]?$/.test(t)) el.remove(); // orphaned counts like 310K
  });
}

function rewriteAndCopyAssets(rootEl) {
  const replaced = new Map();
  function relink(attr, el) {
    const val = el.getAttribute(attr);
    if (!val || /^https?:\/\//i.test(val) || val.startsWith('data:')) return;

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

/* ------------ run ------------ */
const raw = read(inputHtmlPath);
const dom = new JSDOM(raw);
const { document } = dom.window;

const source = detectSource(document);
let title = (document.querySelector('title')?.textContent || '').trim();
if (!title) title = slug.replace(/-/g, ' ');

let articleNode = pickArticleNode(document).cloneNode(true);
normalizeInline(document, articleNode);
removeCruft(document, articleNode, source);

// Fallback if we accidentally nuked too much
const hasUseful =
  (articleNode.textContent || '').trim().length >= 200 ||
  articleNode.querySelectorAll('img, p, h2, h3, h4, blockquote, pre, figure, table, li').length >= 3;
if (!hasUseful) {
  const fresh = pickArticleNode(document).cloneNode(true);
  normalizeInline(document, fresh);
  articleNode = fresh;
}

// Copy assets & rewrite paths
rewriteAndCopyAssets(articleNode);

// Sanitize
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

// Template → out
const template = read(templatePath);
const outHtml = template
  .replaceAll('{{TITLE}}',  title)
  .replaceAll('{{SOURCE}}', (document.location && document.location.host) || 'Original Source')
  .replace('{{BODY}}',      cleaned);

write(outHtmlPath, outHtml);

console.log('✓ Source detected:', source);
console.log('✓ Wrote:', path.relative(siteRoot, outHtmlPath));
console.log('✓ Assets →', path.relative(siteRoot, outAssetsDir));