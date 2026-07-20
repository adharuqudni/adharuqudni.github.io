/* ══════════════════════════════════════════════
   DOM — framework-free page behavior with no
   external deps, so nav / menu / reveals keep
   working even if a CDN (three, anime) fails.
   ══════════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function buildMarqueeCard(c, hidden = false) {
  const card = document.createElement('div');
  card.className = 'cert-card';
  if (hidden) card.setAttribute('aria-hidden', 'true');
  else card.setAttribute('role', 'listitem');
  card.innerHTML = `
    <img src="${c.logo}" alt="${hidden ? '' : c.issuer}" width="200" height="200"
         loading="lazy" decoding="async" class="cert-logo" onerror="this.style.display='none'" />
    <div>
      <div class="cert-name">${c.name}</div>
      <div class="cert-issuer">${c.issuer}</div>
    </div>`;
  return card;
}

function navBehavior() {
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('nav-mobile-menu');
  if (!navToggle || !mobileMenu) return;

  let lastFocus = null;
  let previousOverflow = '';
  const inertState = new Map();
  const focusables = () => mobileMenu.querySelectorAll('a, button');

  function setPageInert(inert) {
    if (inert) {
      inertState.clear();
      [...document.body.children].forEach(el => {
        if (el === nav || el === mobileMenu || el.tagName === 'SCRIPT') return;
        inertState.set(el, el.inert);
        el.inert = true;
      });
      return;
    }
    inertState.forEach((value, el) => { el.inert = value; });
    inertState.clear();
  }

  function openMenu() {
    lastFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    navToggle.classList.add('open');
    mobileMenu.classList.add('open');
    nav && nav.classList.add('menu-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setPageInert(true);
    const first = focusables()[0];
    if (first) first.focus();
  }
  function closeMenu() {
    navToggle.classList.remove('open');
    mobileMenu.classList.remove('open');
    nav && nav.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = previousOverflow;
    setPageInert(false);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    else navToggle.focus();
  }

  navToggle.addEventListener('click', () => {
    navToggle.classList.contains('open') ? closeMenu() : openMenu();
  });
  mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (!mobileMenu.classList.contains('open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

function revealObserver() {
  const reveals = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => obs.observe(el));
}

function marquee() {
  const a = document.getElementById('marquee');
  const b = document.getElementById('marquee2');
  if (!a || !b) return;
  const split = Math.ceil(CERTS.length / 2);
  const groups = [CERTS.slice(0, split), CERTS.slice(split).reverse()];
  groups[0].forEach(c => a.appendChild(buildMarqueeCard(c)));
  groups[0].forEach(c => a.appendChild(buildMarqueeCard(c, true)));
  groups[1].forEach(c => b.appendChild(buildMarqueeCard(c)));
  groups[1].forEach(c => b.appendChild(buildMarqueeCard(c, true)));
}

/* vanilla counters — dependency-free so numbers land even if anime.js fails */
function counters() {
  function run(el, target, suffix) {
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const dur = 1600, t0 = performance.now();
    (function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        run(e.target, parseInt(e.target.dataset.target), e.target.dataset.suffix || '');
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => obs.observe(el));
}

function backToTop() {
  const backTop = document.getElementById('back-top');
  if (!backTop) return;
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 600);
  }, { passive: true });
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

export function initDom() {
  navBehavior();
  revealObserver();
  marquee();
  counters();
  backToTop();
}
