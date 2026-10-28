// Progressive enhancement only: no navigation or reading depends on storage.
export const progress = String.raw`
(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const article = document.querySelector('main article');
    let chapters;
    try { chapters = JSON.parse(body.dataset.readerChapters); } catch { return; }
    const key = 'book-reader-progress:' + body.dataset.readerBook;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(key)); } catch {}
    const valid = saved && chapters.includes(saved.chapter) &&
      Number.isFinite(saved.y) && saved.y >= 0 &&
      Number.isInteger(saved.block) && saved.block >= -1 &&
      Number.isFinite(saved.offset) && saved.offset >= 0 && saved.offset <= 1;
    const resume = document.getElementById('resume-reading');
    if (resume && valid) {
      resume.href = saved.chapter;
      resume.hidden = false;
    }
    if (!article) return;
    const blocks = Array.from(article.children);
    let ready = false;
    let timer;
    function save() {
      if (!ready) return;
      let block = -1, offset = 0;
      for (let i = 0; i < blocks.length; i++) {
        const rect = blocks[i].getBoundingClientRect();
        if (rect.bottom > 0) {
          block = i;
          offset = rect.height ? Math.max(0, Math.min(1, -rect.top / rect.height)) : 0;
          break;
        }
      }
      // Keep the top of a chapter at the top, including its header.
      if (scrollY === 0) block = -1;
      try {
        localStorage.setItem(key, JSON.stringify({
          chapter: location.pathname, block, offset, y: scrollY
        }));
      } catch {}
    }
    function restore() {
      if (valid && saved.chapter === location.pathname && !location.hash) {
        const element = blocks[saved.block];
        const y = element ? scrollY + element.getBoundingClientRect().top +
          element.getBoundingClientRect().height * saved.offset : saved.y;
        window.scrollTo(0, y);
      }
      ready = true;
      save();
    }
    // Wait for images and preference-driven layout before restoring position.
    if (!location.hash) history.scrollRestoration = 'manual';
    const afterFonts = () => {
      if (document.fonts) document.fonts.ready.then(restore);
      else restore();
    };
    if (document.readyState === 'complete') afterFonts();
    else window.addEventListener('load', afterFonts, { once: true });
    window.addEventListener('scroll', () => {
      if (!ready || timer) return;
      timer = setTimeout(() => { timer = undefined; save(); }, 200);
    }, { passive: true });
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') save();
    });
  });
})();
`;
