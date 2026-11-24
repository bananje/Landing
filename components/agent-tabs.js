// Process tabs in #operations: WAI-ARIA tabs with a roving tabindex.
// Panels are static HTML (one per process), the script only toggles [hidden].
(() => {
  const tablist = document.querySelector('#operations [role="tablist"]');
  if (!tablist) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  function select(tab, focus) {
    tabs.forEach(item => {
      const on = item === tab;
      item.setAttribute('aria-selected', String(on));
      item.tabIndex = on ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus({ preventScroll: true });
    // On phones the pills sit in one horizontally scrolling row.
    if (tablist.scrollWidth > tablist.clientWidth) {
      tablist.scrollTo({ left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
    }
  }

  tablist.addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab, false);
  });

  tablist.addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const next = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    }[event.key];
    if (!next) return;
    event.preventDefault();
    select(next, true);
  });
})();
