/* ══════════════════════════════════════════════
   3D BOOT — owns every scene + the single rAF loop.
   Scenes render only while their section is on-screen.
   Also owns: live perf stats (for the HUD) and the
   in-page motion switch (pause loop + static frame).
   Whole layer is try/catch: no WebGL → site still works.
   ══════════════════════════════════════════════ */
import { createHeroBg } from './hero-bg.js';
import { createHero } from './hero.js';
import { createJourney } from './journey.js';
import { createPlanet } from './planet.js';
import { initParticles, updateParticles, burst } from './particles.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const compactViewport = window.matchMedia('(max-width: 640px)').matches;
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const constrainedMobile = compactViewport && (
  connection?.saveData === true ||
  (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
);

export function initThree({ onFlagClick, game, sfx } = {}) {
  let heroBg = null, hero = null, journey = null, planet = null, particlesOn = false;
  const stats = { fps: 0, calls: 0, tris: 0 };

  try {
    const heroBgCanvas = document.getElementById('hero-bg-canvas');
    const heroCanvas = document.getElementById('hero-canvas');
    const journeyCanvas = document.getElementById('journey-canvas');
    const journeyStage = document.getElementById('journey-stage');
    const contactCanvas = document.getElementById('contact-canvas');

    particlesOn = initParticles();
    const grabFx = (x, y) => burst(x, y, 10);

    if (heroBgCanvas) {
      heroBg = createHeroBg(heroBgCanvas);
      observe(heroBgCanvas.parentElement, v => { heroBg.visible = v; }, 0.02);
    }
    if (heroCanvas) {
      hero = createHero(heroCanvas, grabFx);
      observe(heroCanvas.parentElement, v => { hero.visible = v; }, 0.02);
    }
    if (journeyCanvas && journeyStage && !constrainedMobile) {
      const ui = {
        card: document.getElementById('journey-card'),
        level: document.getElementById('journey-level'),
        xpFill: document.querySelector('#journey-xpbar i'),
        xpLabel: document.querySelector('#journey-xpbar .jxp-lv'),
        coins: document.getElementById('journey-coins'),
        flags: document.getElementById('journey-flags'),
        fs: document.getElementById('journey-fs'),
        dpad: [...journeyStage.querySelectorAll('.play-dpad button, .play-jump')],
      };
      journey = createJourney(journeyCanvas, journeyStage, ui, { game, sfx, burst, onFlagClick });
      if (journey) observe(journeyStage, v => journey.setVisible(v), 0.15);
      else journeyStage.classList.add('no-3d');
    } else if (journeyStage) {
      journeyStage.classList.add('no-3d');
      journeyStage.hidden = true;
    }
    if (contactCanvas) {
      planet = createPlanet(contactCanvas);
      observe(contactCanvas.parentElement, v => { planet.visible = v; }, 0.05);
    }
  } catch (err) {
    console.warn('3D layer disabled:', err);
    return { burst: () => {}, stats, setMotion: () => {} };
  }

  const scenes = [heroBg, hero, journey, planet].filter(Boolean);
  const renderers = scenes.map(s => s.renderer);

  // ── loop ──
  let rafId = null, lastT = 0, slowFrames = 0, dprDropped = false;
  let motionOn = !reduceMotion;

  function perfGuard(delta) {
    if (dprDropped) return;
    if (delta > 0.034) slowFrames++;
    if (slowFrames > 90) {
      dprDropped = true;
      renderers.forEach(r => r && r.setPixelRatio(1));
    }
  }

  function tick(t) {
    rafId = requestAnimationFrame(tick);
    const s = t * 0.001;
    const dt = Math.min(s - lastT, 0.1) || 0.016;
    lastT = s;
    perfGuard(dt);

    if (heroBg && heroBg.visible) heroBg.update(s, dt);
    if (hero && hero.visible) hero.update(s, dt);
    if (journey && journey.visible) journey.update(s, dt);
    if (planet && planet.visible) planet.update(s, dt);
    if (particlesOn) updateParticles(dt);

    // live stats for the HUD
    stats.fps += (1 / dt - stats.fps) * 0.1;
    let calls = 0, tris = 0;
    renderers.forEach(r => { if (r) { calls += r.info.render.calls; tris += r.info.render.triangles; } });
    stats.calls = calls; stats.tris = tris;
  }

  function renderStaticAll() {
    heroBg && heroBg.renderStatic();
    hero && hero.update(0, 0.016);
    journey && journey.renderStatic();
    if (planet) { planet.visible = true; planet.renderStatic(); }
  }

  function start() { if (!rafId) { lastT = performance.now() * 0.001; rafId = requestAnimationFrame(tick); } }
  function stop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  if (reduceMotion) {
    renderStaticAll();
  } else {
    start();
    document.addEventListener('visibilitychange', () => {
      if (!motionOn) return;
      document.hidden ? stop() : start();
    });
  }

  window.addEventListener('resize', () => {
    scenes.forEach(s => s.resize && s.resize());
    if (!motionOn) renderStaticAll();
  });

  function setMotion(on) {
    motionOn = on;
    document.documentElement.classList.toggle('motion-off', !on);
    if (on) { start(); }
    else { stop(); renderStaticAll(); }
  }

  return { burst, stats, setMotion, get motionOn() { return motionOn; } };
}

function observe(el, cb, threshold) {
  if (!el) return;
  new IntersectionObserver(entries => {
    entries.forEach(e => cb(e.isIntersecting));
  }, { threshold }).observe(el);
}
