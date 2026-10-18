(() => {
  'use strict';

  /* Vídeos opcionales: rellena una ruta (p. ej. 'assets/videos/desierto.mp4') y se
     insertará un <video autoplay muted loop playsinline> en esa capa. Vacío = arte procedural. */
  const VIDEOS = { desert: '', wheel: '', road: '', jump: '', wall: '' };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const track = $('.track');
  const scenes = Object.fromEntries($$('[data-scene]').map(el => [el.dataset.scene, el]));
  const layers = Object.fromEntries($$('[data-layer]').map(el => [el.dataset.layer, el]));
  const label = $('#sectionLabel');
  const counter = $('#counter');
  const hero = { car: $('.hero-car'), title: $('.hero-title'), glow: $('.hero .glow'), caps: $$('.hero .cap'), nz: $$('.hero .nz') };
  const s1car = $('.s1-car'), wheel = $('.s1-b .wheel');
  const s2car = $('#s2car'), vBack = $('.vuela-back'), vFront = $('.vuela-front');
  const person = $('.person'), s2bg = $('.s2 .bg');
  const world = $('#world'), wall = $('#wall'), ceiling = $('#ceiling'), s3car = $('#s3car');
  const hud = { dir: $('#hudDir'), inc: $('#hudInc'), g: $('#hudG') };

  const vis = (el, o) => { el.style.opacity = o.toFixed(3); el.style.visibility = o > 0.002 ? 'visible' : 'hidden'; };

  /* ---------- vídeos opcionales ---------- */
  $$('.video-slot').forEach(slot => {
    const src = VIDEOS[slot.dataset.video];
    if (!src) return;
    const v = document.createElement('video');
    Object.assign(v, { src, muted: true, loop: true, autoplay: true, playsInline: true, preload: 'auto' });
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
    v.addEventListener('error', () => v.remove());
    slot.appendChild(v);
    v.play().catch(() => {});
  });

  /* ---------- estrellas ---------- */
  const starCv = $('.stars');
  const sctx = starCv.getContext('2d');
  let stars = [];
  function drawStars(t = 0) {
    const w = starCv.clientWidth, h = starCv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (starCv.width !== w * dpr) { starCv.width = w * dpr; starCv.height = h * dpr; stars = []; }
    if (!stars.length) for (let i = 0; i < 220; i++) stars.push({ x: Math.random(), y: Math.random() * .85, r: Math.random() * 1.1 + .2, a: Math.random() * .6 + .2, f: Math.random() * 6 });
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      sctx.globalAlpha = reduce ? s.a : s.a * (.7 + .3 * Math.sin(t / 900 + s.f));
      sctx.fillStyle = '#fff';
      sctx.beginPath(); sctx.arc(s.x * w, s.y * h, s.r, 0, 6.283); sctx.fill();
    }
  }

  /* ---------- partículas (polvo / humo) ---------- */
  const fx = $('#fx'), fctx = fx.getContext('2d');
  const sprites = {};
  function sprite(rgb) {
    if (sprites[rgb]) return sprites[rgb];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.5, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (sprites[rgb] = c);
  }
  const SAND = '216,160,92', SMOKE = '236,238,242';
  const parts = [];
  let W = 0, H = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = fx.clientWidth; H = fx.clientHeight;
    fx.width = W * dpr; fx.height = H * dpr; fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStars(performance.now());
  }
  function emit(x, y, rgb, size, spread, rise, life) {
    if (reduce || parts.length > 240) return;
    parts.push({ x: x + (Math.random() - .5) * spread, y: y + (Math.random() - .5) * spread * .3, vx: (Math.random() - .5) * 1.4, vy: -Math.random() * rise, s: size * (.6 + Math.random() * .8), l: 0, life: life * (.7 + Math.random() * .6), rgb, g: Math.random() * .02 + .005 });
  }
  function stepParticles() {
    fctx.clearRect(0, 0, W, H);
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.l++; if (q.l > q.life) { parts.splice(i, 1); continue; }
      q.x += q.vx; q.y += q.vy; q.s *= 1 + q.g;
      const k = q.l / q.life, a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * .32;
      fctx.globalAlpha = a;
      fctx.drawImage(sprite(q.rgb), q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
    }
    fctx.globalAlpha = 1;
  }
  const rate = r => { const n = Math.floor(r) + (Math.random() < r % 1 ? 1 : 0); return n; };

  /* ---------- HUD ---------- */
  const HUD_KEYS = [[.76, 0, 0, 1.0], [.82, 100, 58, 1.9], [.9, 69, 180, .8], [.95, 0, 33, .2], [.985, 0, 0, 1.0]];
  function hudAt(p) {
    if (p <= HUD_KEYS[0][0]) return HUD_KEYS[0].slice(1);
    for (let i = 1; i < HUD_KEYS.length; i++) {
      const a = HUD_KEYS[i - 1], b = HUD_KEYS[i];
      if (p <= b[0]) { const t = seg(p, a[0], b[0]); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; }
    }
    return HUD_KEYS.at(-1).slice(1);
  }
  const fmtG = g => g.toFixed(1).replace('.', ',') + ' G';

  /* ---------- render por progreso ---------- */
  let target = 0, cur = 0, labelText = '';
  function readScroll() {
    const max = track.offsetHeight - innerHeight;
    target = max > 0 ? clamp(scrollY / max) : 0;
  }
  function setLabel(t) {
    if (t === labelText) return;
    labelText = t; label.textContent = t;
  }

  function render(p, t) {
    const cx = W / 2;
    /* hero */
    const heroOp = 1 - seg(p, .17, .215);
    vis(scenes.hero, heroOp);
    if (heroOp > 0) {
      const rise = ease(seg(p, 0, .05)), zoom = seg(p, .05, .18);
      hero.car.style.transform = `translateX(-50%) translateY(${(1 - rise) * 14}vh) scale(${1 + zoom * .08})`;
      hero.car.style.opacity = rise.toFixed(3);
      hero.title.style.opacity = (.2 + rise * .8).toFixed(3);
      hero.title.style.transform = `translate(-50%, -50%) scale(${1 + zoom * .06})`;
      const nz = ease(seg(p, .05, .15));
      hero.nz.forEach(n => n.style.setProperty('--nz', nz.toFixed(3)));
      hero.caps.forEach(c => c.style.opacity = (rise * (1 - seg(p, .1, .16))).toFixed(3));
    }

    /* 01 despegue */
    const s1 = seg(p, .2, .25) * (1 - seg(p, .5, .53));
    vis(scenes.s1, s1);
    if (s1 > 0) {
      const a = 1 - seg(p, .36, .4);
      const b = seg(p, .36, .4) * (1 - seg(p, .43, .47));
      const c = seg(p, .43, .47);
      vis(layers.a, a); vis(layers.b, b); vis(layers.c, c);
      const z = ease(seg(p, .22, .37));
      s1car.style.transform = `translateX(-50%) scale(${1 + z * .55}) translateY(${z * 4}%)`;
      scenes.s1.style.setProperty('--haze', (seg(p, .24, .36) * .45).toFixed(3));
      s1car.querySelectorAll('.nz').forEach(n => n.style.setProperty('--nz', ease(seg(p, .22, .3)).toFixed(3)));
      const secs = .65 * ease(seg(p, .23, .37));
      counter.textContent = '00:' + secs.toFixed(2).padStart(5, '0');
      counter.style.opacity = (seg(p, .21, .24) * (1 - seg(p, .41, .44))).toFixed(3);
      $('.s1-lead').style.opacity = (seg(p, .22, .25) * (1 - seg(p, .4, .43))).toFixed(3);
      $('.s1 .cap').style.opacity = (seg(p, .23, .26) * (1 - seg(p, .36, .4))).toFixed(3);
      layers.b.style.setProperty('--rot', (seg(p, .36, .47) * 900) + 'deg');
      layers.b.style.setProperty('--ws', (1 + seg(p, .36, .47) * .22).toFixed(3));
      wheel.style.setProperty('--rot', (seg(p, .36, .47) * 900) + 'deg');
      wheel.style.setProperty('--ws', (1 + seg(p, .36, .47) * .22).toFixed(3));
      layers.c.style.setProperty('--cs', (1.08 + seg(p, .43, .52) * .25).toFixed(3));
      if (p > .25 && p < .37) for (let i = rate(seg(p, .25, .36) * 3); i--;) emit(cx + (Math.random() - .5) * W * .5, H * .82, SAND, W * .22, W * .5, 1.6, 90);
      if (p > .44 && p < .52) for (let i = rate(3); i--;) emit(Math.random() * W, H * (.55 + Math.random() * .4), SAND, W * .3, W * .3, 1.2, 80);
    }

    /* 02 el salto */
    const s2 = seg(p, .49, .53) * (1 - seg(p, .73, .765));
    vis(scenes.s2, s2);
    if (s2 > 0) {
      const sh = Math.sin(t / 60) * 2 * seg(p, .55, .65);
      s2car.style.setProperty('--cy', sh + 'px');
      s2car.style.setProperty('--thr', ease(seg(p, .5, .58)).toFixed(3));
      s2car.querySelectorAll('.thr').forEach(n => n.style.setProperty('--thr', ease(seg(p, .5, .58)).toFixed(3)));
      s2car.style.transform = `translate(-50%, -50%) rotate(-90deg) scale(${1 + seg(p, .52, .7) * .12}) translateY(${sh}px)`;
      s2bg.style.setProperty('--by', (seg(p, .5, .74) * -40) + 'px');
      vFront.style.opacity = (seg(p, .575, .61) * (1 - seg(p, .635, .66))).toFixed(3);
      vFront.style.setProperty('--vs', (1.25 - seg(p, .575, .62) * .25).toFixed(3));
      vBack.style.opacity = (seg(p, .635, .66) * .85 * (1 - seg(p, .7, .735))).toFixed(3);
      vBack.style.setProperty('--vs', '1');
      person.style.setProperty('--pe', (seg(p, .5, .53) * (1 - seg(p, .58, .6))).toFixed(3));
      $('.s2-lead').style.opacity = (seg(p, .52, .55) * (1 - seg(p, .69, .72))).toFixed(3);
      if (p > .52 && p < .73) {
        const k = .5 + seg(p, .55, .64) * 1.4 - seg(p, .66, .72) * 1.4;
        for (let i = rate(k); i--;) emit(cx + (Math.random() < .5 ? -1 : 1) * W * (.16 + Math.random() * .26), H * (.5 + (Math.random() - .5) * .4), SAND, W * .13, W * .1, 1, 80);
      }
    }

    /* limpia partículas de escenas que ya no están activas */
    if (p > .74) for (let i = parts.length - 1; i >= 0; i--) if (parts[i].rgb === SAND) parts.splice(i, 1);
    if (p < .88) for (let i = parts.length - 1; i >= 0; i--) if (parts[i].rgb === SMOKE) parts.splice(i, 1);

    /* 03 la pared */
    const s3 = seg(p, .75, .785);
    vis(scenes.s3, s3);
    if (s3 > 0) {
      const tilt = ease(seg(p, .76, .83));
      wall.style.setProperty('--wx', (60 * (1 - tilt)) + 'deg');
      world.style.setProperty('--wr', (-180 * ease(seg(p, .86, .955))) + 'deg');
      ceiling.style.setProperty('--co', ease(seg(p, .9, .95)).toFixed(3));
      const climb = ease(seg(p, .77, .88));
      const cy = lerp(32, -6, climb) - seg(p, .88, .96) * 0;
      const rot = lerp(0, -14, seg(p, .82, .9)) + lerp(0, 14, seg(p, .9, .96)) + Math.sin(t / 400) * 1.2;
      s3car.style.setProperty('--cy', cy + 'vh');
      s3car.style.setProperty('--cr', rot + 'deg');
      s3car.style.setProperty('--csc', (.45 + tilt * .75 + seg(p, .9, .98) * .15).toFixed(3));
      const [d, inc, g] = hudAt(p);
      hud.dir.textContent = Math.round(d) + ' %';
      hud.inc.textContent = Math.round(inc) + '°';
      hud.g.textContent = fmtG(g);
      hud.dir.classList.toggle('hot', d >= 90);
      hud.inc.classList.toggle('hot', inc >= 170);
      hud.g.classList.toggle('hot', g >= 1.8);
      $('.s3-lead').style.opacity = (seg(p, .77, .8)).toFixed(3);
      $('.s3-small').style.opacity = (seg(p, .79, .82)).toFixed(3);
      if (p > .9) for (let i = rate(seg(p, .9, .95) * 1.6); i--;) emit(cx + (Math.random() < .5 ? -1 : 1) * W * (.1 + Math.random() * .15), H * (.5 + Math.random() * .12), SMOKE, W * .16, W * .22, .8, 90);
      
    }

    setLabel(p < .2 ? '' : p < .495 ? '01 · Despegue' : p < .745 ? '02 · El salto' : '03 · La pared');
  }

  let last = performance.now();
  function frame(now) {
    last = now;
    cur = reduce ? target : lerp(cur, target, .14);
    if (Math.abs(cur - target) < .00004) cur = target;
    render(cur, now);
    stepParticles();
    if (!reduce && scenes.hero.style.visibility !== 'hidden') drawStars(now);
    requestAnimationFrame(frame);
  }

  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', () => { resize(); readScroll(); });
  resize(); readScroll(); cur = target;
  requestAnimationFrame(frame);

  /* ---------- modal de reserva ---------- */
  const dlg = $('#reserve'), form = $('#reserveForm'), status = $('#reserveStatus');
  $$('[data-open-reserve]').forEach(b => b.addEventListener('click', () => { status.textContent = ''; dlg.showModal(); $('input', form).focus(); }));
  $('[data-close-reserve]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const msgs = {
    nombre: v => v.trim().length < 2 ? 'Escribe tu nombre.' : '',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Introduce un correo válido.'
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    for (const name of Object.keys(msgs)) {
      const input = form.elements[name], err = msgs[name](input.value);
      $(`.err[data-for="${name}"]`, form).textContent = err;
      input.setAttribute('aria-invalid', err ? 'true' : 'false');
      if (err) ok = false;
    }
    /* No hay backend conectado: no se simula un envío real. */
    status.textContent = ok ? 'Datos válidos. Aún no hay servidor conectado, por lo que la solicitud no se ha enviado.' : '';
  });
})();
