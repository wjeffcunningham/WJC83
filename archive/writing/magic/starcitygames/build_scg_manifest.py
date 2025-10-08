#!/usr/bin/env python3
import argparse, json, re, unicodedata
from pathlib import Path
from datetime import datetime

DEF_SCHEMA_VERSION = "1.1"

SKIP_DIR_NAMES = {
  "assets","asset","static","media","image","images","img",
  "css","js","scripts","_files","files","index_files","fonts"
}
SKIP_FILE_STEMS = {"ads","ad","advert","pixel","beacon","default","tracker"}
HTML_OK_NAME_HINTS = {"star city games","starcitygames","- star city games"}

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode("ascii")
    s = re.sub(r"[^\w\s-]", "", s).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return s

def read_html_title(path: Path) -> str | None:
    try:
        txt = path.read_text("utf-8", errors="ignore")
    except Exception:
        return None
    m = re.search(r"<title[^>]*>(.*?)</title>", txt, flags=re.I|re.S)
    if not m: 
        return None
    t = re.sub(r"\s+", " ", m.group(1)).strip()
    t = re.sub(r"\s*[-–—]\s*Star\s*City\s*Games.*$", "", t, flags=re.I)
    return t or None

def prettify_title(stem: str):
    t = re.sub(r"[_\-]+", " ", stem).strip()
    t = re.sub(r"\bscg\b", "SCG", t, flags=re.I)
    t = re.sub(r"\bmtg\b", "MTG", t, flags=re.I)
    t = re.sub(r"\s+", " ", t)
    words = t.split(" ")
    small = {"a","an","and","of","the","to","in","on","for","with"}
    if words:
        words = [w.capitalize() if i==0 or w.lower() not in small else w.lower()
                 for i,w in enumerate(words)]
    return " ".join(words)

def guess_date_from_name(name: str):
    pats = [
        r"(?P<y>20\d{2}|19\d{2})[-_\.](?P<m>\d{1,2})[-_\.](?P<d>\d{1,2})",
        r"(?P<m>\d{1,2})[-_\.](?P<d>\d{1,2})[-_\.](?P<y>20\d{2}|19\d{2})",
        r"(?P<y>20\d{2}|19\d{2})(?P<m>\d{2})(?P<d>\d{2})",
    ]
    for p in pats:
        m = re.search(p, name)
        if m:
            y,mn,d = int(m.group("y")), int(m.group("m")), int(m.group("d"))
            try: return datetime(y,mn,d).strftime("%Y-%m-%d")
            except ValueError: pass
    return None

def guess_series_and_part(title: str):
    m = re.search(r"(?:^|\b)(?:part|pt\.?)\s*(\d+)\b", title, flags=re.I)
    part = int(m.group(1)) if m else None
    series = None
    if m:
        series = title[:m.start()].strip(" -–—:()")
        series = re.sub(r"\s+[-–—:]+$", "", series).strip()
    return series or None, part

def detect_tier(title: str):
    t = title.lower()
    if any(k in t for k in [
        "interview with richard garfield",
        "untold legends",
        "get big or die trying",
        "lands and spells",
        "end of the magic pro tour"
    ]): return "tier-2"
    return "tier-3"

def force_featured(title: str):
    t = title.lower()
    return "interview with richard garfield" in t or "god of magic" in t

def html_is_article(path: Path, root: Path) -> bool:
    if path.parent == root:
        return True
    stem = path.stem.lower()
    name = path.name.lower()
    if stem in SKIP_FILE_STEMS:
        return False
    if any(h in name for h in HTML_OK_NAME_HINTS):
        return True
    parts = {p.lower() for p in path.relative_to(root).parts[:-1]}
    if parts & SKIP_DIR_NAMES:
        return False
    return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Folder to scan")
    ap.add_argument("--author", default="Jeff Cunningham")
    ap.add_argument("--source", default="StarCityGames")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    items, seen_slugs = [], set()

    for p in root.rglob("*"):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        if ext == ".pdf":
            fmt = "pdf"
        elif ext in (".html", ".htm"):
            if not html_is_article(p, root):
                continue
            fmt = "html"
        else:
            continue

        rel = p.relative_to(root)
        title = None
        if fmt == "html":
            title = read_html_title(p)
        if not title:
            title = prettify_title(p.stem)

        date = guess_date_from_name(p.name) or guess_date_from_name(str(p.parent))
        series, part = guess_series_and_part(title)
        tier = detect_tier(title)
        featured = force_featured(title)  # Garfield interview → featured

        slug = slugify(title)
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        items.append({
            "title": title,
            "date": date,
            "author": args.author,
            "source": args.source,
            "format": fmt,
            "path": str(rel).replace("\\","/"),
            "slug": slug,
            "series": series,
            "part": part,
            "tier": tier,          # kept for internal use (not shown)
            "featured": featured,  # only Garfield is forced true
            "tags": ["Magic","SCG"],
            "blurb": ""
        })

    def sort_key(x):
        try: dt = datetime.strptime(x["date"], "%Y-%m-%d")
        except: dt = datetime.min
        return (not x["featured"], dt, x["title"].lower())

    items.sort(key=sort_key, reverse=True)

    manifest = {
        "schema_version": DEF_SCHEMA_VERSION,
        "bucket": "magic-writing",
        "label": "Star City Games Archive",
        "blurb": "Jeff’s Star City Games articles (PDF & HTML mirrors).",
        "items": items
    }

    out = root / "manifest.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {out} with {len(items)} items.")

if __name__ == "__main__":
    main()