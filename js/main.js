/* ============================================================
   REDUCED MOTION CHECK
   ============================================================ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   NEURAL NETWORK CANVAS
   ============================================================ */
(function initCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const NODE_COUNT  = 52;
  const MAX_DIST    = 165;
  const NODE_SPEED  = prefersReducedMotion ? 0 : 0.26;
  const LINE_RGB    = '91,140,126';
  const NODE_RGB    = '127,181,164';

  let W, H, nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeNode() {
    return {
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - 0.5) * NODE_SPEED,
      vy: (Math.random() - 0.5) * NODE_SPEED,
      r:  1.4 + Math.random() * 1.4,
    };
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(${LINE_RGB},${(1 - d / MAX_DIST) * 0.3})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${NODE_RGB},0.5)`;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  nodes = Array.from({ length: NODE_COUNT }, makeNode);
  tick();
})();

/* ============================================================
   HEADER SCROLL STATE
   ============================================================ */
(function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* ============================================================
   SCROLL-SPY
   ============================================================ */
(function initScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const links    = document.querySelectorAll('.site-nav a[href^="#"]');
  if (!sections.length || !links.length) return;

  new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting)
        links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    }),
    { rootMargin: '-40% 0px -50% 0px' }
  ).observe(sections[0]) && sections.forEach((s) =>
    new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting)
          links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
      }),
      { rootMargin: '-40% 0px -50% 0px' }
    ).observe(s)
  );
})();

/* ============================================================
   ANIMATIONS — GSAP + ScrollTrigger + Lenis
   ============================================================ */
(function initAnimations() {
  if (prefersReducedMotion) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis smooth scroll ---- */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ----------------------------------------------------------------
     HERO — wrap name lines in clip container, set initial states
     ---------------------------------------------------------------- */
  document.querySelectorAll('.name-line').forEach((line) => {
    const inner = document.createElement('span');
    inner.className = 'name-line-inner';
    inner.textContent = line.textContent;
    line.textContent = '';
    line.appendChild(inner);
  });

  /* set initial invisible states via GSAP (not CSS) so no-JS users see content */
  gsap.set('.hero-eyebrow', { opacity: 0, y: 10 });
  gsap.set('.name-line-inner', { y: '110%' });
  gsap.set('.hero-tagline', { opacity: 0, y: 18 });
  gsap.set('.hero-links',   { opacity: 0, y: 12 });
  gsap.set('.scroll-hint',  { opacity: 0 });

  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.1 });
  heroTL
    .to('.hero-eyebrow',     { opacity: 1, y: 0,   duration: 0.75 })
    .to('.name-line-inner',  { y: '0%',             duration: 1.0, stagger: 0.12, ease: 'power4.out' }, '-=0.4')
    .to('.hero-tagline',     { opacity: 1, y: 0,   duration: 0.8 }, '-=0.55')
    .to('.hero-links',       { opacity: 1, y: 0,   duration: 0.7 }, '-=0.55')
    .to('.scroll-hint',      { opacity: 1,          duration: 0.6 }, '-=0.3');

  /* hero stage drifts up + fades as you scroll away */
  gsap.to('.hero-stage', {
    y: -70, opacity: 0.15, ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.4,
    },
  });

  /* canvas dims once you leave hero */
  gsap.to('#neural-canvas', {
    opacity: 0.15, ease: 'none',
    scrollTrigger: {
      trigger: '.hero',
      start: 'bottom 65%',
      end: 'bottom top',
      scrub: true,
    },
  });

  /* ----------------------------------------------------------------
     SECTION REVEALS
     Each section: heading wipes up, sub fades, items stagger up
     ---------------------------------------------------------------- */
  document.querySelectorAll('.content-section').forEach((section) => {
    const heading = section.querySelector('.reveal-heading');
    const sub     = section.querySelector('.reveal-sub');
    const items   = section.querySelectorAll('.reveal-item');

    /* set initial states */
    if (heading) gsap.set(heading, { clipPath: 'inset(0 0 100% 0)' });
    if (sub)     gsap.set(sub,     { opacity: 0, y: 12 });
    if (items.length) gsap.set(items, { opacity: 0, y: 22 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 82%',
        toggleActions: 'play none none none',
      },
      defaults: { ease: 'power3.out' },
    });

    if (heading) tl.to(heading, { clipPath: 'inset(0 0 0% 0)', duration: 0.8 });
    if (sub)     tl.to(sub,     { opacity: 1, y: 0, duration: 0.65 }, '-=0.4');
    if (items.length) tl.to(items, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.3');
  });

  /* project cards: subtle scale entrance */
  gsap.from('.project-card', {
    scale: 0.95, duration: 0.65, stagger: 0.08, ease: 'power2.out',
    scrollTrigger: { trigger: '.project-grid', start: 'top 88%', toggleActions: 'play none none none' },
  });

  ScrollTrigger.refresh();
})();
