/* ══════════════════════════════════════════════
   3D LAYER — Three.js, cartoon edition
   Hero:    cel-shaded floating toys (toon material
            + fat black outlines) bobbing around the title
   Contact: toon planet with a ring and an orbiting moon
   ══════════════════════════════════════════════ */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

const INK = 0x23233b;
const COLORS = {
  yellow: 0xffc93c,
  pink:   0xff6b97,
  coral:  0xff5d5d,
  blue:   0x5ba8ff,
  green:  0x53d387,
  purple: 0xa78bfa,
};

/* three-step gradient map = chunky cel shading */
function makeGradientMap() {
  const tex = new THREE.DataTexture(new Uint8Array([90, 180, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}
const gradientMap = makeGradientMap();

/* toon mesh + inflated back-face shell = cartoon outline */
function makeToon(geometry, color, outline = 0.08) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    geometry,
    new THREE.MeshToonMaterial({ color, gradientMap })
  ));
  const shell = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  );
  shell.scale.setScalar(1 + outline);
  group.add(shell);
  return group;
}

function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 10, 8);
  scene.add(sun);
}

/* ────────────────────────────────────────────
   HERO — floating toys
   ──────────────────────────────────────────── */
const heroCanvas = document.getElementById('hero-canvas');
let heroRenderer, heroScene, heroCamera, toys = [], heroVisible = true;
let mouseX = 0, mouseY = 0;

function initHero() {
  if (!heroCanvas) return;
  const host = heroCanvas.parentElement;

  heroRenderer = new THREE.WebGLRenderer({ canvas: heroCanvas, alpha: true, antialias: true });
  heroRenderer.setPixelRatio(DPR);
  heroRenderer.setSize(host.clientWidth, host.clientHeight);

  heroScene = new THREE.Scene();
  heroCamera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 100);
  heroCamera.position.set(0, 0, 24);
  addLights(heroScene);

  const X = isMobile ? 0.42 : 1; // squeeze toward edges on small screens
  const defs = [
    { geo: new THREE.TorusGeometry(2.4, 1.05, 24, 48),         color: COLORS.pink,   pos: [-16 * X,  5.5, -6], spin: 0.35, bob: 1.0 },
    { geo: new THREE.SphereGeometry(2.0, 32, 24),              color: COLORS.yellow, pos: [ 15 * X,  7.0, -5], spin: 0.20, bob: 1.4 },
    { geo: new THREE.ConeGeometry(1.9, 3.4, 24),               color: COLORS.green,  pos: [-13 * X, -7.5, -5], spin: 0.45, bob: 0.8 },
    { geo: new THREE.TorusKnotGeometry(1.5, 0.5, 90, 12),      color: COLORS.purple, pos: [ 16 * X, -6.0, -7], spin: 0.30, bob: 1.2 },
    { geo: new THREE.OctahedronGeometry(1.7, 0),               color: COLORS.blue,   pos: [  9 * X, 11.5, -9], spin: 0.55, bob: 0.9 },
    { geo: new THREE.SphereGeometry(1.0, 24, 18),              color: COLORS.coral,  pos: [ -8 * X, 12.0, -8], spin: 0.25, bob: 1.6 },
  ];
  defs.forEach((d, i) => {
    const toy = makeToon(d.geo, d.color, 0.07);
    toy.position.set(...d.pos);
    toy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    toy.userData = { baseY: d.pos[1], spin: d.spin, bob: d.bob, phase: i * 1.7 };
    toys.push(toy);
    heroScene.add(toy);
  });

  new IntersectionObserver(entries => {
    entries.forEach(e => { heroVisible = e.isIntersecting; });
  }, { threshold: 0.02 }).observe(host);
}

/* ────────────────────────────────────────────
   CONTACT — toon planet
   ──────────────────────────────────────────── */
const contactCanvas = document.getElementById('contact-canvas');
let cRenderer, cScene, cCamera, planetGroup, moonPivot, contactVisible = false;

function initPlanet() {
  if (!contactCanvas) return;
  const host = contactCanvas.parentElement;

  cRenderer = new THREE.WebGLRenderer({ canvas: contactCanvas, alpha: true, antialias: true });
  cRenderer.setPixelRatio(DPR);
  cRenderer.setSize(host.clientWidth, host.clientHeight);

  cScene = new THREE.Scene();
  cCamera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 100);
  cCamera.position.set(0, 0, 24);
  addLights(cScene);

  planetGroup = new THREE.Group();
  planetGroup.add(makeToon(new THREE.SphereGeometry(4.6, 32, 24), COLORS.blue, 0.05));

  const ring = makeToon(new THREE.TorusGeometry(7.2, 0.5, 16, 64), COLORS.yellow, 0.12);
  ring.rotation.x = Math.PI / 2.4;
  ring.rotation.y = 0.15;
  planetGroup.add(ring);

  moonPivot = new THREE.Group();
  const moon = makeToon(new THREE.SphereGeometry(0.9, 20, 16), COLORS.pink, 0.1);
  moon.position.set(9.5, 1.2, 0);
  moonPivot.add(moon);
  planetGroup.add(moonPivot);

  planetGroup.position.set(isMobile ? 0 : 11.5, isMobile ? -10 : -3.5, -4);
  planetGroup.rotation.z = -0.12;
  cScene.add(planetGroup);

  new IntersectionObserver(entries => {
    entries.forEach(e => { contactVisible = e.isIntersecting; });
  }, { threshold: 0.05 }).observe(host);
}

/* ────────────────────────────────────────────
   LOOP
   ──────────────────────────────────────────── */
let rafId = null;

function tick(t) {
  rafId = requestAnimationFrame(tick);
  const s = t * 0.001;

  if (heroRenderer && heroVisible) {
    toys.forEach(toy => {
      const u = toy.userData;
      toy.position.y = u.baseY + Math.sin(s * u.bob + u.phase) * 0.7;
      toy.rotation.x += u.spin * 0.004;
      toy.rotation.y += u.spin * 0.006;
    });
    heroCamera.position.x += (mouseX * 1.6 - heroCamera.position.x) * 0.04;
    heroCamera.position.y += (-mouseY * 1.0 - heroCamera.position.y) * 0.04;
    heroCamera.lookAt(0, 0, 0);
    heroRenderer.render(heroScene, heroCamera);
  }

  if (cRenderer && contactVisible) {
    planetGroup.rotation.y = s * 0.25;
    moonPivot.rotation.y = s * 0.6;
    cRenderer.render(cScene, cCamera);
  }
}

function renderOnce() {
  if (heroRenderer) heroRenderer.render(heroScene, heroCamera);
  if (cRenderer) cRenderer.render(cScene, cCamera);
}

/* ────────────────────────────────────────────
   BOOT
   ──────────────────────────────────────────── */
try {
  initHero();
  initPlanet();

  if (reduceMotion) {
    contactVisible = true;
    renderOnce();
  } else {
    rafId = requestAnimationFrame(tick);

    document.addEventListener('mousemove', e => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }
    });
  }

  window.addEventListener('resize', () => {
    if (heroRenderer) {
      const host = heroCanvas.parentElement;
      heroCamera.aspect = host.clientWidth / host.clientHeight;
      heroCamera.updateProjectionMatrix();
      heroRenderer.setSize(host.clientWidth, host.clientHeight);
    }
    if (cRenderer) {
      const host = contactCanvas.parentElement;
      cCamera.aspect = host.clientWidth / host.clientHeight;
      cCamera.updateProjectionMatrix();
      cRenderer.setSize(host.clientWidth, host.clientHeight);
    }
    if (reduceMotion) renderOnce();
  });
} catch (err) {
  // WebGL unavailable — the site works fine without the 3D layer
  console.warn('3D layer disabled:', err);
}
