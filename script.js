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

  const words = ["Websites.", "Landing pages.", "SEO Services.", "Tracking & Analytics." ];
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
