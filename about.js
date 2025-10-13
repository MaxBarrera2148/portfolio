/* ===== Utilities ===== */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const clamp = (v, a=0, b=1) => Math.min(b, Math.max(a, v));

/* Year in footer */
$('#y').textContent = new Date().getFullYear();

/* ===== 3D Scroll Scenes (parallax per section) =====
   Each .scroll-scene has data-perspective and children with [data-depth].
   We compute progress of the section in viewport (0..1) and translateZ/translateY
   based on depth — subtle, tasteful motion. */
(function initScrollScenes(){
  const scenes = $$('.scroll-scene');
  if (!scenes.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  scenes.forEach(scene => {
    scene.style.perspective = (scene.dataset.perspective || 1200) + 'px';
  });

  function update(){
    if (reduce) return;
    for (const scene of scenes){
      const rect = scene.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = clamp(1 - (rect.top / (vh + rect.height))); // ~0..1 while visible

      // broadcast to CSS if you want to use it there
      scene.style.setProperty('--progress', progress.toFixed(3));

      // move depth layers
      const layers = $$('[data-depth]', scene);
      for (const el of layers){
        const d = parseFloat(el.dataset.depth || 120); // px of Z travel
        // subtle translateY for parallax, a touch of rotate
        el.style.transform = `translateZ(${(1-progress)*-d}px) translateY(${(0.5-progress)*20}px) rotateZ(${(0.5-progress)*2}deg)`;
      }

      // vinyl special: rotate with progress
      if (scene.id === 'music'){
        const vinyl = $('.vinyl', scene);
        if (vinyl){
          const rot = progress * 720; // 2 spins through panel
          vinyl.style.transform = `rotate(${rot}deg)`;
        }
      }
    }
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(()=>{ update(); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll, {passive:true});
  update(); // first paint
})();

/* ===== Card Tilt (holographic) ===== */
(function initTilt(){
  const cards = $$('[data-tilt]');
  if (!cards.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  cards.forEach(card => {
    const bounds = () => card.getBoundingClientRect();

    function onMove(e){
      if (reduce) return;
      const b = bounds();
      const x = (e.clientX - b.left) / b.width - 0.5;
      const y = (e.clientY - b.top)  / b.height - 0.5;
      const rx = y * -10;  // deg
      const ry = x *  14;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    }
    function reset(){ card.style.transform = ''; }

    card.addEventListener('mousemove', onMove);
    card.addEventListener('mouseleave', reset);
    card.addEventListener('blur', reset);
  });
})();

/* ===== Polaroid drag-to-shuffle (desktop) ===== */
(function initPolaroids(){
  const wall = $('#polaroidWall');
  if (!wall) return;

  let drag, offsetX, offsetY, startIndex;
  wall.addEventListener('dragstart', e => {
    const el = e.target.closest('.polaroid');
    if (!el) return;
    drag = el;
    startIndex = [...wall.children].indexOf(el);
    offsetX = e.offsetX; offsetY = e.offsetY;
    el.classList.add('dragging');
    // give it a little lift
    el.style.transform += ' translateY(-6px)';
  });

  wall.addEventListener('dragover', e => {
    e.preventDefault();
    const after = [...wall.children].find(child => {
      const rect = child.getBoundingClientRect();
      return e.clientY < rect.top + rect.height/2 && e.clientX < rect.left + rect.width;
    });
    if (after && after !== drag) wall.insertBefore(drag, after);
  });

  wall.addEventListener('dragend', () => {
    if (!drag) return;
    drag.classList.remove('dragging');
    // randomize angle a little on drop
    const r = (Math.random()*10-5).toFixed(1);
    drag.style.setProperty('--r', `${r}deg`);
    drag.style.transform = `rotate(${r}deg)`;
    drag = null;
  });
})();

/* Improve snap feel on some browsers by ensuring the first panel aligns */
window.addEventListener('load', () => {
  document.scrollingElement?.scrollTo({top: 0, left: 0, behavior: 'instant' });
});
