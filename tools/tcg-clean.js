#!/usr/bin/env node
// Clean a saved TCGplayer article into WJC83 mirror format.
// Usage:
//   node tools/tcg-clean.js "imports/Lands and Spells _ TCGplayer.html" \
//     "2019-12-27" "Lands and Spells" \
//     "archive/writing/magic writing/tcgplayer/2019-12-27-lands-and-spells"
//
//   node tools/tcg-clean.js "imports/The End of the Magic_ The Gathering Pro Tour _ TCGplayer.html" \
//     "2020-03-18" "The End of the Magic: The Gathering Pro Tour" \
//     "archive/writing/magic writing/tcgplayer/2020-03-18-end-of-pro-tour"

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom'); // npm i jsdom

function ensureDir(p){ fs.mkdirSync(p, { recursive:true }); }
function fileBase(p){ return path.basename(p).replace(/\.[^.]+$/,''); }

const [,, inFile, isoDate, niceTitle, outBase] = process.argv;
if (!inFile || !isoDate || !niceTitle || !outBase) {
  console.error('Args: <inFile> <YYYY-MM-DD> <Title> <outBaseWithoutExt>');
  process.exit(1);
}

const html = fs.readFileSync(inFile, 'utf8');
const dom = new JSDOM(html);
const d = dom.window.document;

/* ===== 1) Pluck main content =====
   Most TCGplayer articles render inside #content, .article, or main.
   We’ll pick the biggest reasonable block with paragraphs. */
let main =
  d.querySelector('main article') ||
  d.querySelector('#content article') ||
  d.querySelector('.article') ||
  d.querySelector('main') ||
  d.querySelector('#content') ||
  d.body;

// Remove obvious chrome/junk
main.querySelectorAll([
  'script','style','noscript','iframe',
  '.ad','.ads','.advertisement','[id*="ad-"]','[class*="ad-"]',
  'header','footer','nav','.breadcrumbs','.newsletter',
  '.share','.social','.author-bio','.related','.tag-list',
  '.sidebar','.right-rail','.left-rail','.comments'
].join(',')).forEach(n=>n.remove());

// 2) Normalize images → local assets
const assetsDir = path.join(path.dirname(outBase), fileBase(outBase) + '_files');
ensureDir(assetsDir);

// Copy references (from the saved _files dir sitting next to source HTML)
const savedDirGuess = path.join(path.dirname(inFile), fileBase(inFile) + '_files');

// Repoint <img> srcs and copy files if they exist
main.querySelectorAll('img').forEach((img, idx)=>{
  let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
  if (!src) { img.remove(); return; }

  // If it was a relative file in the saved folder, copy it to our assets
  if (!/^https?:/i.test(src)) {
    // Strip any leading directories
    const srcName = path.basename(src.split('?')[0]);
    const from = path.join(savedDirGuess, srcName);
    const to = path.join(assetsDir, srcName);
    try {
      if (fs.existsSync(from) && !fs.existsSync(to)) fs.copyFileSync(from, to);
      img.setAttribute('src', path.relative(path.dirname(outBase), to));
    } catch {}
  } else {
    // leave absolute for now (rare on saved pages); no tracking params
    img.setAttribute('src', src.split('?')[0]);
  }

  // Clean width/height junk
  img.removeAttribute('width');
  img.removeAttribute('height');
  img.style = '';
});

// 3) Convert lone images to <figure> with optional following caption
main.querySelectorAll('img').forEach(img=>{
  if (img.closest('figure')) return;
  const fig = d.createElement('figure');
  img.replaceWith(fig); fig.appendChild(img);

  const next = img.nextElementSibling;
  if (next && next.textContent && next.matches('em, i, small, p')) {
    const cap = d.createElement('figcaption');
    cap.textContent = next.textContent.trim();
    fig.appendChild(cap);
    next.remove();
  }
});

// 4) Produce final HTML shell (scoped CSS like your Medium mirror)
const relAssets = path.relative(path.dirname(outBase), path.join(assetsDir, ''));
const socialImage = (main.querySelector('img')?.getAttribute('src') || '').replace(/^\.\//,'');

const outHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${niceTitle} | WJC83.CA</title>
<link rel="stylesheet" href="/style.css">
<meta name="theme-color" content="#0b0b0c">
<meta property="og:type" content="article">
<meta property="og:site_name" content="WJC83">
<meta property="og:title" content="${niceTitle}">
<meta property="og:url" content="https://wjc83.ca/${outBase.replace(/^\/?/,'')}">
<meta property="og:image" content="https://wjc83.ca/${path.join(path.dirname(outBase), socialImage).replace(/^\/?/,'')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${niceTitle}">
<meta name="twitter:image" content="https://wjc83.ca/${path.join(path.dirname(outBase), socialImage).replace(/^\/?/,'')}">

<style>
.article .wrap{max-width:720px;margin:0 auto 3rem;padding:0 1rem}
.article h1{font-size:clamp(2rem,4.8vw,2.65rem);letter-spacing:.01em;margin:1rem 0 1.25rem}
.article p{font-size:1.08rem;line-height:1.75;margin:1.05rem 0}
.article p+p{margin-top:.85rem}
.article blockquote{margin:1.5rem 0;padding:.1rem 0 .1rem 1rem;border-left:3px solid rgba(0,0,0,.35);font-style:italic;font-size:1.06rem;line-height:1.7;color:rgba(0,0,0,.85)}
.article figure{margin:1.6rem auto;text-align:center}
.article figure img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.08)}
.article figcaption{margin-top:.5rem;font-size:.92rem;opacity:.8}
.article h2,.article h3{margin:1.6rem 0 .6rem;font-weight:700;line-height:1.35}
</style>
</head>
<body class="article">
<header class="site-header">
  <h1 class="site-title">${niceTitle}</h1>
</header>
<main class="wrap">
${main.innerHTML}
<hr>
<p style="opacity:.75;font-size:.95rem">Source: TCGplayer (local mirror). Published ${isoDate}.</p>
</main>

<script>
(function(){
  const root = document.querySelector('main.wrap') || document.body;
  // move sibling text nodes that are captions into figure
  root.querySelectorAll('figure').forEach(fig=>{
    const next = fig.nextElementSibling;
    if(next && !fig.querySelector('figcaption')){
      const tag = (next.tagName||'').toLowerCase();
      const ok = ['p','em','i','small','div','figcaption','span'].includes(tag)
        && !next.querySelector('img') && next.textContent.trim().length;
      if(ok){
        const cap = document.createElement('figcaption');
        cap.textContent = next.textContent.trim();
        fig.appendChild(cap);
        next.remove();
      }
    }
  });
  // unwrap nested figures
  root.querySelectorAll('figure figure').forEach(inner=>{
    const parent = inner.parentElement; while(inner.firstChild) parent.insertBefore(inner.firstChild, inner); inner.remove();
  });
})();
</script>
</body>
</html>`;

// 5) Write out
const outHtmlPath = path.resolve(outBase + '.html');
ensureDir(path.dirname(outHtmlPath));
fs.writeFileSync(outHtmlPath, outHtml, 'utf8');

console.log('✔ Wrote', outHtmlPath);
console.log('  assets →', assetsDir);