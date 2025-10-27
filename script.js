/* Header FLIP morph with IntersectionObserver hysteresis + timer guards */
(() => {
  'use strict';

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  const header   = document.getElementById('siteHeader');
  const brand    = document.getElementById('brand');
  const full     = document.getElementById('brandFull');
  const initials = document.getElementById('brandInitials');
  const sentinel = document.getElementById('scrollSentinel');

  // Split full name into per-letter spans (for stagger + FLIP on kept letters)
// Split "Max Barrera" into spans and mark the space
const raw = full.textContent;
// normalize any newline/tabs to a single regular space
const fullText = raw.replace(/\s+/, ' ');
full.textContent = '';

const chars = [];
for (let i = 0; i < fullText.length; i++) {
  const ch = fullText[i];                  // <-- make sure ch exists
  const span = document.createElement('span');
  span.className = 'char';
  if (ch === ' ') {
    span.classList.add('space');           // flag the word gap
    span.textContent = ' ';                // ensure it's a real space
  } else {
    span.textContent = ch;
  }
  span.style.setProperty('--i', i);
  chars.push(span);
  full.appendChild(span);
}


  // Mark first M and first B as kept (these will FLIP to the initials)
  const keepRefs = { M: null, B: null };
  for (const el of chars) {
    const c = el.textContent.toUpperCase();
    if ((c === 'M' || c === 'B') && !keepRefs[c]) {
      el.classList.add('keep');
      keepRefs[c] = el;
    }
  }

  // Targets in initials layer
  const targetM = initials.querySelector('[data-key="M"]');
  const targetB = initials.querySelector('[data-key="B"]');

  // Helpers to hide/show kept letters after morph (prevents MB ghost underneath)
  let hideTimer = null;
  const hideKept = () => full.classList.add('hide-kept');
  const showKept = () => full.classList.remove('hide-kept');

  // FLIP transforms
  function flipForward(fromEl, toEl) {
    if (!fromEl || !toEl) return;
    fromEl.style.transform = 'none';

    const ref  = brand.getBoundingClientRect();
    const from = fromEl.getBoundingClientRect();
    const to   = toEl.getBoundingClientRect();

    const dx = (to.left - ref.left) - (from.left - ref.left);
    const dy = (to.top  - ref.top ) - (from.top  - ref.top );
    const sx = to.width  / Math.max(1, from.width);
    const sy = to.height / Math.max(1, from.height);

    fromEl.style.transition = `transform var(--dur) var(--easing), opacity var(--dur) var(--easing)`;
    fromEl.style.transform  = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  }
  function flipBack(el) {
    if (!el) return;
    el.style.transition = `transform var(--dur) var(--easing), opacity var(--dur) var(--easing)`;
    el.style.transform  = 'none';
    el.style.opacity    = '1';
  }

  // State + IO hysteresis
  let isScrolled = false; // "morphed" state
  const ENTER_AT = 32; // px past top to enter scrolled
  const EXIT_AT  = 12; // px to exit scrolled

  const enterIO = new IntersectionObserver(([entry]) => {
    const pastTop = entry.boundingClientRect.top < -ENTER_AT;
    if (pastTop && !isScrolled) morphForward();
  }, { root: null, threshold: 0 });

  const exitIO = new IntersectionObserver(([entry]) => {
    const nearTop = entry.boundingClientRect.top >= -EXIT_AT;
    if (nearTop && isScrolled) morphBack();
  }, { root: null, threshold: 0 });

  enterIO.observe(sentinel);
  exitIO.observe(sentinel);

  function morphForward() {
    isScrolled = true;
    header.classList.add('is-scrolled');
    brand.setAttribute('aria-label', 'MaxB');

    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    flipForward(keepRefs.M, targetM);
    flipForward(keepRefs.B, targetB);

    initials.classList.remove('settle');

    hideTimer = setTimeout(() => {
      if (!isScrolled) return;      // guard against quick reverse
      initials.classList.add('settle');
      hideKept();                   // avoid ghost MB beneath initials
    }, 260);
  }

  function morphBack() {
    isScrolled = false;

    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

    showKept();
    flipBack(keepRefs.M);
    flipBack(keepRefs.B);

    header.classList.remove('is-scrolled');
    initials.classList.remove('settle');
    brand.setAttribute('aria-label', 'Max Barrera');
  }

  // Fallback scroll listener (covers odd cases/older browsers)
  let ticking = false;
  function onScrollFallback() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;
      if (!isScrolled && y > ENTER_AT) morphForward();
      else if (isScrolled && y <= EXIT_AT) morphBack();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScrollFallback, { passive: true });

  // Ensure correct initial state on load/anchors
  window.addEventListener('load', () => {
    const y = window.scrollY || 0;
    if (y > ENTER_AT) morphForward(); else morphBack();
  });

  // Keep FLIP accurate on resize while scrolled
  let rAF;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(() => {
      if (isScrolled) {
        flipForward(keepRefs.M, targetM);
        flipForward(keepRefs.B, targetB);
      }
    });
  });
})();


/* Hero typewriter: "Websites" -> "Analytics" -> "SEO" */
(() => {
  const el = document.getElementById('typed-word');
  if (!el) return;

  const words = ["Marketer.", "Developer.", "SEO." ];
  let wi = 0;          // which word
  let ci = 0;          // character index
  let deleting = false;

  // Tunables (ms)
  const TYPE = 80;
  const DELETE = 50;
  const HOLD = 1100;       // hold after a full word
  const GAP = 250;         // pause before typing next word

  // Reduced motion? Keep the first word static
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    el.textContent = words[0];
    return;
  }

  function tick() {
    const word = words[wi];

    if (!deleting && ci < word.length) {
      // typing forward
      el.textContent = word.slice(0, ++ci);
      return setTimeout(tick, TYPE);
    }

    if (!deleting && ci === word.length) {
      // full word shown — hold, then start deleting
      deleting = true;
      return setTimeout(tick, HOLD);
    }

    if (deleting && ci > 0) {
      // deleting backward
      el.textContent = word.slice(0, --ci);
      return setTimeout(tick, DELETE);
    }

    // finished deleting — advance to next word
    deleting = false;
    wi = (wi + 1) % words.length;
    return setTimeout(tick, GAP);
  }

  // Start
  el.textContent = words[0].charAt(0) === 'W' ? "" : "";
  ci = 0; deleting = false; wi = 0;
  tick();
})();


/* Work details: auto-switch on scroll + switch on hover/focus/click (one at a time) */
(() => {
  const items = [...document.querySelectorAll('.work-item[data-detail]')];
  const stage = document.getElementById('workDetailsStage');
  if (!items.length || !stage) return;

  const panels = new Map(
    items.map(i => [i.dataset.detail, document.getElementById(i.dataset.detail)])
  );

  let activeItem  = null;
  let activePanel = null;
  let hoverLockUntil = 0; // ms timestamp – prevents scroll from overriding an immediate user hover

  function naturalHeight(panel) {
    if (!panel) return 0;
    // Measure the panel’s natural height even if it's absolutely positioned
    const prev = {
      position: panel.style.position,
      visibility: panel.style.visibility,
      inset: panel.style.inset,
      opacity: panel.style.opacity,
      transform: panel.style.transform,
      pointerEvents: panel.style.pointerEvents,
    };
    panel.style.position = 'static';
    panel.style.visibility = 'hidden';
    panel.style.inset = 'auto';
    panel.style.opacity = '1';
    panel.style.transform = 'none';
    panel.style.pointerEvents = 'none';
    const h = panel.getBoundingClientRect().height; // sub-pixel accurate
    // Revert
    panel.style.position = prev.position;
    panel.style.visibility = prev.visibility;
    panel.style.inset = prev.inset;
    panel.style.opacity = prev.opacity;
    panel.style.transform = prev.transform;
    panel.style.pointerEvents = prev.pointerEvents;
    return h;
  }

  function setActive(item, {fromUser = false, updateHash = false} = {}) {
    if (!item || item === activeItem) return;

    // Left list state
    items.forEach(i => {
      const on = (i === item);
      i.classList.toggle('active', on);
      i.setAttribute('aria-current', on ? 'true' : 'false');
    });

    const nextId = item.dataset.detail;
    const next   = panels.get(nextId);
    if (!next) return;

    const prev = activePanel || panels.get(items[0].dataset.detail);

    // Animate stage height (prevents jumps)
    const fromH = prev ? naturalHeight(prev) : 0;
    const toH   = naturalHeight(next);
    stage.style.height = fromH + 'px';
    // Force reflow then animate to new height
    stage.getBoundingClientRect();
    stage.style.height = toH + 'px';

    // Toggle one visible card
    if (prev && prev !== next) {
      prev.classList.remove('is-active', 'just-activated');
      prev.setAttribute('aria-hidden', 'true');
    }
    next.classList.add('is-active', 'just-activated');
    next.setAttribute('aria-hidden', 'false');
    setTimeout(() => next.classList.remove('just-activated'), 500);

    activeItem  = item;
    activePanel = next;

    if (fromUser) hoverLockUntil = Date.now() + 900;
    if (updateHash) history.replaceState(null, '', `#${nextId}`);
  }

  // Choose row closest to ~45% viewport height
  function pickByScroll() {
    const center = window.innerHeight * 0.45;
    let best = null, bestDist = Infinity;
    for (const item of items) {
      const r = item.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= window.innerHeight) continue;
      const mid = r.top + r.height / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) { bestDist = d; best = item; }
    }
    return best || items[0];
  }

  // Scroll/resize (rAF-throttled)
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (Date.now() < hoverLockUntil) { ticking = false; return; }
      setActive(pickByScroll(), {updateHash: true});
      ticking = false;
    });
  }

  // Hover/focus/click switch immediately
  items.forEach(item => {
    item.addEventListener('mouseenter', () => setActive(item, {fromUser: true, updateHash: true}));
    item.addEventListener('focus',      () => setActive(item, {fromUser: true, updateHash: true}));
    item.addEventListener('click',      () => setActive(item, {fromUser: true, updateHash: true}));
  });

  // Initialize (fix “first never shows” + initial height)
  function init() {
    // If near the top of the page, start on the first item even if center is lower
    const nearTop = (window.scrollY || 0) < 120;
    const hash = location.hash.slice(1);
    const fromHash = hash && items.find(i => i.dataset.detail === hash);
    const startItem = fromHash || (nearTop ? items[0] : pickByScroll());

    setActive(startItem, {updateHash: !!fromHash});

    // After fonts load, recompute stage height so it matches final text metrics
    const refresh = () => { if (activePanel) stage.style.height = naturalHeight(activePanel) + 'px'; };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(refresh).catch(refresh);
    } else {
      setTimeout(refresh, 100);
    }
  }

  window.addEventListener('load', init);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
})();

/* Horizontal shelf: wheel-to-horizontal + click/drag-to-pan */
(() => {
  const shelf = document.getElementById('booksShelf');
  if (!shelf) return;

  // Convert vertical wheel to horizontal pan (trackpads feel natural)
  shelf.addEventListener('wheel', (e) => {
    const absY = Math.abs(e.deltaY);
    const absX = Math.abs(e.deltaX);
    if (absY > absX) { // mostly vertical gesture → map to x
      e.preventDefault();
      shelf.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Click & drag (desktop)
  let dragging = false, startX = 0, startLeft = 0;
  shelf.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX; startLeft = shelf.scrollLeft;
    shelf.classList.add('dragging');
  });
  window.addEventListener('mouseup', () => { dragging = false; shelf.classList.remove('dragging'); });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    shelf.scrollLeft = startLeft - dx * 1.2;
  });

  // Keyboard nudge when shelf focused
  shelf.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') shelf.scrollBy({ left: 240, behavior: 'smooth' });
    if (e.key === 'ArrowLeft')  shelf.scrollBy({ left: -240, behavior: 'smooth' });
  });
})();



(function startCancunClock(){
  const tz = 'America/Cancun';
  const elTime = document.getElementById('cancun-time');
  const elTz   = document.getElementById('cancun-tz');

  // Show timezone abbreviation (e.g., EST)
  try {
    const tzParts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, timeZoneName: 'short'
    }).formatToParts(new Date());
    const abbr = tzParts.find(p => p.type === 'timeZoneName')?.value || '';
    elTz.textContent = abbr ? `(${abbr})` : '';
  } catch(_) { /* no-op */ }

  function format(now){
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(now);
  }

  // Align updates to the exact second to avoid drift
  function tick(){
    const now = Date.now();
    elTime.textContent = format(new Date(now));
    const msToNextSecond = 1000 - (now % 1000);
    setTimeout(tick, msToNextSecond + 5);
  }
  tick();
})();

(() => {
  /* Direction flag for exit animation only */
  const html = document.documentElement;
  let lastY = window.scrollY;
  function setDir(){
    const y = window.scrollY;
    html.dataset.scrollDir = y > lastY ? 'down' : 'up';
    lastY = y;
  }
  setDir();
  window.addEventListener('scroll', setDir, { passive: true });

  /* Hysteresis + cooldown to avoid flapping */
  const ENTER_RATIO = 0.35;   // reveal when >= 35% visible
  const EXIT_RATIO  = 0.15;   // hide when <= 15% visible
  const TOGGLE_DELTA = 32;    // min px scroll between toggles of the same item

  document.querySelectorAll('.xp-preview').forEach(section => {
    const items = [...section.querySelectorAll('.reveal')];
    if (!items.length) return;

    const step = Number(section.dataset.stagger) || 120;
    const state = new Map(items.map(el => [el, { in:false, lastY:-1 }]));

    const io = new IntersectionObserver((entries) => {
      const dir = html.dataset.scrollDir || 'down';

      // Deterministic order per direction (affects stagger on ENTER down only)
      const sorted = entries.slice().sort((a,b) => {
        const follows = (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        return dir === 'down' ? follows : -follows;
      });

      let batch = 0;

      for (const entry of sorted){
        const el = entry.target;
        const st = state.get(el);
        const ratio = entry.intersectionRatio;
        const movedEnough = Math.abs(window.scrollY - st.lastY) >= TOGGLE_DELTA;

        /* ENTER */
        if (!st.in && entry.isIntersecting && ratio >= ENTER_RATIO && movedEnough){
          // Cancel any in-progress exit
          el.classList.remove('leaving');
          el.style.removeProperty('--leave-dir');

          if (dir === 'up') {
            // User is scrolling UP: do NOT animate enter (per your requirement)
            el.classList.add('no-enter');      // disable transition
            // force style
            void el.offsetWidth;
            el.classList.add('in');            // instantly show
            // re-enable transitions for future exits
            requestAnimationFrame(() => el.classList.remove('no-enter'));
          } else {
            // Scrolling DOWN: animate enter with stagger
            el.style.setProperty('--delay', (batch++ * step) + 'ms');
            el.classList.add('in');
          }

          st.in = true;
          st.lastY = window.scrollY;
          continue;
        }

        /* EXIT */
        if (st.in && (ratio <= EXIT_RATIO || !entry.isIntersecting) && movedEnough){
          // Set exit direction:
          //  - scrolling UP => leave downward
          //  - scrolling DOWN => leave upward
          const leaveDir = (dir === 'up') ? 1 : -1;
          el.style.setProperty('--leave-dir', leaveDir);

          // Animate out (overrides .in), then remove 'in' so it transitions to leaving transform
          el.classList.add('leaving');
          void el.offsetWidth;   // reflow to ensure transition
          el.classList.remove('in');

          // Cleanup after transition
          const onEnd = (ev) => {
            if (ev.propertyName !== 'opacity') return;
            el.classList.remove('leaving');
            el.style.removeProperty('--leave-dir');
            el.style.removeProperty('--delay');
            el.removeEventListener('transitionend', onEnd);
          };
          el.addEventListener('transitionend', onEnd);

          st.in = false;
          st.lastY = window.scrollY;
        }
      }
    }, {
      root: null,
      rootMargin: '-8% 0% -18% 0%',
      threshold: [0, .1, .2, .35, .5, .75, 1]
    });

    items.forEach(el => io.observe(el));
  });
})();


(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Run once on initial load
  const start = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // next frame ensures styles are applied before we toggle the class → smoother start
    requestAnimationFrame(() => hero.classList.add('hero--ready'));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();


(function () {
  const root = document.querySelector('.t-slider');
  const viewport = root.querySelector('.t-slider__viewport');
  const prev = root.querySelector('[data-prev]');
  const next = root.querySelector('[data-next]');
  const dotsWrap = root.querySelector('.t-slider__dots');

  const slides = Array.from(viewport.children);

  // 👇 match your breakpoints:
  // <768px = 1 card
  // 768px–1023px = 2 cards
  // ≥1024px = 3 cards
  function getVisibleCount() {
    const w = window.innerWidth;
    if (w >= 1024) return 3;
    if (w >= 768) return 2;
    return 1;
  }

  let visible = getVisibleCount(); // how many cards per "page"
  let page = 0;
  let pages = Math.max(1, Math.ceil(slides.length / visible));

  function buildDots() {
    dotsWrap.innerHTML = '';
    for (let i = 0; i < pages; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 't-slider__dot';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(i === page));
      b.setAttribute('aria-controls', `t-slider-page-${i}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
    }
  }

  function update() {
    // figure out slice of slides that should be "active" for current page
    const start = page * visible;
    const end = Math.min(start + visible, slides.length);

    slides.forEach((el, idx) => {
      const active = idx >= start && idx < end;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
      if (active) {
        el.removeAttribute('inert');
      } else {
        el.setAttribute('inert', '');
      }
    });

    // update dots state
    const dots = Array.from(dotsWrap.children);
    dots.forEach((d, idx) => {
      d.setAttribute('aria-selected', String(idx === page));
    });

    // (optional) disable prev/next at ends if you want non-looping
    // prev.disabled = page === 0;
    // next.disabled = page === pages - 1;
  }

  function goTo(p) {
    // wrap around so next on last goes to first, prev on first goes to last
    page = (p + pages) % pages;
    update();
  }

  function nextPage() {
    goTo(page + 1);
  }

  function prevPage() {
    goTo(page - 1);
  }

  function onResize() {
    const newVisible = getVisibleCount();
    if (newVisible !== visible) {
      // keep track of the index of the first visible slide before we change layout
      const firstVisibleIdx = page * visible;

      visible = newVisible;
      pages = Math.max(1, Math.ceil(slides.length / visible));

      // recompute page so that the same firstVisibleIdx stays in view
      page = Math.floor(firstVisibleIdx / visible);

      buildDots();
      update();
    }
  }

  // Events
  next.addEventListener('click', nextPage);
  prev.addEventListener('click', prevPage);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevPage();
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextPage();
    }
  });

  // listen to both window resize and media query changes
  const mq = window.matchMedia('(min-width: 768px)');
  if (mq.addEventListener) {
    mq.addEventListener('change', onResize);
  } else {
    // Safari <14 fallback
    mq.addListener(onResize);
  }

  window.addEventListener('resize', onResize, { passive: true });

  // Init
  buildDots();
  update();
})();


(function () {
  const lightbox = document.getElementById('csLightbox');
  const lightboxImg = document.getElementById('csLightboxImg');
  const closeBtn = document.getElementById('csLightboxClose');

  if (!lightbox || !lightboxImg || !closeBtn) return;

  document.querySelectorAll('[data-lightbox-trigger]').forEach(btn => {
    btn.addEventListener('click', () => {
      const imgEl = btn.querySelector('img');
      if (!imgEl) return;
      // swap to high-res if you follow the "-thumb" naming rule
      const hiRes = imgEl.src.replace('-thumb', '');
      lightboxImg.src = hiRes;
      lightboxImg.alt = imgEl.alt || '';
      lightbox.classList.add('is-visible');
      lightbox.setAttribute('aria-hidden', 'false');
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('is-visible');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    lightboxImg.alt = '';
  }

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-visible')) {
      closeLightbox();
    }
  });
})();


document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("cards"); // your <ul id="cards" class="work-grid">
  if (!grid) return;

  const cards = grid.getElementsByClassName("card");

  function handleMove(e) {
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  }

  function handleEnter() {
    grid.classList.add("is-hovering");
  }

  function handleLeave() {
    grid.classList.remove("is-hovering");
  }

  grid.addEventListener("mousemove", handleMove);
  grid.addEventListener("mouseenter", handleEnter);
  grid.addEventListener("mouseleave", handleLeave);
});
