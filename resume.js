/* Sticky-nav section highlighter + smooth scrolling */
(() => {
    const nav = document.getElementById('sidenav');
    const indicator = nav?.querySelector('.nav__indicator');
    const links = [...nav.querySelectorAll('.nav__link')];
  
    // Map section id -> <a>
    const linkById = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const sections = [...linkById.keys()].map(id => document.getElementById(id)).filter(Boolean);
  
    // Move the indicator to a link
    function moveIndicator(toLink) {
      if (!indicator || !toLink) return;
      const li = toLink.closest('.nav__item');
      const list = nav.querySelector('.nav__list');
      const top = li.offsetTop - list.offsetTop; // relative to list
      indicator.style.height = li.offsetHeight + 'px';
      indicator.style.transform = `translateY(${top}px)`;
    }
  
    // Update aria-current and indicator
    function setActive(id) {
      links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href').slice(1) === id ? 'true' : 'false'));
      moveIndicator(linkById.get(id));
    }
  
    // Intersection Observer to detect which section is in view
    const io = new IntersectionObserver((entries) => {
      // Choose the most visible entry above the fold
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    }, {
      root: null,
      // trigger when a section's middle area enters the viewport
      rootMargin: '-35% 0% -55% 0%',
      threshold: [0.1, 0.25, 0.5, 0.75]
    });
  
    sections.forEach(sec => io.observe(sec));
  
    // Click-to-scroll (smooth); scroll-margin-top on sections handles offset
    links.forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(id);
        history.replaceState(null, '', `#${id}`);
      });
    });
  
    // Initialize on load (support deep links)
    window.addEventListener('load', () => {
      const id = location.hash.slice(1);
      const target = id && document.getElementById(id);
      setActive(target ? id : sections[0].id);
    });
  })();
  