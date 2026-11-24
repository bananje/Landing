// Clipped line-by-line text reveal. Each [data-rv] element is measured word by
// word, rebuilt as visual lines wrapped in overflow:hidden masks, then revealed
// with a bottom-to-top rise (CSS: .rm / .rm-i in styles.css).
// Triggers: data-rv="load" (hero sequence) | "view" (IntersectionObserver) |
// "card" (Section 2 card stagger) | "star" (Section 3, driven by .is-revealed).
// Delay base: data-rv-delay (ms); +80ms per additional line.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rootEl = document.documentElement;
  if (reduced.matches) return; // plain text, no hidden states
  rootEl.classList.add('reveal-js');

  const STAGGER = 80;
  const targets = [...document.querySelectorAll('[data-rv]')];
  const escapeHtml = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let built = false;
  let lastWidth = 0;

  function splitEl(el) {
    const base = parseInt(el.dataset.rvDelay || '0', 10);
    // Join child nodes with spaces so words split across element boundaries
    // (e.g. the statement's line spans) don't merge.
    const words = [...el.childNodes].map(node => node.textContent).join(' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length) { el.dataset.split = ''; return; }
    // Measurement pass: one inline-block span per word, grouped by line top.
    // Inline display styles beat legacy descendant-span rules (e.g.
    // `.statement p span { display:block }`) that would otherwise force one
    // word per line.
    el.innerHTML = words.map(word => `<span class="rw" style="display:inline-block">${escapeHtml(word)}</span>`).join(' ');
    const wordEls = [...el.querySelectorAll('.rw')];
    const lines = [];
    let top = null;
    for (const wordEl of wordEls) {
      const wordTop = wordEl.offsetTop;
      if (top === null || Math.abs(wordTop - top) > 2) { lines.push([]); top = wordTop; }
      lines[lines.length - 1].push(wordEl.textContent);
    }
    // Rebuild as masked lines; textContent assignment keeps entities safe.
    el.innerHTML = '';
    lines.forEach((lineWords, i) => {
      const mask = document.createElement('span');
      mask.className = 'rm';
      mask.style.display = 'block';
      mask.style.overflow = 'hidden';
      const inner = document.createElement('span');
      inner.className = 'rm-i';
      inner.style.display = 'block';
      inner.textContent = lineWords.join(' ') + (i < lines.length - 1 ? ' ' : '');
      inner.style.transitionDelay = `${base + i * STAGGER}ms`;
      mask.append(inner);
      el.append(mask);
    });
    el.dataset.split = '';
  }

  function buildAll() {
    for (const el of targets) {
      if (el.dataset.rvHtml === undefined) el.dataset.rvHtml = el.innerHTML;
      else el.innerHTML = el.dataset.rvHtml;
      splitEl(el);
    }
    built = true;
    lastWidth = window.innerWidth;
  }

  function setupTriggers() {
    // Hero: play once on load; inline per-line delays encode the sequence.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('[data-rv="load"]').forEach(el => el.classList.add('on'));
      });
    });

    const grid = document.querySelector('.feature-grid');
    if ('IntersectionObserver' in window) {
      const viewObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('on');
          viewObserver.unobserve(entry.target);
        }
      }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
      document.querySelectorAll('[data-rv="view"]').forEach(el => viewObserver.observe(el));

      if (grid) {
        const cards = [...grid.querySelectorAll('.feature-card')];
        const gridObserver = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) return;
          gridObserver.disconnect();
          grid.classList.add('is-inview');
          cards.forEach((card, i) => {
            setTimeout(() => {
              card.querySelectorAll('[data-rv="card"]').forEach(el => el.classList.add('on'));
            }, 90 + i * 130);
          });
          // After the entrance, hand transforms back to the instant hover transitions.
          setTimeout(() => grid.classList.add('settled'), 180 + (cards.length - 1) * 130 + 900);
        }, { threshold: 0.12 });
        gridObserver.observe(grid);
      }
    } else {
      document.querySelectorAll('[data-rv="view"], [data-rv="card"]').forEach(el => el.classList.add('on'));
      if (grid) grid.classList.add('is-inview', 'settled');
    }
  }

  function init() {
    try {
      buildAll();
      setupTriggers();
    } catch (error) {
      console.error('Text reveal unavailable:', error);
      rootEl.classList.remove('reveal-js'); // restore fully visible text
      return;
    }
    // Late font swaps change line breaks; re-split once fonts settle.
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', () => { if (built) rebuild(); }, { once: true });
    }
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth !== lastWidth) rebuild();
      }, 160);
    }, { passive: true });
  }

  function rebuild() {
    try { buildAll(); } catch (error) { console.error('Text reveal reflow failed:', error); }
  }

  // Split with the real fonts whenever possible, but never block the page.
  Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 1200)),
  ]).then(init);
})();
