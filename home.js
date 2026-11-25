// Анимации: появление блоков при скролле, каскад внутри сеток, лёгкий параллакс хрома.
// Без JS и при prefers-reduced-motion всё видно сразу.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Что анимируем автоматически (помимо элементов с data-reveal в разметке)
  const AUTO = [
    '.section-head', '.svc-group__head', '.svc-note', '.faq details', '.incl li',
    '.final', '.footer', '.svc-hero__main > *', '.svc-hero__who', '.svc-hero__back',
    '.hero__content > *'
  ];
  document.querySelectorAll(AUTO.join(',')).forEach((el) => el.setAttribute('data-reveal', ''));

  const items = [...document.querySelectorAll('[data-reveal]')];

  // Каскад: порядковый номер среди соседей задаёт задержку (до 6 шагов по 90 мс)
  items.forEach((el) => {
    const sibs = [...(el.parentElement ? el.parentElement.children : [])].filter((n) => n.hasAttribute('data-reveal'));
    const i = Math.min(sibs.indexOf(el), 6);
    el.style.setProperty('--d', `${i * 90}ms`);
  });

  const show = (el) => el.classList.add('is-in');
  if (!items.length) return;
  if (!('IntersectionObserver' in window) || reduce) {
    items.forEach(show);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
    // Страховка: если наблюдатель не сработал, через 2.5 с показываем всё.
    setTimeout(() => items.forEach(show), 2500);
  }

  // Параллакс хромовых лент: лента чуть сдвигается относительно карточки при скролле
  if (reduce) return;
  const chromes = [...document.querySelectorAll('.chrome')];
  if (!chromes.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    chromes.forEach((c) => {
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const k = (r.top + r.height / 2 - vh / 2) / vh; // −0.5…0.5
      c.style.setProperty('--py', `${(k * -28).toFixed(1)}px`);
      c.style.setProperty('--px', `${(k * 36).toFixed(1)}px`);
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();

// Карточки «Узнаёте свою компанию?»: по клику переворачиваются и раскрываются в окно с решением
(() => {
  const cards = [...document.querySelectorAll('.problem[data-solution]')];
  if (!cards.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduce ? 0 : 650;
  let opened = null;

  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  const apply = (el, r) => Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  const target = () => {
    const w = Math.min(520, innerWidth - 32);
    const h = Math.min(innerHeight - 40, innerWidth < 480 ? 400 : 360);
    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
  };

  function open(card) {
    if (opened) return;
    const tone = card.classList.contains('tile--ink') ? 'ink' : card.classList.contains('tile--lime') ? 'lime' : card.classList.contains('tile--grey') ? 'grey' : 'white';
    const backTone = tone === 'ink' ? 'lime' : 'ink';
    const idx = card.querySelector('.step__index').textContent;
    const text = card.querySelector('.problem__text').textContent;

    const overlay = document.createElement('div');
    overlay.className = 'flip-overlay';
    overlay.innerHTML = `
      <div class="flip" role="dialog" aria-modal="true" aria-label="Как решаем: ${esc(text)}">
        <div class="flip__inner">
          <div class="flip__face flip__front flip--${tone}">
            <span class="step__index">${esc(idx)}</span>
            <p class="tile__title problem__text">${esc(text)}</p>
          </div>
          <div class="flip__face flip__back flip--${backTone}">
            <button class="flip__close" type="button" aria-label="Закрыть">×</button>
            <div class="flip__content">
              <span class="chip ${backTone === 'ink' ? 'chip--lime' : ''}">${esc(card.dataset.label || 'как решаем')}</span>
              <p class="flip__text">${esc(card.dataset.solution)}</p>
              <a class="btn ${backTone === 'ink' ? 'btn--lime' : ''}" href="${esc(card.dataset.link)}">${esc(card.dataset.service)} <span class="btn__arrow" aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </div>`;
    const flip = overlay.querySelector('.flip');
    apply(flip, rectOf(card));
    // Лицевая сторона копирует раскладку настоящей карточки (строка на телефоне, колонка на десктопе),
    // иначе при открытии и закрытии текст «съезжает» и в конце дёргается.
    const cs = getComputedStyle(card);
    const front = flip.querySelector('.flip__front');
    Object.assign(front.style, {
      flexDirection: cs.flexDirection, justifyContent: cs.justifyContent, alignItems: cs.alignItems,
      gap: cs.gap, padding: cs.padding, borderRadius: cs.borderRadius
    });
    const realIdx = card.querySelector('.step__index'), realText = card.querySelector('.problem__text');
    const ci = getComputedStyle(realIdx), ct = getComputedStyle(realText);
    const realFlip = card.querySelector('.problem__flip'); // иконка занимает место в строке: без неё текст переносится иначе
    if (realFlip) front.appendChild(realFlip.cloneNode(true));
    Object.assign(front.querySelector('.step__index').style, { flex: ci.flex, minWidth: ci.minWidth, margin: ci.margin });
    Object.assign(front.querySelector('.problem__text').style, { maxWidth: ct.maxWidth, fontSize: ct.fontSize, lineHeight: ct.lineHeight, fontWeight: ct.fontWeight, flex: ct.flex });
    flip.style.setProperty('--tw', target().width + 'px'); // ширина текста фиксирована, он не перестраивается во время анимации
    document.body.appendChild(overlay);
    document.documentElement.classList.add('flip-lock');
    card.style.visibility = 'hidden';
    opened = { card, overlay, flip };

    void flip.offsetWidth; // фиксируем стартовое положение
    overlay.classList.add('is-open');
    apply(flip, target());
    setTimeout(() => overlay.querySelector('.flip__close').focus({ preventScroll: true }), DUR);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.flip__close').addEventListener('click', close);
  }

  function close() {
    if (!opened) return;
    const { card, overlay, flip } = opened;
    opened = null;
    overlay.classList.remove('is-open');
    apply(flip, rectOf(card));
    setTimeout(() => {
      overlay.remove();
      card.style.visibility = '';
      // курсор остался над карточкой: не даём ей «подпрыгнуть» (hover-подъём) сразу после возврата
      card.classList.add('no-lift');
      card.addEventListener('pointerleave', () => card.classList.remove('no-lift'), { once: true });
      document.documentElement.classList.remove('flip-lock');
      card.focus({ preventScroll: true });
    }, DUR);
  }

  cards.forEach((c) => {
    c.addEventListener('click', () => open(c));
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c); } });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (opened) { apply(opened.flip, target()); opened.flip.style.setProperty('--tw', target().width + 'px'); } });
})();

// «Наши услуги»: активная карточка расширяется. Состояние ставим с небольшой задержкой
// и не сбрасываем при уходе курсора, чтобы соседи не «пинг-понгили» во время анимации.
(() => {
  const acc = document.querySelector('.acc');
  if (!acc) return;
  const cards = [...acc.querySelectorAll('.svc')];
  let timer = null;
  const setActive = (card) => {
    clearTimeout(timer);
    if (card.classList.contains('is-active')) return;
    timer = setTimeout(() => {
      cards.forEach((c) => c.classList.toggle('is-active', c === card));
    }, 70);
  };
  cards.forEach((c) => {
    c.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') setActive(c); });
    c.addEventListener('pointerleave', () => clearTimeout(timer));
    c.addEventListener('focusin', () => setActive(c));
    // Касание на телефоне: первый тап раскрывает карточку, ссылка срабатывает только на уже раскрытой
    c.addEventListener('click', (e) => {
      if (!matchMedia('(max-width: 900px), (hover: none)').matches || c.classList.contains('is-active')) return;
      e.preventDefault();
      clearTimeout(timer);
      cards.forEach((x) => x.classList.toggle('is-active', x === c));
    });
    // на сенсорных экранах первый тап раскрывает, но ссылка кнопки работает сразу
  });
})();

// «Сферы применения»: переключение вкладок (клик и стрелки на клавиатуре)
(() => {
  document.querySelectorAll('[data-areas]').forEach((root) => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].classList.toggle('is-active', on);
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!next) return;
        e.preventDefault();
        select((i + next + tabs.length) % tabs.length, true);
      });
    });
  });
})();

// Итоги аудита: по клику на пункт открывается окно с описанием шага
(() => {
  const items = [...document.querySelectorAll('.rs__item[data-how]')];
  if (!items.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduce ? 0 : 600;
  let current = null;
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  const apply = (el, r) => Object.assign(el.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  // высота окна подгоняется под содержимое, чтобы между блоками не было пустоты
  const natural = (dlg, w) => {
    const c = dlg.querySelector('.dlg__content');
    c.style.height = 'auto';
    const h = c.offsetHeight;
    c.style.height = '';
    return h;
  };
  const target = (dlg) => {
    const w = Math.min(560, innerWidth - 32);
    if (dlg) dlg.style.setProperty('--dw', w + 'px');
    const h = Math.min(innerHeight - 40, dlg ? natural(dlg, w) : 500);
    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
  };

  function open(item) {
    if (current) return;
    const d = item.dataset;
    const title = item.querySelector('.rs__title').textContent;
    const overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';
    overlay.innerHTML = `
      <div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <button class="dlg__close" type="button" aria-label="Закрыть">×</button>
        <div class="dlg__content">
          <div class="dlg__top"><span class="dlg__n">${esc(d.n)}</span><span class="${esc(item.querySelector('.rs__pill').className)}">${esc(d.group)}</span></div>
          <h3 class="dlg__title">${esc(title)}</h3>
          <div><span class="dlg__label">Как проходит</span><p class="dlg__text">${esc(d.how)}</p></div>
          <div class="dlg__time"><span class="dlg__label">Ваше время</span>${esc(d.time)}</div>
          <div class="dlg__res"><span class="dlg__label">Что получите</span>${esc(d.result)}</div>
        </div>
      </div>`;
    const dlg = overlay.querySelector('.dlg');
    apply(dlg, rectOf(item));
    document.body.appendChild(overlay);
    target(dlg);
    document.documentElement.classList.add('flip-lock');
    current = { item, overlay, dlg };
    void dlg.offsetWidth;
    overlay.classList.add('is-open');
    apply(dlg, target(dlg));
    setTimeout(() => overlay.querySelector('.dlg__close').focus({ preventScroll: true }), DUR);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('.dlg__close').addEventListener('click', close);
  }

  function close() {
    if (!current) return;
    const { item, overlay, dlg } = current;
    current = null;
    overlay.classList.remove('is-open');
    apply(dlg, rectOf(item));
    setTimeout(() => {
      overlay.remove();
      document.documentElement.classList.remove('flip-lock');
      item.focus({ preventScroll: true });
    }, DUR);
  }

  items.forEach((el) => {
    el.addEventListener('click', () => open(el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); } });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (current) apply(current.dlg, target(current.dlg)); });
})();

/* Список материалов на телефоне: сначала 3 пункта, остальные по кнопке */
(() => {
  const list = document.querySelector('.rs__list');
  if (!list) return;
  const total = list.querySelectorAll('.rs__item').length;
  const rest = total - 3;
  if (rest <= 0) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rs__more';
  btn.setAttribute('aria-expanded', 'false');
  list.insertAdjacentElement('afterend', btn);
  const set = (open) => {
    list.classList.toggle('is-collapsed', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Свернуть' : 'Показать ещё ' + rest;
  };
  set(false);
  btn.addEventListener('click', () => {
    const open = list.classList.contains('is-collapsed');
    set(open);
    if (!open) list.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
})();

/* Карусель кейсов — бесконечная: три набора карточек (клоны до и после), позиция незаметно перескакивает в средний набор */
(() => {
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('.carousel__track');
    const prev = root.querySelector('.carousel__btn--prev');
    const next = root.querySelector('.carousel__btn--next');
    if (!track || !prev || !next) return;

    const originals = [...track.querySelectorAll('.tile')];
    const N = originals.length;
    const makeClones = () => originals.map((c) => {
      const k = c.cloneNode(true);
      k.removeAttribute('data-reveal');
      k.classList.add('is-in');
      k.setAttribute('aria-hidden', 'true');
      k.setAttribute('inert', '');
      return k;
    });
    const loop = N > 1;
    if (loop) {
      const before = makeClones();
      const after = makeClones();
      before.forEach((k) => track.insertBefore(k, originals[0]));
      after.forEach((k) => track.appendChild(k));
    }

    // левый край каждой карточки в координатах прокрутки
    const lefts = () => {
      const base = track.getBoundingClientRect().left - track.scrollLeft;
      return [...track.querySelectorAll('.tile')].map((c) => c.getBoundingClientRect().left - base);
    };
    const jump = (x) => {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = x;
      track.style.scrollBehavior = '';
    };
    const normalize = () => {
      if (!loop) return;
      const pts = lefts();
      const sl = track.scrollLeft;
      const period = pts[N] - pts[0];
      if (sl < pts[N] - 1) jump(sl + period);
      else if (sl >= pts[2 * N] - 1) jump(sl - period);
    };
    const go = (dir) => {
      const pts = lefts();
      const cur = track.scrollLeft;
      const max = track.scrollWidth - track.clientWidth;
      let target = dir > 0 ? pts.find((p) => p > cur + 2) : [...pts].reverse().find((p) => p < cur - 2);
      if (target === undefined) target = dir > 0 ? max : 0;
      track.scrollTo({ left: Math.max(0, Math.min(max, target)), behavior: 'smooth' });
    };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    });

    let t;
    const settle = () => { clearTimeout(t); t = setTimeout(normalize, 140); };
    track.addEventListener('scroll', settle, { passive: true });
    if ('onscrollend' in window) track.addEventListener('scrollend', normalize);
    window.addEventListener('resize', () => { if (loop) jump(lefts()[N]); });

    if (loop) {
      jump(lefts()[N]);
      requestAnimationFrame(() => jump(lefts()[N]));
      window.addEventListener('load', () => jump(lefts()[N]));
    }
  });
})();

// «Как работаем»: описание этапа раскрывается по нажатию
(() => {
  const rows = [...document.querySelectorAll('.method-row[data-acc]')];
  const toggle = (row) => {
    const on = !row.classList.contains('is-open');
    row.classList.toggle('is-open', on);
    row.setAttribute('aria-expanded', on ? 'true' : 'false');
  };
  rows.forEach((row) => {
    row.addEventListener('click', () => toggle(row));
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(row); } });
  });
})();

// Галерея на странице кейса: листание кнопками, колесом/свайпом и перетаскиванием мышью
(() => {
  document.querySelectorAll('[data-gallery]').forEach((root) => {
    const track = root.querySelector('.cs-gal__track');
    const prev = root.querySelector('.cs-gal__btn--prev');
    const next = root.querySelector('.cs-gal__btn--next');
    if (!track) return;
    const step = () => {
      const it = track.querySelector('.cs-gal__item');
      return it ? it.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
    };
    const cap = root.querySelector('.cs-gal__cap');
    const setCap = () => {
      if (!cap) return;
      const items = [...track.querySelectorAll('.cs-gal__item')];
      const i = Math.min(items.length - 1, Math.max(0, Math.round(track.scrollLeft / step())));
      cap.textContent = (items[i] && items[i].dataset.cap) || '';
    };
    const update = () => {
      setCap();
      const max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
    };
    if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });
    // перетаскивание мышью (на тач-экранах работает родной свайп)
    let down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; sx = e.clientX; sl = track.scrollLeft;
      track.classList.add('is-drag');
    });
    addEventListener('pointermove', (e) => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false; track.classList.remove('is-drag');
      const w = step(); track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: 'smooth' });
    });
    update();
  });
})();

// Страница кейса: переключатель экранов, ноутбук и телефон меняются вместе
(() => {
  document.querySelectorAll('[data-shots]').forEach((root) => {
    const tabs = [...root.querySelectorAll('.cs-tab')];
    const imgs = [...root.querySelectorAll('.cs-shot__img')];
    const show = (key) => {
      tabs.forEach((t) => { const on = t.dataset.key === key; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
      imgs.forEach((im) => im.classList.toggle('is-active', im.dataset.key === key));
    };
    const bar = root.querySelector('.cs-tabs');
    const nextBtn = root.querySelector('.cs-tabs__next');
    if (nextBtn) nextBtn.addEventListener('click', () => { if (nextBtn.classList.contains('is-back')) bar.scrollTo({ left: 0, behavior: 'smooth' }); else bar.scrollBy({ left: Math.max(160, bar.clientWidth * 0.6), behavior: 'smooth' }); });
    const edges = () => {
      if (!bar) return;
      const max = bar.scrollWidth - bar.clientWidth - 2;
      const start = bar.scrollLeft <= 2, end = bar.scrollLeft >= max;
      bar.classList.toggle('is-start', start);
      bar.classList.toggle('is-end', end);
      bar.classList.toggle('is-mid', !start && !end);
      if (nextBtn) { nextBtn.hidden = bar.scrollWidth <= bar.clientWidth + 2; nextBtn.classList.toggle('is-back', end); nextBtn.setAttribute('aria-label', end ? 'Вернуться к началу' : 'Листать вкладки вправо'); }
      const b = bar.getBoundingClientRect();
      tabs.forEach((t) => { const r = t.getBoundingClientRect(); t.classList.toggle('is-clipped', r.left < b.left - 1 || r.right > b.right + 1); });
    };
    const reveal = (t) => {
      if (!bar) return;
      const left = t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2;
      bar.scrollTo({ left, behavior: 'smooth' });
    };
    if (bar) {
      bar.addEventListener('scroll', edges, { passive: true });
      addEventListener('resize', edges);
      edges();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', (e) => { show(t.dataset.key); reveal(t); });
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = tabs[(i + d + tabs.length) % tabs.length];
        n.focus(); show(n.dataset.key); reveal(n);
      });
    });
  });
})();
