#!/usr/bin/env node
/**
 * Medium HTML -> Clean local mirror (IJPAUC-style)
 * Usage:
 *   node tools/medium-clean.js \
 *     "imports/WJC83/Digital Exile__..._Medium.html" \
 *     criticism 2018-07-18 digital-exile
 *
 * Output:
 *   archive/writing/criticism/2018-07-18-digital-exile.html
 *   archive/writing/criticism/2018-07-18-digital-exile_files/* (assets copied)
 */
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');

function fatal(msg){ console.error(msg); process.exit(1); }

const [,, SRC_HTML, CATEGORY='criticism', DATE='YYYY-MM-DD', SLUG='article'] = process.argv;
if(!SRC_HTML) fatal('Give path to the exported Medium HTML as arg 1.');

const ROOT = process.cwd();
const OUT_DIR  = path.join(ROOT, 'archive', 'writing', CATEGORY);
const BASENAME = `${DATE}-${SLUG}`;
const OUT_HTML = path.join(OUT_DIR, `${BASENAME}.html`);
const OUT_FILES_DIR = path.join(OUT_DIR, `${BASENAME}_files`);

(async()=>{
  await fse.ensureDir(OUT_DIR);

  const srcHtmlPath = path.resolve(SRC_HTML);
  const srcHtml = await fse.readFile(srcHtmlPath, 'utf8');

  const $ = cheerio.load(srcHtml, { decodeEntities: false });

  /* ============ 1) locate article + title/desc ============ */
  const $title = $('meta[property="og:title"]').attr('content')
              || $('title').text()
              || $('h1').first().text()
              || 'Untitled';

  const $desc  = $('meta[property="og:description"]').attr('content')
              || $('meta[name="description"]').attr('content')
              || '';

  // Try <article>, else main content heuristics
  let $article = $('article').first();
  if(!$article.length){
    $article = $('[data-field="body"]').first();
  }
  if(!$article.length){
    // Fallback: use body but exclude header/footer/nav
    $article = $('body').clone();
    $article.find('header, footer, nav').remove();
  }

  /* ============ 2) strip junk ============ */
  $article.find('script, style, noscript, iframe, svg').remove();
  // Clean attributes broadly
  $article.find('*').each((_, el)=>{
    const attribs = el.attribs || {};
    for(const k of Object.keys(attribs)){
      if (['href','src','alt','title'].includes(k)) continue;
      // keep start/end list semantics
      if (el.tagName === 'ol' && k === 'start') continue;
      if (k.startsWith('aria-')) continue;
      // drop everything else (class, id, style, data-*, etc.)
      delete el.attribs[k];
    }
  });

  /* ============ 3) normalize figures/captions ============ */
  // Medium often wraps images in <figure> with figcaption-like divs/spans
  // Ensure proper <figure><img><figcaption>
  $article.find('img').each((_, img)=>{
    const $img = $(img);
    const $parent = $img.parent();

    // If not already inside <figure>, wrap it
    if ($parent.prop('tagName')?.toLowerCase() !== 'figure') {
      const $fig = $('<figure></figure>');
      $img.replaceWith($fig);
      $fig.append($img);
    }
  });

  // Convert any sibling caption-like elements to <figcaption>
  $article.find('figure').each((_, fig)=>{
    const $fig = $(fig);
    // look for a next sibling text node or <p>/<em>/<span> as caption
    let $cap = $fig.find('figcaption').first();
    if (!$cap.length) {
      const $cand = $fig.next();
      if ($cand && ['p','em','span','div'].includes(($cand.prop('tagName')||'').toLowerCase())
          && $cand.text().trim().length && $cand.find('img').length===0) {
        $cap = $('<figcaption></figcaption>').text($cand.text().trim());
        $cand.remove();
        $fig.append($cap);
      }
    }
  });

  /* ============ 4) copy assets dir and rewrite <img src> ============ */
  // Find the *_files folder next to the exported HTML
  const srcDir = path.dirname(srcHtmlPath);
  const candidates = (await fse.readdir(srcDir)).filter(n => n.endsWith('_files'));
  let srcFilesDir = '';
  if (candidates.length === 1) {
    srcFilesDir = path.join(srcDir, candidates[0]);
  } else {
    // Try guess from <img src>
    const anyImg = $('img').first().attr('src') || '';
    const guessFolder = anyImg.split('/').slice(0,-1).join('/');
    if (guessFolder.endsWith('_files')) srcFilesDir = path.join(srcDir, guessFolder);
  }

  if (srcFilesDir && fs.existsSync(srcFilesDir)) {
    await fse.remove(OUT_FILES_DIR); // fresh copy
    await fse.copy(srcFilesDir, OUT_FILES_DIR);
  }

  // Rewrite img src to point to local sibling _files (if matching the imported folder)
  $('img').each((_, el)=>{
    const $img = $(el);
    let src = ($img.attr('src')||'').trim();
    if(!src) return;

    // if the src includes an *_files/ path, rewrite to our new local folder name
    const parts = src.split('/');
    const idx = parts.findIndex(p => p.endsWith('_files'));
    if (idx >= 0) {
      const rest = parts.slice(idx+1).join('/');
      $img.attr('src', `${BASENAME}_files/${rest}`);
    }
    // Ensure alt exists
    if (!$img.attr('alt')) $img.attr('alt','');
  });

  /* ============ 5) first image for OG ============ */
  const firstImgSrc = $('img').first().attr('src') || '';
  const ogImageAbs = firstImgSrc.startsWith('http')
    ? firstImgSrc
    : (firstImgSrc ? `https://wjc83.ca/archive/writing/${CATEGORY}/${firstImgSrc}` : '');

  /* ============ 6) build clean body HTML ============ */
  // Pull out h1 if present to become the page <h1>
  let h1 = ($('h1').first().text() || $title || '').trim();
  if (!h1) { h1 = $title; }
  // Remove duplicate top-level H1s in body
  $article.find('h1').first().remove();

  // Keep only semantic core tags (hard prune of weird wrappers)
  const ALLOWED = new Set(['p','figure','img','figcaption','h2','h3','h4','ul','ol','li','blockquote','hr','a','em','strong','code','pre','br']);
  $article.find('*').each((_, el)=>{
    const t = (el.tagName||'').toLowerCase();
    if (!ALLOWED.has(t) && t !== 'body' && t !== 'article' && t !== 'figure') {
      // unwrap unknown tag but keep its children
      $(el).replaceWith($(el).contents());
    }
  });

  const bodyHtml = $article.html() || '';

  /* ============ 7) page template (IJPAUC-style) ============ */
  const DESC = $desc || 'Local mirror with original images.';
  const PAGE_TITLE = `${h1} | WJC83.CA`;
  const CANON = 'https://jacksoncunningham.medium.com/digital-exile-how-i-got-banned-for-life-from-airbnb-615434c6eeba';

  const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(PAGE_TITLE)}</title>
<link rel="stylesheet" href="/style.css">
<link rel="canonical" href="${CANON}">
<meta name="description" content="${escapeHtml(DESC)}">
<meta name="theme-color" content="#0b0b0c">
<meta property="og:type" content="article">
<meta property="og:site_name" content="WJC83">
<meta property="og:url" content="https://wjc83.ca/archive/writing/${CATEGORY}/${BASENAME}.html">
<meta property="og:title" content="${escapeHtml(h1)}">
<meta property="og:description" content="${escapeHtml(DESC)}">
${ogImageAbs ? `<meta property="og:image" content="${ogImageAbs}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(h1)}">
<meta name="twitter:description" content="${escapeHtml(DESC)}">
${ogImageAbs ? `<meta name="twitter:image" content="${ogImageAbs}">` : ''}
</head>
<body>
  <header class="site-header">
    <h1 class="site-title" style="margin:12px 0 14px;line-height:1">${escapeHtml(h1)}</h1>
  </header>
  <main class="wrap" style="max-width:760px">
    ${bodyHtml}
    <hr>
    <p style="opacity:.75;font-size:.95rem">Source: Medium (local mirror). Published ${DATE}.</p>
  </main>
</body>
</html>`;

  await fse.writeFile(OUT_HTML, doc, 'utf8');

  console.log('✔ Wrote:', path.relative(ROOT, OUT_HTML));
  if (fs.existsSync(OUT_FILES_DIR)) {
    console.log('✔ Assets:', path.relative(ROOT, OUT_FILES_DIR));
  } else {
    console.log('ℹ No local assets folder detected next to the export. If images are remote, you can leave them or download & place them in:', path.relative(ROOT, OUT_FILES_DIR));
  }
})().catch(err=>{ console.error(err); process.exit(1); });

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }