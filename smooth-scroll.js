// Lenis-style inertial scrolling: wheel input is intercepted and the native
// scroll position is animated with exponential damping, so window.scrollY stays
// the single source of truth for every scroll-driven animation (3D scene,
// timeline fill, card reveals). Keyboard, scrollbar, anchors and touch keep
// their native behavior and simply resync the animation.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = !reduced.matches;
  let target = window.scrollY;
  let current = target;
  let written = target; // last value this module wrote via scrollTo
  let raf = 0;
  let lastTime = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const maxScroll = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  function write(y) {
    written = y;
    // CSS scroll-behavior stays smooth for anchors and keyboard. The inertia
    // loop must jump to the interpolated position, or the two animations fight.
    window.scrollTo({ left: 0, top: y, behavior: 'instant' });
  }

  function step(time) {
    raf = 0;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;
    const diff = target - current;
    if (Math.abs(diff) < 0.1) {
      if (current !== target) { current = target; write(current); }
      return;
    }
    // Medium inertia, ~9/s damping: responsive but with smooth momentum.
    current += diff * (1 - Math.exp(-dt * 9));
    write(current);
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (!raf && !document.hidden) { lastTime = 0; raf = requestAnimationFrame(step); }
  }

  function onWheel(event) {
    if (!enabled || event.ctrlKey) return; // ctrl+wheel is pinch zoom
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return; // horizontal gesture
    if (document.querySelector('dialog[open]')) return; // let open dialogs scroll natively
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const next = clamp(target + event.deltaY * unit, 0, maxScroll());
    if (next === target) return;
    target = next;
    event.preventDefault();
    start();
  }

  // External scrolls (keyboard, scrollbar drag, find-in-page, scroll restoration)
  // adopt the actual position instead of fighting it.
  function onScroll() {
    if (!enabled) return;
    if (Math.abs(window.scrollY - written) > 2) {
      target = current = written = window.scrollY;
    }
  }

  function onResize() {
    target = clamp(target, 0, maxScroll());
    current = clamp(current, 0, maxScroll());
  }

  reduced.addEventListener('change', () => {
    enabled = !reduced.matches;
    if (!enabled) {
      cancelAnimationFrame(raf);
      raf = 0;
      target = current = written = window.scrollY;
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else if (target !== current) start();
  });
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
})();
