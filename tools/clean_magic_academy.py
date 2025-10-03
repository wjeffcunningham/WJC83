#!/usr/bin/env python3
import re, json, hashlib, shutil, os, sys
from pathlib import Path
from bs4 import BeautifulSoup

# --- config ---
IMPORTS_DIR = Path("imports")  # where your downloaded html + *_files live
ROOT = Path("archive/writing/magic/magic-academy")  # target root
ASSETS = ROOT / "assets" / "articles"
ARTICLES = ROOT / "articles"
PDFDIR = ROOT / "pdf"
MANIFEST = ROOT / "manifest.json"

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{title} — Magic Academy | WJC83</title>
  <link rel="stylesheet" href="../../../../../style.css"/>
  <style>
    .wrap{{max-width:760px;margin:1.25rem auto 3rem;padding:0 1rem}}
    header h1{{margin:.25rem 0 .9rem;font-weight:800;letter-spacing:.01em}}
    .byline{{opacity:.75;font-size:.95rem;margin-top:.25rem}}
    article p{{margin:.9rem 0;line-height:1.65}}
    figure{{margin:1rem 0}}
    figcaption{{margin-top:.4rem;font-size:.92rem;opacity:.75}}
    img{{max-width:100%;height:auto}}
    .crumbs{{margin-bottom:.75rem}}
  </style>
</head>
<body>
  <div class="wrap">
    <nav class="crumbs"><a href="../..">← Magic Academy</a></nav>
    <header>
      <h1>{title}</h1>
      <div class="byline">Jeff Cunningham • Magic Academy (WotC)</div>
    </header>
    <article class="article">
{content}
    </article>
    <footer class="byline" style="margin-top:2rem">
      {pdf_link}
    </footer>
  </div>
</body>
</html>
"""

def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[’'“”]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "untitled"

def find_body_html(html_text: str) -> str:
    soup = BeautifulSoup(html_text, "html.parser")
    # prefer main/article, fallback to body
    node = soup.find(["main","article"]) or soup.body or soup
    # strip script/style
    for tag in node.find_all(["script","style"]):
        tag.decompose()
    # drop inline widths/heights on images for responsiveness
    for img in node.find_all("img"):
        for attr in ["width","height","style","border"]:
            if img.has_attr(attr): del img[attr]
    # minimal clean: unwrap <font>, <span style>, etc.
    for font in node.find_all("font"):
        font.unwrap()
    return node.decode_contents()

def guess_pdf_for_title(title: str) -> str|None:
    if not PDFDIR.exists(): return None
    candidates = []
    base = title.replace(":", "").replace("?", "").replace("–","-")
    # try exact, then loose match
    for p in PDFDIR.glob("*.pdf"):
        if p.name.lower().startswith(base.lower()):
            candidates.append(p)
    if not candidates:
        lo = re.sub(r"[^a-z0-9]", "", base.lower())
        for p in PDFDIR.glob("*.pdf"):
            pn = re.sub(r"[^a-z0-9]", "", p.stem.lower())
            if lo and lo[:10] in pn:
                candidates.append(p)
    return candidates[0].name if candidates else None

def rewrite_paths(html: str, src_prefix: str, slug: str) -> str:
    # src_prefix like "Card Evaluation_files/"
    # Replace occurrences with relative path from articles/<slug>/index.html
    new_prefix = "../../assets/articles/{}/".format(slug)
    # handle url("...") and attributes
    html = re.sub(r'(["\'(])'+re.escape(src_prefix), r'\1'+new_prefix, html)
    return html

def ensure_dirs():
    for d in [ASSETS, ARTICLES]:
        d.mkdir(parents=True, exist_ok=True)

def load_manifest():
    if MANIFEST.exists():
        try:
            return json.loads(MANIFEST.read_text())
        except Exception:
            print(f"WARNING: could not parse existing manifest: {MANIFEST}", file=sys.stderr)
    return {"collection":"Magic Academy","items":[]}

def upsert_manifest(man, item):
    items = man.get("items", [])
    # match by slug or title
    idx = None
    for i, it in enumerate(items):
        if it.get("slug")==item["slug"] or it.get("title")==item["title"]:
            idx = i; break
    if idx is None:
        items.append(item)
    else:
        items[idx].update(item)
    man["items"] = items
    return man

def main():
    ensure_dirs()
    man = load_manifest()

    if not IMPORTS_DIR.exists():
        print(f"ERROR: imports folder not found: {IMPORTS_DIR}", file=sys.stderr)
        sys.exit(1)

    html_files = sorted(IMPORTS_DIR.glob("*.html"))
    if not html_files:
        print("No HTML files found in imports/", file=sys.stderr)
        sys.exit(0)

    for src in html_files:
        stem = src.stem  # e.g., "Card Evaluation"
        assets_dir = IMPORTS_DIR / f"{stem}_files"
        raw_html = src.read_text(errors="ignore")
        soup = BeautifulSoup(raw_html, "html.parser")
        title = (soup.title.string if soup.title and soup.title.string else stem).strip()
        slug = slugify(title)

        # 1) move/copy assets (article-specific)
        target_assets = ASSETS / slug
        target_assets.mkdir(parents=True, exist_ok=True)
        if assets_dir.exists():
            # copy tree (overwrites on rerun)
            if any(target_assets.iterdir()):
                pass
            shutil.rmtree(target_assets, ignore_errors=True)
            shutil.copytree(assets_dir, target_assets)

        # 2) extract cleaned content & rewrite paths
        content = find_body_html(raw_html)
        if assets_dir.exists():
            content = rewrite_paths(content, f"{stem}_files/", slug)

        # 3) write cleaned HTML
        pdf_name = guess_pdf_for_title(title)
        pdf_link = f'<a href="../../pdf/{pdf_name}" target="_blank" rel="noopener">PDF</a>' if pdf_name else ""
        outdir = ARTICLES / slug
        outdir.mkdir(parents=True, exist_ok=True)
        (outdir / "index.html").write_text(
            TEMPLATE.format(title=title, content=content, pdf_link=pdf_link),
            encoding="utf-8"
        )

        # 4) manifest entry
        manifest_item = {
            "slug": slug,
            "title": title,
            "source": "WotC (Magic Academy)",
            "html": f"./articles/{slug}/"
        }
        if pdf_name:
            manifest_item["pdf"] = f"./pdf/{pdf_name}"
        man = upsert_manifest(man, manifest_item)

        print(f"✔ Cleaned: {title}  →  articles/{slug}/index.html")

    MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False))
    print(f"\nUpdated manifest: {MANIFEST}")

if __name__ == "__main__":
    main()