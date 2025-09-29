/* Header FLIP morph with IO hysteresis + timer guards */
(() => {
    'use strict';
  
    const header   = document.getElementById('siteHeader');
    const brand    = document.getElementById('brand');
    const full     = document.getElementById('brandFull');
    const initials = document.getElementById('brandInitials');
    const sentinel = document.getElementById('scrollSentinel');
  
    // Split to per-letter spans
    const fullText = full.textContent;
    full.textContent = '';
    const chars = [];
    for (let i = 0; i < fullText.length; i++) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = fullText[i];
      span.style.setProperty('--i', i);
      chars.push(span);
      full.appendChild(span);
    }
  
    // Mark first M and first B as "kept" (the ones we FLIP)
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
  
    // Helpers to hide/show kept letters after morph
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
    const EXIT_AT  = 12; // px from top to exit scrolled
  
    // Use two observers with different rootMargins for clean hysteresis
    const enterIO = new IntersectionObserver(([entry]) => {
      // When the sentinel is ABOVE the top edge by at least ENTER_AT, enter scrolled
      const pastTop = entry.boundingClientRect.top < -ENTER_AT;
      if (pastTop && !isScrolled) morphForward();
    }, { root: null, threshold: 0 });
  
    const exitIO = new IntersectionObserver(([entry]) => {
      // When the sentinel is BELOW or near the top (within EXIT_AT), exit scrolled
      const nearTop = entry.boundingClientRect.top >= -EXIT_AT;
      if (nearTop && isScrolled) morphBack();
    }, { root: null, threshold: 0 });
  
    enterIO.observe(sentinel);
    exitIO.observe(sentinel);
  
    function morphForward() {
      isScrolled = true;
      header.classList.add('is-scrolled');
      brand.setAttribute('aria-label', 'MB');
  
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  
      flipForward(keepRefs.M, targetM);
      flipForward(keepRefs.B, targetB);
  
      initials.classList.remove('settle');
  
      hideTimer = setTimeout(() => {
        if (!isScrolled) return;       // guard against quick reverse
        initials.classList.add('settle');
        hideKept();                    // avoid “ghost MB” beneath initials
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
  
    // Fallback: update on scroll too (covers very old browsers or unusual layouts)
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
  
    // Ensure correct initial state (e.g., if page opens at an anchor)
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
  