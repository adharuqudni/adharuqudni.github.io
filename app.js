// JS-ENABLED MARKER (lets CSS reveal/animation rules opt in)
document.documentElement.classList.add('js');

// REDUCED-MOTION GUARD
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// NAV SCROLL
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// HAMBURGER MENU — accessible: Escape closes, focus is trapped while open,
// focus returns to the toggle on close.
const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('nav-mobile-menu');
if (navToggle && mobileMenu) {
  let lastFocus = null;
  const focusables = () => mobileMenu.querySelectorAll('a, button');

  function openMenu() {
    lastFocus = document.activeElement;
    navToggle.classList.add('open');
    mobileMenu.classList.add('open');
    nav.classList.add('menu-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const first = focusables()[0];
    if (first) first.focus();
  }
  function closeMenu() {
    navToggle.classList.remove('open');
    mobileMenu.classList.remove('open');
    nav.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    } else {
      navToggle.focus();
    }
  }

  navToggle.addEventListener('click', () => {
    if (navToggle.classList.contains('open')) closeMenu();
    else openMenu();
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => {
    if (!mobileMenu.classList.contains('open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last  = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

// REVEAL
const reveals = document.querySelectorAll('.reveal');
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
reveals.forEach(el => revObs.observe(el));

// CERTS MARQUEE
const CERTS = [
  { logo: 'static/linkedin_logo.png',   name: 'Android Dev with Kotlin',            issuer: 'LinkedIn · Mar 2026' },
  { logo: 'static/linkedin_logo.png',   name: 'Spring Boot 2.0 Essential Training', issuer: 'LinkedIn · Feb 2026' },
  { logo: 'static/sanbercode-logo.jpeg',name: 'Python — Data Science',              issuer: 'SanberCode · Sep 2021' },
  { logo: 'static/sanbercode-logo.jpeg',name: 'Javascript & NodeJS Bootcamp',       issuer: 'SanberCode · Feb 2021' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Managing Cloud Infra w/ Terraform',  issuer: 'Qwiklabs · Mar 2021' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Anthos: Service Mesh',              issuer: 'Qwiklabs · Mar 2021' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Build Apps & Websites w/ Firebase', issuer: 'Qwiklabs · Mar 2021' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Serverless Firebase Development',   issuer: 'Qwiklabs · Mar 2021' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Kubernetes in Google Cloud',        issuer: 'Qwiklabs · Dec 2019' },
  { logo: 'static/qwiklabs-logo.jpeg',  name: 'Google Cloud Essentials',           issuer: 'Qwiklabs · Nov 2019' },
  { logo: 'static/dicoding_logo.png',   name: 'Memulai Pemrograman Dengan Python', issuer: 'Dicoding · Oct 2020' },
  { logo: 'static/progate_logo.png',    name: 'Path Pengembangan Web (Node.js)',   issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus SQL',                        issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus React',                      issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus Node.JS',                    issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus HTML & CSS',                 issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus GIT',                        issuer: 'Progate · Jun 2020' },
  { logo: 'static/progate_logo.png',    name: 'Kursus JavaScript',                 issuer: 'Progate · Jun 2020' },
];
function buildMarqueeCard(c) {
  const card = document.createElement('div');
  card.className = 'cert-card';
  card.innerHTML = `
    <img src="${c.logo}" alt="${c.issuer}" class="cert-logo"
      onerror="this.style.display='none'" />
    <div>
      <div class="cert-name">${c.name}</div>
      <div class="cert-issuer">${c.issuer}</div>
    </div>
  `;
  return card;
}

const marqEl = document.getElementById('marquee');
const marqEl2 = document.getElementById('marquee2');
if (marqEl && marqEl2) {
  [...CERTS, ...CERTS].forEach(c => marqEl.appendChild(buildMarqueeCard(c)));
  const certsRev = [...CERTS].reverse();
  [...certsRev, ...certsRev].forEach(c => marqEl2.appendChild(buildMarqueeCard(c)));
}

// COUNTERS
function animCounter(el, target, suffix) {
  if (reduceMotion) {
    el.textContent = target + suffix;
    return;
  }
  const dur = 1600, t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}
const ctrObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      animCounter(e.target, parseInt(e.target.dataset.target), e.target.dataset.suffix || '');
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => ctrObs.observe(el));

// BACK TO TOP
const backTop = document.getElementById('back-top');
if (backTop) {
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

// ══════════════════════════════════════════════
// LOTTIE — hand-authored cartoon animations
// (spinning star badge + bouncy scroll arrow)
// ══════════════════════════════════════════════
(function () {
  if (reduceMotion || typeof lottie === 'undefined') return;

  const YELLOW = [1, 0.788, 0.235, 1];   // #FFC93C
  const INK    = [0.137, 0.137, 0.231, 1]; // #23233B
  const lin = { i: { x: [0.45], y: [1] }, o: { x: [0.45], y: [0] } };

  // — 4-point star, spinning with a gentle pulse —
  const starData = {
    v: '5.7.4', fr: 30, ip: 0, op: 120, w: 32, h: 32, nm: 'star', ddd: 0, assets: [],
    layers: [{
      ddd: 0, ind: 1, ty: 4, sr: 1, ao: 0, ip: 0, op: 120, st: 0, bm: 0,
      ks: {
        p: { a: 0, k: [16, 16] }, a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100], e: [115, 115], ...lin }, { t: 60, s: [115, 115], e: [100, 100], ...lin }, { t: 120 }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360], i: { x: [0.6], y: [1] }, o: { x: [0.4], y: [0] } }, { t: 120 }] },
        o: { a: 0, k: 100 },
      },
      shapes: [{
        ty: 'gr',
        it: [
          {
            ty: 'sh',
            ks: { a: 0, k: {
              c: true,
              v: [[0, -12], [3, -3], [12, 0], [3, 3], [0, 12], [-3, 3], [-12, 0], [-3, -3]],
              i: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
              o: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
            } },
          },
          { ty: 'fl', c: { a: 0, k: YELLOW }, o: { a: 0, k: 100 } },
          { ty: 'st', c: { a: 0, k: INK }, o: { a: 0, k: 100 }, w: { a: 0, k: 2.5 }, lc: 2, lj: 2 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      }],
    }],
  };

  // — chunky chevrons bouncing downward —
  const chevron = (oKeys, pKeys) => ({
    ddd: 0, ind: 1, ty: 4, sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
    ks: {
      p: { a: 1, k: pKeys },
      a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: oKeys },
    },
    shapes: [{
      ty: 'gr',
      it: [
        {
          ty: 'sh',
          ks: { a: 0, k: { c: false, v: [[-8, -3.5], [0, 4.5], [8, -3.5]], i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]] } },
        },
        { ty: 'st', c: { a: 0, k: INK }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 }, lc: 2, lj: 2 },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    }],
  });
  const scrollData = {
    v: '5.7.4', fr: 30, ip: 0, op: 60, w: 46, h: 46, nm: 'scroll', ddd: 0, assets: [],
    layers: [
      chevron(
        [{ t: 0, s: [0], e: [95], ...lin }, { t: 10, s: [95], e: [0], ...lin }, { t: 45 }],
        [{ t: 0, s: [23, 12], e: [23, 32], ...lin }, { t: 45 }]
      ),
      chevron(
        [{ t: 15, s: [0], e: [95], ...lin }, { t: 25, s: [95], e: [0], ...lin }, { t: 60 }],
        [{ t: 15, s: [23, 12], e: [23, 32], ...lin }, { t: 60 }]
      ),
    ],
  };

  const mount = (id, data) => {
    const el = document.getElementById(id);
    if (!el) return;
    lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: data,
    });
  };
  mount('lottie-star', starData);
  mount('lottie-scroll', scrollData);
})();
