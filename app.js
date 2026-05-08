// JS-ENABLED MARKER (lets CSS reveal/animation rules opt in)
document.documentElement.classList.add('js');

// REDUCED-MOTION + COARSE-POINTER GUARDS
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// CURSOR (skip on touch devices and when reduced-motion is requested)
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursor-ring');
if (cursor && ring && !reduceMotion && !coarsePointer) {
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });
  (function animRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animRing);
  })();
}

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
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const first = focusables()[0];
    if (first) first.focus();
  }
  function closeMenu() {
    navToggle.classList.remove('open');
    mobileMenu.classList.remove('open');
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

// AJN INTRO
const ajnSections = document.querySelectorAll('[data-ajn]');
const ajnIntroObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.15 });
ajnSections.forEach(el => ajnIntroObs.observe(el));

// CINEMATIC HORIZONTAL TIMELINE
(function() {
  const stage    = document.getElementById('ajn-stage');
  const track    = document.getElementById('ajn-track');
  const progress = document.getElementById('ajn-progress');
  const lbl      = document.getElementById('ajn-chapter-lbl');
  const counter  = document.getElementById('ajn-counter');
  const fill     = document.getElementById('ajn-fill');
  if (!stage || !track) return;

  const slides  = Array.from(track.querySelectorAll('.ajn-slide'));
  const dots    = progress ? Array.from(progress.querySelectorAll('.ajn-dot')) : [];
  const names   = ['Samsung R&D', 'tiket.com', 'decorps', 'PT Elnusa Tbk', 'PT Agni'];
  const N       = slides.length;
  let lastIdx   = -1, raf = false;

  // Make every slide visible up-front when reduced-motion is requested
  if (reduceMotion) {
    slides.forEach(s => s.classList.add('s-active'));
  }

  // Dot buttons → scroll to the matching chapter
  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 1024px)').matches || reduceMotion) {
        slides[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        return;
      }
      const total  = stage.offsetHeight - window.innerHeight;
      const target = stage.offsetTop + (i / Math.max(1, N - 1)) * total;
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
  });

  function update() {
    raf = false;
    if (window.matchMedia('(max-width: 1024px)').matches || reduceMotion) {
      track.style.transform = '';
      return;
    }
    const rect     = stage.getBoundingClientRect();
    const vh       = window.innerHeight;
    const total    = stage.offsetHeight - vh;
    const scrolled = Math.min(total, Math.max(0, -rect.top));
    const p01      = total > 0 ? scrolled / total : 0;
    const shift    = p01 * (N - 1) * window.innerWidth;

    track.style.transform = `translate3d(${-shift}px,0,0)`;

    if (fill) fill.style.width = (p01 * 100) + '%';

    const idx = Math.min(N - 1, Math.round(p01 * (N - 1)));
    if (idx !== lastIdx) {
      lastIdx = idx;

      dots.forEach((d, i) => {
        d.classList.toggle('active',  i === idx);
        d.classList.toggle('passed',  i < idx);
      });

      if (lbl) {
        const nameEl = lbl.querySelector('.name');
        const numEl  = lbl.querySelector('.r');
        if (nameEl) {
          nameEl.style.opacity = '0';
          nameEl.style.transform = 'translateY(-8px)';
          setTimeout(() => {
            nameEl.textContent = names[idx];
            nameEl.style.opacity = '';
            nameEl.style.transform = '';
          }, 180);
        }
        if (numEl) numEl.textContent = String(idx + 1).padStart(2, '0');
      }

      if (counter) counter.textContent = `${String(idx + 1).padStart(2,'0')} / ${String(N).padStart(2,'0')}`;

      slides.forEach((s, i) => s.classList.toggle('s-active', i === idx));
    }
  }

  window.addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);

  update();
  slides[0].classList.add('s-active');
})();

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
[...CERTS, ...CERTS].forEach(c => marqEl.appendChild(buildMarqueeCard(c)));
const certsRev = [...CERTS].reverse();
[...certsRev, ...certsRev].forEach(c => marqEl2.appendChild(buildMarqueeCard(c)));

// COUNTERS
function animCounter(el, target, suffix) {
  if (reduceMotion) {
    el.innerHTML = target + `<sup>${suffix}</sup>`;
    return;
  }
  let start = 0;
  const dur = 1800, t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    const v = Math.round(start + (target - start) * e);
    el.innerHTML = v + `<sup>${suffix}</sup>`;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}
const ctrObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      const target = parseInt(e.target.dataset.target);
      const suffix = e.target.dataset.suffix || '';
      animCounter(e.target, target, suffix);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-target]').forEach(el => ctrObs.observe(el));

// HERO PARALLAX (disabled when user prefers reduced motion)
if (!reduceMotion) {
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const img = document.querySelector('.hero-img-container');
    if (img) img.style.transform = `translateY(${y * 0.04}px)`;
  }, { passive: true });
}

// ACTIVE NAV LINK
const navAnchors = document.querySelectorAll('.nav-links a');
const sections = ['about','experience','skills','projects','contact'].map(id => document.getElementById(id)).filter(Boolean);
window.addEventListener('scroll', () => {
  const y = window.scrollY + 120;
  let current = sections[0];
  sections.forEach(s => { if (s.offsetTop <= y) current = s; });
  navAnchors.forEach(a => {
    a.style.color = '';
    if (a.getAttribute('href') === '#' + (current ? current.id : '')) {
      a.style.color = 'var(--ink)';
    }
  });
}, { passive: true });
