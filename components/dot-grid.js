/** Reusable background. Call the returned function to detach it when unmounting.
 * Markup: <span class="dot-grid" data-dot-grid aria-hidden="true"></span>
 * Host: position:relative; isolation:isolate; background:#000.
 * Set foreground layers to z-index:1 or higher. No rendering libraries needed.
 */
export function attachDotGrid(layer, host = layer.parentElement) {
  const pointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const options = { passive: true, signal: listeners.signal };
  let bounds = host.getBoundingClientRect();
  let currentX = bounds.width / 2, currentY = bounds.height / 2;
  let targetX = currentX, targetY = currentY;
  let opacity = 0, targetOpacity = 0;
  let frame = 0, previousTime = 0;
  let initialized = false, enabled = pointer.matches && !reduced.matches;

  function animate(time) {
    frame = 0;
    // Equivalent to 0.08 lerp at 60Hz; consistent on high-refresh displays.
    const elapsed = previousTime ? Math.min(time - previousTime, 50) : 1000 / 60;
    previousTime = time;
    const follow = 1 - Math.pow(1 - .08, elapsed / (1000 / 60));
    currentX += (targetX - currentX) * follow;
    currentY += (targetY - currentY) * follow;
    opacity += (targetOpacity - opacity) * follow;
    const settled = Math.abs(targetX - currentX) < .1 && Math.abs(targetY - currentY) < .1 && Math.abs(targetOpacity - opacity) < .001;
    if (settled) { currentX = targetX; currentY = targetY; opacity = targetOpacity; }
    // No layout reads or DOM changes in the animation loop.
    layer.style.setProperty('--mouse-x', `${currentX.toFixed(2)}px`);
    layer.style.setProperty('--mouse-y', `${currentY.toFixed(2)}px`);
    layer.style.setProperty('--highlight-opacity', opacity.toFixed(4));
    if (!settled) frame = requestAnimationFrame(animate);
  }
  function schedule() {
    if (!frame && !document.hidden) { previousTime = 0; frame = requestAnimationFrame(animate); }
  }
  function move(event) {
    if (!enabled || event.pointerType === 'touch') return;
    targetX = event.clientX - bounds.left;
    targetY = event.clientY - bounds.top;
    // Initialize invisibly on first entry. All visible movement is interpolated.
    if (!initialized) { currentX = targetX; currentY = targetY; initialized = true; }
    targetOpacity = 1;
    schedule();
  }
  function leave() { targetOpacity = 0; schedule(); }
  function measure() { bounds = host.getBoundingClientRect(); }
  function preferencesChanged() {
    enabled = pointer.matches && !reduced.matches;
    if (!enabled) { targetOpacity = 0; opacity = 0; initialized = false; schedule(); }
  }
  host.addEventListener('pointerenter', event => { measure(); move(event); }, options);
  host.addEventListener('pointermove', move, options);
  host.addEventListener('pointerleave', leave, options);
  host.addEventListener('pointercancel', leave, options);
  // Cache geometry only when it can change, never on pointermove or per frame.
  window.addEventListener('resize', measure, options);
  window.addEventListener('scroll', () => { measure(); leave(); }, { ...options, capture: true });
  window.addEventListener('blur', leave, options);
  pointer.addEventListener('change', preferencesChanged, options);
  reduced.addEventListener('change', preferencesChanged, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; targetOpacity = 0; }
    else schedule();
  }, options);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(host);
  return () => { listeners.abort(); resizeObserver.disconnect(); cancelAnimationFrame(frame); layer.style.removeProperty('--mouse-x'); layer.style.removeProperty('--mouse-y'); layer.style.removeProperty('--highlight-opacity'); };
}

document.querySelectorAll('[data-dot-grid]').forEach(layer => attachDotGrid(layer));
