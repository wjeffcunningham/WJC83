/**
 * Home page hero image loader (merged behavior).
 * Priority:
 *  1) URL param ?img=FILENAME (exact match in /photos). If that 404s, fallback to random.
 *  2) Otherwise, pick one at random from /photos/photos.json (array of filenames).
 *  3) If anything fails, fallback to /photos/hero.jpg.
 *
 * Caption = raw filename (no path).
 */
(function () {
  const imgEl = document.getElementById('hero');
  const capEl = document.getElementById('heroCaption');
  if (!imgEl || !capEl) return;

  const params = new URLSearchParams(location.search);
  const paramImg = params.get('img'); // e.g., ?img=2025-08-23_bridge.jpg

  function setHero(src) {
    imgEl.src = src;
    capEl.textContent = src.split('/').pop();
  }

  async function getList() {
    const res = await fetch('/photos/photos.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('photos.json missing');
    const list = await res.json();
    if (!Array.isArray(list) || !list.length) throw new Error('empty list');
    return list;
  }

  async function pickRandom() {
    try {
      const list = await getList();
      const i = Math.floor(Math.random() * list.length);
      return '/photos/' + list[i];
    } catch {
      return '/photos/hero.jpg';
    }
  }

  (async () => {
    if (paramImg) {
      const candidate = '/photos/' + paramImg;
      setHero(candidate);
      // If the param file doesn't exist, fallback to random once.
      imgEl.addEventListener('error', async () => {
        const rnd = await pickRandom();
        setHero(rnd);
      }, { once: true });
      return;
    }
    const rnd = await pickRandom();
    setHero(rnd);
  })();
})();