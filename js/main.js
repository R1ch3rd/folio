/* ============================================================
   SHARED HELPERS
   ============================================================ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#';

function scrambleText(el, finalText, duration = 500) {
  if (prefersReducedMotion) { el.textContent = finalText; return; }
  cancelAnimationFrame(el._scr || 0);
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const reveal = Math.floor(p * finalText.length);
    let out = finalText.slice(0, reveal);
    for (let i = reveal; i < finalText.length; i++) {
      out += finalText[i] === ' ' ? ' ' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) el._scr = requestAnimationFrame(step);
    else el.textContent = finalText;
  };
  el._scr = requestAnimationFrame(step);
}

function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('on'), 2200);
}

/* ============================================================
   BOOT SEQUENCE — runs first, failsafe guaranteed
   ============================================================ */
function initBoot() {
  const el = document.getElementById('boot');
  const skip = document.documentElement.dataset.boot === 'skip';
  let finished = false;

  const done = () => {
    if (finished) return;
    finished = true;
    document.body.classList.remove('no-scroll');
    if (el && el.parentNode) {
      el.classList.add('boot-out');
      setTimeout(() => { if (el.parentNode) el.remove(); }, 430);
    }
    window.dispatchEvent(new Event('boot:done'));
  };

  if (!el || skip) {
    if (el) el.remove();
    requestAnimationFrame(() => {
      if (!finished) { finished = true; window.dispatchEvent(new Event('boot:done')); }
    });
    return;
  }

  /* FAILSAFE: no matter what breaks, the overlay dies within 4.5s */
  setTimeout(done, 4500);

  document.body.classList.add('no-scroll');
  try { sessionStorage.setItem('rs-booted', '1'); } catch (e) {}

  const linesEl = el.querySelector('.boot-lines');
  const bar = el.querySelector('.boot-bar-fill');
  const timers = [];

  const LINES = [
    { text: 'RS://BOOT v3.0.0', dim: false },
    { text: '> mounting /research ............... ok', dim: true },
    { text: '> loading neural mesh (52 nodes) ... ok', dim: true },
    { text: '> calibrating adversarial defenses . ok', dim: true },
    { text: '> waking agents .................... ok', dim: true },
    { text: '> tennis reflexes .................. ready', dim: true },
    { text: 'ALL SYSTEMS NOMINAL', dim: false },
  ];

  function decode(div, text, duration) {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const reveal = Math.floor(p * text.length);
      let out = text.slice(0, reveal);
      for (let i = reveal; i < Math.min(text.length, reveal + 3); i++) {
        out += SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      div.textContent = out;
      if (p < 1 && !finished) requestAnimationFrame(step);
      else div.textContent = text;
    };
    requestAnimationFrame(step);
  }

  let t = 200;
  LINES.forEach((ln, i) => {
    timers.push(setTimeout(() => {
      if (finished || !linesEl) return;
      const div = document.createElement('div');
      div.className = 'boot-line' + (ln.dim ? ' dim' : '');
      linesEl.appendChild(div);
      decode(div, ln.text, 220);
      if (bar) bar.style.width = ((i + 1) / LINES.length) * 100 + '%';
      if (i === LINES.length - 1) timers.push(setTimeout(done, 620));
    }, t));
    t += 175 + (i % 3) * 55;
  });

  const skipHandler = (e) => {
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    window.removeEventListener('keydown', skipHandler);
    timers.forEach(clearTimeout);
    done();
  };
  window.addEventListener('keydown', skipHandler);
  el.addEventListener('click', skipHandler);
}

/* ============================================================
   NEURAL NETWORK CANVAS (pointer-aware, terracotta)
   ============================================================ */
function initCanvas() {
  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const NODE_COUNT = 52;
  const MAX_DIST   = 165;
  const CURSOR_DIST = 240;
  const SPEED      = prefersReducedMotion ? 0 : 0.26;
  const LINE_RGB   = '217,119,87';   /* Claude orange, ambient mesh */
  const NODE_RGB   = '176,81,47';    /* deep terracotta, node fill */
  const CURSOR_RGB = '199,90,53';    /* bold accent, cursor links */

  let W, H, nodes = [];
  let px = null, py = null;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeNode() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * SPEED, vy: (Math.random() - 0.5) * SPEED,
      r: 1.4 + Math.random() * 1.4,
    };
  }

  window.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; }, { passive: true });
  window.addEventListener('pointerleave', () => { px = py = null; }, { passive: true });

  function tick() {
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      if (px !== null && !prefersReducedMotion) {
        const dx = px - n.x, dy = py - n.y;
        const d = Math.hypot(dx, dy);
        if (d < CURSOR_DIST && d > 1) {
          n.x += (dx / d) * 0.18;
          n.y += (dy / d) * 0.18;
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(${LINE_RGB},${(1 - d / MAX_DIST) * 0.32})`;
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }
      if (px !== null) {
        const dx = nodes[i].x - px, dy = nodes[i].y - py;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < CURSOR_DIST) {
          const t = 1 - d / CURSOR_DIST;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(px, py);
          ctx.strokeStyle = `rgba(${CURSOR_RGB},${t * 0.85})`;
          ctx.lineWidth = 1.1 + t * 1.1;
          ctx.shadowColor = `rgba(${CURSOR_RGB},0.55)`;
          ctx.shadowBlur = 5;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }

    for (const n of nodes) {
      let alpha = 0.45, radius = n.r;
      if (px !== null) {
        const d = Math.hypot(n.x - px, n.y - py);
        if (d < CURSOR_DIST) {
          const t = 1 - d / CURSOR_DIST;
          alpha = 0.45 + t * 0.5;
          radius = n.r + t * 1.6;
        }
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${NODE_RGB},${alpha})`;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  nodes = Array.from({ length: NODE_COUNT }, makeNode);
  tick();
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */
function initCursor() {
  if (!finePointer || prefersReducedMotion) return;
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  document.body.classList.add('has-cursor');
  let x = -100, y = -100, rx = -100, ry = -100;

  window.addEventListener('pointermove', (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.left = x + 'px';
    dot.style.top  = y + 'px';
  }, { passive: true });

  (function loop() {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  })();

  document.addEventListener('mouseover', (e) => {
    const hit = e.target.closest('a, button, input, .off-tile');
    ring.classList.toggle('big', !!hit);
  });
}

/* ============================================================
   HEADER SCROLL STATE
   ============================================================ */
function initHeader() {
  const header = document.getElementById('site-header');
  if (!header) return;
  const update = () => header.classList.toggle('scrolled', window.scrollY > 60);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ============================================================
   SCROLL-SPY
   ============================================================ */
function initScrollSpy() {
  const sections = document.querySelectorAll('main section[id]');
  const links = document.querySelectorAll('.site-nav a[href^="#"]');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-40% 0px -50% 0px' });

  sections.forEach((s) => obs.observe(s));
}

/* ============================================================
   NAV HOVER SCRAMBLE
   ============================================================ */
function initNavScramble() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('.site-nav a').forEach((link) => {
    const original = link.textContent;
    link.addEventListener('mouseenter', () => scrambleText(link, original, 320));
  });
}

/* ============================================================
   GSAP ANIMATIONS (waits for boot:done)
   ============================================================ */
function initAnimations() {
  if (prefersReducedMotion) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  document.querySelectorAll('.name-line').forEach((line) => {
    const inner = document.createElement('span');
    inner.className = 'name-line-inner';
    inner.textContent = line.textContent;
    line.textContent = '';
    line.appendChild(inner);
  });

  gsap.set('.hero-eyebrow',    { opacity: 0 });
  gsap.set('.name-line-inner', { y: '110%' });
  gsap.set('.hero-tagline',    { opacity: 0, y: 18 });
  gsap.set('.hero-links',      { opacity: 0, y: 12 });
  gsap.set('.scroll-hint',     { opacity: 0 });

  function heroIntro() {
    const eyebrow = document.getElementById('hero-eyebrow');
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero-eyebrow', {
        opacity: 1, duration: 0.4,
        onStart: () => { if (eyebrow) scrambleText(eyebrow, 'AI ENGINEER · BANGALORE, INDIA', 700); },
      })
      .to('.name-line-inner', { y: '0%', duration: 1.0, stagger: 0.12, ease: 'power4.out' }, '-=0.15')
      .to('.hero-tagline', { opacity: 1, y: 0, duration: 0.8 }, '-=0.55')
      .to('.hero-links',   { opacity: 1, y: 0, duration: 0.7 }, '-=0.55')
      .to('.scroll-hint',  { opacity: 1, duration: 0.6 }, '-=0.3');
  }

  let heroPlayed = false;
  const playHero = () => { if (!heroPlayed) { heroPlayed = true; heroIntro(); } };
  window.addEventListener('boot:done', playHero, { once: true });
  setTimeout(playHero, 5000); /* absolute fallback */

  gsap.to('.hero-stage', {
    y: -70, opacity: 0.15, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.4 },
  });

  gsap.to('#neural-canvas', {
    opacity: 0.5, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'bottom 65%', end: 'bottom top', scrub: true },
  });

  document.querySelectorAll('.content-section').forEach((section) => {
    const heading = section.querySelector('.reveal-heading');
    const sub = section.querySelector('.reveal-sub');
    const items = section.querySelectorAll('.reveal-item');

    if (heading) gsap.set(heading, { clipPath: 'inset(0 0 100% 0)' });
    if (sub) gsap.set(sub, { opacity: 0, y: 12 });
    if (items.length) gsap.set(items, { opacity: 0, y: 22 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: 'top 82%', toggleActions: 'play none none none' },
      defaults: { ease: 'power3.out' },
    });

    if (heading) tl.to(heading, { clipPath: 'inset(0 0 0% 0)', duration: 0.8 });
    if (sub) tl.to(sub, { opacity: 1, y: 0, duration: 0.65 }, '-=0.4');
    if (items.length) tl.to(items, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, '-=0.3');
  });

  ScrollTrigger.refresh();
}

/* ============================================================
   RESTORATION DEMO
   ============================================================ */
function initDemo() {
  const frame  = document.getElementById('demo-frame');
  const cClean = document.getElementById('demo-clean');
  const cNoisy = document.getElementById('demo-noisy');
  const slider = document.getElementById('demo-slider');
  const runBtn = document.getElementById('demo-run');
  const seedBtn = document.getElementById('demo-reseed');
  const psnrEl = document.getElementById('demo-psnr-val');
  if (!frame || !cClean || !cNoisy || !slider || !runBtn) return;

  const W = 480, H = 300;
  cClean.width = cNoisy.width = W;
  cClean.height = cNoisy.height = H;
  const xClean = cClean.getContext('2d');
  const xNoisy = cNoisy.getContext('2d');

  let seed = Math.random() * 1000;
  let inputPSNR = 0, outputPSNR = 0;
  let restored = false, running = false;

  function makeNoiseFn(s) {
    const rand = (x, y) => {
      const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const sm = (t) => t * t * (3 - 2 * t);
    const n2 = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const a = rand(xi, yi), b = rand(xi + 1, yi), c = rand(xi, yi + 1), d = rand(xi + 1, yi + 1);
      const u = sm(xf), v = sm(yf);
      return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    };
    return (x, y) => {
      let amp = 1, f = 1, sum = 0, norm = 0;
      for (let o = 0; o < 4; o++) { sum += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.1; }
      return sum / norm;
    };
  }

  function terrainColor(h, shade) {
    let r, g, b;
    if (h < 0.42)      { const t = h / 0.42;        r = 11 + t * 9;  g = 46 + t * 34;  b = 62 + t * 45; }
    else if (h < 0.46) { r = 138; g = 123; b = 82; }
    else if (h < 0.68) { const t = (h - 0.46) / 0.22; r = 34 + t * 28; g = 67 + t * 40;  b = 44 + t * 10; }
    else if (h < 0.82) { r = 107; g = 90; b = 64; }
    else               { r = 147; g = 135; b = 107; }
    return [r * shade, g * shade, b * shade];
  }

  function gauss() {
    return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  }

  function renderScene() {
    const noise = makeNoiseFn(seed);
    const clean = xClean.createImageData(W, H);
    const SCALE = 4.2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = (x / W) * SCALE, ny = (y / H) * SCALE * 0.625;
        const h = noise(nx, ny + 2);
        const hR = noise(nx + 0.02, ny + 2);
        const shade = 0.82 + (h - hR) * 9;
        const [r, g, b] = terrainColor(h, Math.max(0.6, Math.min(1.2, shade)));
        const i = (y * W + x) * 4;
        clean.data[i] = r; clean.data[i + 1] = g; clean.data[i + 2] = b; clean.data[i + 3] = 255;
      }
    }
    xClean.putImageData(clean, 0, 0);

    /* corrupted = clean + clouds + heavy gaussian noise */
    xNoisy.putImageData(clean, 0, 0);
    const rand = (n) => { const v = Math.sin(seed * 91.7 + n * 47.3) * 24634.63; return v - Math.floor(v); };
    for (let c = 0; c < 3; c++) {
      const cx = rand(c) * W, cy = rand(c + 10) * H, cr = 40 + rand(c + 20) * 70;
      const grad = xNoisy.createRadialGradient(cx, cy, 0, cx, cy, cr);
      grad.addColorStop(0, 'rgba(235,238,240,0.85)');
      grad.addColorStop(0.6, 'rgba(225,230,235,0.45)');
      grad.addColorStop(1, 'rgba(220,226,232,0)');
      xNoisy.fillStyle = grad;
      xNoisy.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);
    }
    const noisy = xNoisy.getImageData(0, 0, W, H);
    const SIGMA = 26;
    for (let i = 0; i < noisy.data.length; i += 4) {
      const n = gauss() * SIGMA;
      noisy.data[i]     = Math.max(0, Math.min(255, noisy.data[i] + n));
      noisy.data[i + 1] = Math.max(0, Math.min(255, noisy.data[i + 1] + n));
      noisy.data[i + 2] = Math.max(0, Math.min(255, noisy.data[i + 2] + n));
    }
    xNoisy.putImageData(noisy, 0, 0);

    inputPSNR = computePSNR(clean, noisy);

    /* "restored" = clean + faint residual (concept visualization) */
    const rest = xClean.getImageData(0, 0, W, H);
    for (let i = 0; i < rest.data.length; i += 4) {
      const n = gauss() * 4.5;
      rest.data[i]     = Math.max(0, Math.min(255, rest.data[i] + n));
      rest.data[i + 1] = Math.max(0, Math.min(255, rest.data[i + 1] + n));
      rest.data[i + 2] = Math.max(0, Math.min(255, rest.data[i + 2] + n));
    }
    outputPSNR = computePSNR(clean, rest);
    xClean.putImageData(rest, 0, 0);
  }

  function computePSNR(a, b) {
    let mse = 0;
    const len = a.data.length;
    for (let i = 0; i < len; i += 4) {
      for (let c = 0; c < 3; c++) {
        const d = a.data[i + c] - b.data[i + c];
        mse += d * d;
      }
    }
    mse /= (len / 4) * 3;
    return 10 * Math.log10((255 * 255) / mse);
  }

  function setP(v) {
    frame.style.setProperty('--p', v);
    cNoisy.style.clipPath = `inset(0 0 0 ${v}%)`;
    slider.value = v;
  }

  function reset() {
    restored = false; running = false;
    frame.classList.remove('active', 'done');
    setP(0);
    runBtn.disabled = false;
    runBtn.textContent = 'Run restoration';
    if (psnrEl) psnrEl.textContent = inputPSNR.toFixed(1) + ' dB (input)';
  }

  slider.addEventListener('input', () => {
    if (!restored) { slider.value = 0; return; }
    frame.classList.add('active');
    setP(parseFloat(slider.value));
  });

  runBtn.addEventListener('click', () => {
    if (running || restored) return;
    running = true;
    runBtn.disabled = true;
    runBtn.textContent = 'Restoring…';
    frame.classList.add('active', 'done');

    const state = { v: 0, psnr: inputPSNR };
    const finish = () => {
      restored = true; running = false;
      runBtn.textContent = 'Restored ✓ drag to compare';
      if (psnrEl) psnrEl.textContent = outputPSNR.toFixed(1) + ' dB (+' + (outputPSNR - inputPSNR).toFixed(1) + ')';
    };

    if (typeof gsap !== 'undefined' && !prefersReducedMotion) {
      gsap.to(state, {
        v: 72, psnr: outputPSNR, duration: 1.8, ease: 'power2.inOut',
        onUpdate: () => {
          setP(state.v);
          if (psnrEl) psnrEl.textContent = state.psnr.toFixed(1) + ' dB';
        },
        onComplete: finish,
      });
    } else {
      setP(72);
      finish();
    }
  });

  if (seedBtn) seedBtn.addEventListener('click', () => {
    if (running) return;
    seed = Math.random() * 1000;
    renderScene();
    reset();
  });

  renderScene();
  reset();
}

/* ============================================================
   COMMAND PALETTE
   ============================================================ */
function initPalette() {
  const root = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  const list = document.getElementById('palette-list');
  const chip = document.getElementById('palette-chip');
  const backdrop = document.getElementById('palette-backdrop');
  if (!root || !input || !list) return;

  const go = (sel) => {
    close();
    const target = document.querySelector(sel);
    if (!target) return;
    if (window.__lenis) window.__lenis.scrollTo(target, { offset: -60 });
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  function copyEmail() {
    close();
    const email = 'richysamdom@gmail.com';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => toast('email copied to clipboard'));
    } else {
      toast(email);
    }
  }

  const ITEMS = [
    { label: 'Go to Publications', hint: 'section', act: () => go('#publications') },
    { label: 'Go to Demo', hint: 'section', act: () => go('#demo') },
    { label: 'Go to Projects', hint: 'section', act: () => go('#projects') },
    { label: 'Go to About', hint: 'section', act: () => go('#about') },
    { label: 'Go to Contact', hint: 'section', act: () => go('#contact') },
    { label: 'Open GitHub', hint: 'link', act: () => window.open('https://github.com/R1ch3rd', '_blank') },
    { label: 'Open LinkedIn', hint: 'link', act: () => window.open('https://www.linkedin.com/in/richard-samuel-d/', '_blank') },
    { label: 'Copy email address', hint: 'action', act: copyEmail },
    { label: 'Ask my work anything', hint: 'chat', act: () => { close(); if (window.__openAskMe) window.__openAskMe(); } },
    { label: 'Play tennis (pong)', hint: 'game', act: () => { close(); if (window.__openPong) window.__openPong(); } },
    { label: 'Replay boot sequence', hint: 'system', act: () => { try { sessionStorage.removeItem('rs-booted'); } catch (e) {} location.reload(); } },
  ];

  let filtered = ITEMS, active = 0, open = false;

  function render() {
    list.innerHTML = '';
    filtered.forEach((item, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = i === active ? 'active' : '';
      const label = document.createElement('span');
      label.textContent = item.label;
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = item.hint;
      li.append(label, hint);
      li.addEventListener('click', item.act);
      li.addEventListener('mouseenter', () => { active = i; render(); });
      list.appendChild(li);
    });
  }

  function openPalette() {
    if (open) return;
    open = true;
    root.hidden = false;
    input.value = '';
    filtered = ITEMS; active = 0;
    render();
    input.focus();
    if (window.__lenis) window.__lenis.stop();
  }

  function close() {
    if (!open) return;
    open = false;
    root.hidden = true;
    if (window.__lenis) window.__lenis.start();
  }

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    filtered = ITEMS.filter((i) => i.label.toLowerCase().includes(q));
    active = 0;
    render();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open ? close() : openPalette();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % filtered.length; render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % filtered.length; render(); }
    else if (e.key === 'Enter' && filtered[active]) { filtered[active].act(); }
  });

  if (chip) chip.addEventListener('click', openPalette);
  if (backdrop) backdrop.addEventListener('click', close);
  if (chip && /mac/i.test(navigator.platform)) chip.textContent = '⌘K';
}

/* ============================================================
   PONG — clay court edition
   ============================================================ */
function initPong() {
  const root = document.getElementById('pong');
  const canvas = document.getElementById('pong-canvas');
  if (!root || !canvas) return;
  const ctx = canvas.getContext('2d');

  let raf = 0, open = false;
  let W, H, dpr;
  const P = { w: 12, h: 92 };
  let p1, ai, ball, score1, score2, trail, gameOver, winner;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function serve(dir) {
    ball = {
      x: W / 2, y: H / 2,
      vx: 5.4 * dir,
      vy: (Math.random() - 0.5) * 6,
      r: 8,
    };
    trail = [];
  }

  function startGame() {
    p1 = { y: H / 2 };
    ai = { y: H / 2 };
    score1 = 0; score2 = 0;
    gameOver = false; winner = null;
    serve(Math.random() > 0.5 ? 1 : -1);
  }

  function drawCourt() {
    /* clay court */
    ctx.fillStyle = '#B85C35';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 28);
    ctx.lineTo(W / 2, H - 28);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function loop() {
    drawCourt();

    if (!gameOver) {
      const target = ball.vx > 0 ? ball.y : H / 2;
      const diff = target - ai.y;
      ai.y += Math.max(-4.6, Math.min(4.6, diff * 0.08));

      ball.x += ball.vx;
      ball.y += ball.vy;
      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > 10) trail.shift();

      if (ball.y < 36 + ball.r || ball.y > H - 36 - ball.r) ball.vy *= -1;

      const px = 48;
      if (ball.vx < 0 && ball.x - ball.r < px + P.w && ball.x - ball.r > px &&
          Math.abs(ball.y - p1.y) < P.h / 2 + ball.r) {
        ball.vx = Math.min(14, -ball.vx * 1.06);
        ball.vy = ((ball.y - p1.y) / (P.h / 2)) * 5.5;
      }
      const ax = W - 48 - P.w;
      if (ball.vx > 0 && ball.x + ball.r > ax && ball.x + ball.r < ax + P.w + 12 &&
          Math.abs(ball.y - ai.y) < P.h / 2 + ball.r) {
        ball.vx = Math.max(-14, -ball.vx * 1.06);
        ball.vy = ((ball.y - ai.y) / (P.h / 2)) * 5.5;
      }

      if (ball.x < -20) { score2++; checkWin(); if (!gameOver) serve(1); }
      if (ball.x > W + 20) { score1++; checkWin(); if (!gameOver) serve(-1); }
    }

    trail.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (i / trail.length) * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(223,234,60,${(i / trail.length) * 0.3})`;
      ctx.fill();
    });

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#DFEA3C';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ball.x - 2, ball.y, ball.r * 0.85, -0.9, 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(48, p1.y - P.h / 2, P.w, P.h);
    ctx.fillRect(W - 48 - P.w, ai.y - P.h / 2, P.w, P.h);

    ctx.font = '600 44px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(score1, W / 2 - 70, 84);
    ctx.fillText(score2, W / 2 + 70, 84);

    if (gameOver) {
      ctx.fillStyle = 'rgba(60,30,15,0.78)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 34px "JetBrains Mono", monospace';
      ctx.fillText(winner === 'you' ? 'GAME, SET, MATCH — YOU' : 'THE BOT TAKES IT', W / 2, H / 2 - 24);
      ctx.font = '400 15px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      if (winner === 'you') {
        ctx.fillText('beat the bot? mention "pong" when you email me. instant credibility.', W / 2, H / 2 + 18);
      } else {
        ctx.fillText('the baseline bot shows no mercy. R for a rematch.', W / 2, H / 2 + 18);
      }
      ctx.fillText('tap to exit · R to rematch', W / 2, H / 2 + 52);
    }

    raf = requestAnimationFrame(loop);
  }

  function checkWin() {
    if (score1 >= 5) { gameOver = true; winner = 'you'; }
    if (score2 >= 5) { gameOver = true; winner = 'bot'; }
  }

  function onMove(e) {
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    p1.y = Math.max(36 + P.h / 2, Math.min(H - 36 - P.h / 2, y));
    if (e.touches) e.preventDefault();
  }

  function onKey(e) {
    if (e.key === 'Escape') closePong();
    else if ((e.key === 'r' || e.key === 'R') && gameOver) startGame();
  }

  /* mobile: tapping anywhere once the match is over exits (no keyboard needed) */
  function onPointerUp() {
    if (gameOver) closePong();
  }

  function openPong() {
    if (open) return;
    open = true;
    root.hidden = false;
    document.body.classList.add('no-scroll');
    if (window.__lenis) window.__lenis.stop();
    resize();
    startGame();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerup', onPointerUp);
    loop();
  }

  function closePong() {
    if (!open) return;
    open = false;
    cancelAnimationFrame(raf);
    root.hidden = true;
    document.body.classList.remove('no-scroll');
    if (window.__lenis) window.__lenis.start();
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerup', onPointerUp);
  }

  window.__openPong = openPong;

  const tile = document.getElementById('tile-tennis');
  if (tile) tile.addEventListener('click', openPong);
}

/* ============================================================
   LEGO BRICK BURST
   ============================================================ */
function initLego() {
  const tile = document.getElementById('tile-lego');
  if (!tile || prefersReducedMotion) return;
  const anchor = tile.querySelector('.off-tag') || tile;
  const COLORS = ['#D9453B', '#F2C14E', '#3E7CB1', '#5B8C7E', '#D97757'];

  tile.addEventListener('click', () => {
    const rect = anchor.getBoundingClientRect();
    for (let i = 0; i < 14; i++) {
      const brick = document.createElement('span');
      brick.className = 'lego-brick';
      brick.style.background = COLORS[i % COLORS.length];
      brick.style.left = (rect.width / 2) + 'px';
      brick.style.top = (rect.height / 2) + 'px';
      anchor.appendChild(brick);

      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 40;

      if (typeof gsap !== 'undefined') {
        gsap.to(brick, {
          x: dx, y: dy, rotation: (Math.random() - 0.5) * 540,
          opacity: 0, duration: 0.9 + Math.random() * 0.5, ease: 'power2.out',
          onComplete: () => brick.remove(),
        });
      } else {
        setTimeout(() => brick.remove(), 600);
      }
    }
  });
}

/* ============================================================
   MAGNETIC CONTACT BUTTON
   ============================================================ */
function initMagnet() {
  if (!finePointer || prefersReducedMotion) return;
  if (typeof gsap === 'undefined') return;
  const btn = document.getElementById('contact-magnet');
  if (!btn) return;

  const xTo = gsap.quickTo(btn, 'x', { duration: 0.35, ease: 'power3.out' });
  const yTo = gsap.quickTo(btn, 'y', { duration: 0.35, ease: 'power3.out' });

  const section = btn.closest('.contact');
  if (!section) return;
  section.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d < 160) { xTo(dx * 0.25); yTo(dy * 0.25); }
    else { xTo(0); yTo(0); }
  });
  section.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
}

/* ============================================================
   FOOTER BOOT REPLAY
   ============================================================ */
function initFooterBoot() {
  const btn = document.getElementById('footer-boot');
  if (!btn) return;
  btn.addEventListener('click', () => {
    try { sessionStorage.removeItem('rs-booted'); } catch (e) {}
    location.reload();
  });
}

/* ============================================================
   CONSOLE EASTER EGG
   ============================================================ */
function initConsole() {
  console.log(
    '%cRS %c// you opened the console. respect.\n%cif you want to talk agents, satellites, or pong strategy → richysamdom@gmail.com',
    'font-size:28px;font-weight:700;color:#B0512F;',
    'font-size:12px;color:#6B6759;',
    'font-size:12px;color:#D97757;'
  );
}

/* ============================================================
   ASK-MY-WORK CHAT WIDGET
   Talks to aRAG's public guest endpoint (workspace: portfolio).
   Stateless server-side; history lives in sessionStorage only.
   ============================================================ */
function initAskMe() {
  const API = 'https://zxfxvm0t0b.execute-api.us-east-1.amazonaws.com/prod/guest/chat';
  const fab = document.getElementById('askme-fab');
  const root = document.getElementById('askme');
  const body = document.getElementById('askme-body');
  const intro = document.getElementById('askme-intro');
  const chips = document.getElementById('askme-chips');
  const form = document.getElementById('askme-form');
  const input = document.getElementById('askme-input');
  const sendBtn = document.getElementById('askme-send');
  const closeBtn = document.getElementById('askme-close');
  if (!fab || !root || !body || !form || !input) return;

  let busy = false;

  /* minimal, escape-first markdown: bold, inline code, bullet lists */
  function mdToHtml(text) {
    const esc = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lines = esc.split(/\r?\n/);
    let html = '', inList = false;
    const inline = (s) => s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    for (const line of lines) {
      const li = line.match(/^\s*[*-]\s+(.*)$/);
      if (li) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(li[1]) + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line.trim()) html += '<p>' + inline(line) + '</p>';
      }
    }
    if (inList) html += '</ul>';
    return html || '<p></p>';
  }

  function addMsg(role, content, sources) {
    if (intro && intro.parentNode) intro.remove();
    const div = document.createElement('div');
    div.className = 'askme-msg ' + (role === 'user' ? 'user' : 'bot');
    if (role === 'user') {
      div.textContent = content;
    } else {
      div.innerHTML = mdToHtml(content);
      if (sources && sources.length) {
        const src = document.createElement('div');
        src.className = 'askme-sources';
        src.textContent = 'source: ' + sources.map((s) => s.filename).filter(Boolean).join(', ');
        div.appendChild(src);
      }
    }
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function saveHistory() {
    try {
      const msgs = [...body.querySelectorAll('.askme-msg')].map((m) => ({
        role: m.classList.contains('user') ? 'user' : 'bot',
        html: m.innerHTML,
      }));
      sessionStorage.setItem('askme-history', JSON.stringify(msgs.slice(-20)));
    } catch (e) {}
  }

  function restoreHistory() {
    try {
      const raw = sessionStorage.getItem('askme-history');
      if (!raw) return;
      const msgs = JSON.parse(raw);
      if (!msgs.length) return;
      if (intro && intro.parentNode) intro.remove();
      for (const m of msgs) {
        const div = document.createElement('div');
        div.className = 'askme-msg ' + (m.role === 'user' ? 'user' : 'bot');
        div.innerHTML = m.html;
        body.appendChild(div);
      }
      body.scrollTop = body.scrollHeight;
    } catch (e) {}
  }

  async function ask(question) {
    const message = (question || '').trim();
    if (!message || busy) return;
    busy = true;
    sendBtn.disabled = true;
    input.value = '';
    addMsg('user', message);

    const typing = document.createElement('div');
    typing.className = 'askme-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, workspace: 'portfolio' }),
      });
      const data = await res.json();
      typing.remove();
      if (!res.ok) throw new Error(data && data.error ? data.error : 'Request failed');
      addMsg('bot', data.answer, data.sources);
    } catch (e) {
      typing.remove();
      const err = document.createElement('div');
      err.className = 'askme-error';
      err.textContent = e && e.message === 'Failed to fetch'
        ? 'The assistant was waking up. Ask again, it should answer now.'
        : (e.message || 'Something went wrong. Try again in a moment.');
      body.appendChild(err);
      body.scrollTop = body.scrollHeight;
      setTimeout(() => err.remove(), 6000);
    } finally {
      busy = false;
      sendBtn.disabled = false;
      saveHistory();
      input.focus();
    }
  }

  function openPanel() {
    root.hidden = false;
    fab.classList.add('hidden-by-panel');
    input.focus();
  }

  function closePanel() {
    root.hidden = true;
    fab.classList.remove('hidden-by-panel');
  }

  fab.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden) closePanel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
  });

  if (chips) {
    chips.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) ask(btn.textContent);
    });
  }

  restoreHistory();
  window.__openAskMe = openPanel;
}

/* ============================================================
   BOOTSTRAP — every module isolated; one failure
   can never take down the page
   ============================================================ */
function safe(fn) {
  try { fn(); } catch (e) { console.error('[init:' + fn.name + ']', e); }
}

safe(initBoot);      /* first: guarantees the overlay always clears */
safe(initCanvas);
safe(initCursor);
safe(initHeader);
safe(initScrollSpy);
safe(initNavScramble);
safe(initAnimations);
safe(initDemo);
safe(initPalette);
safe(initPong);
safe(initLego);
safe(initMagnet);
safe(initAskMe);
safe(initFooterBoot);
safe(initConsole);
