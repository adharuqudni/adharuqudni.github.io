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
let heroRenderer, heroScene, heroCamera, toys = [], heroToken, heroVisible = true;
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

  /* cursor-reactive hero token — damped rotation, never snaps (refine.md §3) */
  heroToken = makeToon(new THREE.IcosahedronGeometry(2.1, 0), COLORS.yellow, 0.06);
  heroToken.position.set(isMobile ? 0 : 11, isMobile ? 13.5 : 2.5, -1);
  heroToken.userData.baseY = heroToken.position.y;
  heroScene.add(heroToken);

  new IntersectionObserver(entries => {
    entries.forEach(e => { heroVisible = e.isIntersecting; });
  }, { threshold: 0.02 }).observe(host);
}

/* ────────────────────────────────────────────
   JOURNEY — scroll-driven quest map
   Camera walks a low-poly path past 5 flag
   checkpoints as the journey section scrolls.
   ──────────────────────────────────────────── */
const questCanvas = document.getElementById('journey-canvas');
const questHost = document.getElementById('journey');
const lowGPU = (navigator.hardwareConcurrency || 8) <= 4;
let qRenderer, qScene, qCamera, qFlags = [], qClouds = [], questVisible = false;
let qGroundCurve, qCamCurve, qU = 0;
const qLook = new THREE.Vector3();

/* little toon flag: base disc + pole + pennant */
function makeFlag(color) {
  const g = new THREE.Group();

  const base = makeToon(new THREE.CylinderGeometry(0.55, 0.75, 0.32, 10), 0xfff4dc, 0.06);
  base.position.y = 0.16;
  g.add(base);

  const pole = makeToon(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 8), INK, 0.03);
  pole.position.y = 1.3;
  g.add(pole);

  const tri = new THREE.Shape();
  tri.moveTo(0, 0);
  tri.lineTo(1.15, -0.38);
  tri.lineTo(0, -0.76);
  tri.closePath();
  const pennant = makeToon(
    new THREE.ExtrudeGeometry(tri, { depth: 0.06, bevelEnabled: false }),
    color, 0.04
  );
  pennant.position.set(0.05, 2.42, -0.03);
  g.add(pennant);

  return g;
}

function makeCloud() {
  const g = new THREE.Group();
  [[0, 0, 0, 1.0], [0.9, 0.15, 0.1, 0.7], [-0.85, 0.1, -0.1, 0.65]].forEach(([x, y, z, r]) => {
    const puff = makeToon(new THREE.SphereGeometry(r, 18, 14), 0xffffff, 0.05);
    puff.position.set(x, y, z);
    g.add(puff);
  });
  return g;
}

function initQuest() {
  if (!questCanvas || !questHost) return;
  if (isMobile && lowGPU) return;   // static fallback: DOM cards stand alone

  qRenderer = new THREE.WebGLRenderer({ canvas: questCanvas, alpha: true, antialias: false });
  qRenderer.setPixelRatio(DPR);
  qRenderer.setSize(window.innerWidth, window.innerHeight);

  qScene = new THREE.Scene();
  qScene.fog = new THREE.Fog(0xfff4dc, 12, 34);   // fade to paper cream
  qCamera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  addLights(qScene);

  /* ground path — one bend per journey beat */
  const groundPts = [
    new THREE.Vector3(   0, 0,   8),  // start
    new THREE.Vector3(   5, 0,   0),  // 01 Samsung
    new THREE.Vector3(-4.5, 0,  -7),  // 02 tiket
    new THREE.Vector3( 4.5, 0, -14),  // 03 decorps
    new THREE.Vector3(  -5, 0, -21),  // 04 Elnusa
    new THREE.Vector3(   0, 0, -28),  // 05 Agni
  ];
  qGroundCurve = new THREE.CatmullRomCurve3(groundPts);
  qCamCurve = new THREE.CatmullRomCurve3(
    groundPts.map(p => p.clone().add(new THREE.Vector3(0, 3.6, 6.5)))
  );

  /* dashed dot trail along the path */
  const dotGeo = new THREE.SphereGeometry(0.1, 8, 6);
  const dotMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.4 });
  for (let i = 0; i <= 90; i += 2) {
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(qGroundCurve.getPointAt(i / 90));
    dot.position.y = 0.05;
    qScene.add(dot);
  }

  /* checkpoint flags — colors match the timeline pills */
  const stops = [
    { u: 0.16, color: COLORS.green  },  // 01 Samsung  · NOW
    { u: 0.37, color: COLORS.blue   },  // 02 tiket
    { u: 0.58, color: COLORS.purple },  // 03 decorps  · FOUNDER
    { u: 0.79, color: COLORS.yellow },  // 04 Elnusa   · GOLD
    { u: 0.97, color: COLORS.pink   },  // 05 Agni
  ];
  stops.forEach((s, i) => {
    const flag = makeFlag(s.color);
    const p = qGroundCurve.getPointAt(s.u);
    flag.position.copy(p);
    flag.position.x += (i % 2 ? -3.2 : 3.2);   // step aside so the camera passes by
    flag.scale.setScalar(0.001);               // pops in as the camera arrives
    flag.userData.u = s.u;
    qFlags.push(flag);
    qScene.add(flag);
  });

  /* drifting clouds for depth */
  [[-7, 5, -3, 0.4], [8, 6, -11, 0.25], [-8, 4.5, -18, 0.3], [7, 5.5, -25, 0.35]]
    .forEach(([x, y, z, speed], i) => {
      const cloud = makeCloud();
      cloud.position.set(x, y, z);
      cloud.userData = { baseX: x, speed, phase: i * 2.1 };
      qClouds.push(cloud);
      qScene.add(cloud);
    });

  new IntersectionObserver(entries => {
    entries.forEach(e => {
      questVisible = e.isIntersecting;
      questCanvas.classList.toggle('on', e.isIntersecting);
      if (reduceMotion && e.isIntersecting) renderQuestStatic();
    });
  }, { threshold: 0.02 }).observe(questHost);
}

/* section scroll progress 0..1 → position along the path */
function questScrollT() {
  const r = questHost.getBoundingClientRect();
  return THREE.MathUtils.clamp(
    (window.innerHeight - r.top) / (r.height + window.innerHeight), 0, 1
  );
}

function updateQuest(s, delta) {
  const target = questScrollT() * 0.96;
  qU = THREE.MathUtils.damp(qU, target, 4, delta);

  qCamera.position.copy(qCamCurve.getPointAt(qU));
  qLook.copy(qGroundCurve.getPointAt(Math.min(qU + 0.06, 1)));
  qCamera.lookAt(qLook);

  qFlags.forEach(f => {
    const show = qU + 0.1 >= f.userData.u;
    const t = THREE.MathUtils.damp(f.scale.x, show ? 0.85 : 0.001, 6, delta);
    f.scale.setScalar(t);
    f.rotation.y = Math.sin(s * 0.8 + f.userData.u * 10) * 0.12;
  });

  qClouds.forEach(c => {
    c.position.x = c.userData.baseX + Math.sin(s * c.userData.speed + c.userData.phase) * 1.5;
  });

  qRenderer.render(qScene, qCamera);
}

/* reduced motion: one static frame mid-journey, all flags planted */
function renderQuestStatic() {
  if (!qRenderer) return;
  qU = 0.45;
  qCamera.position.copy(qCamCurve.getPointAt(qU));
  qCamera.lookAt(qGroundCurve.getPointAt(qU + 0.06));
  qFlags.forEach(f => f.scale.setScalar(0.85));
  qRenderer.render(qScene, qCamera);
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
let lastT = 0;
let slowFrames = 0, dprDropped = false;

/* drop resolution before dropping frames (refine.md §5) */
function perfGuard(delta) {
  if (dprDropped) return;
  if (delta > 0.034) slowFrames++;          // sustained < ~30fps
  if (slowFrames > 90) {
    dprDropped = true;
    [heroRenderer, qRenderer, cRenderer].forEach(r => r && r.setPixelRatio(1));
  }
}

function tick(t) {
  rafId = requestAnimationFrame(tick);
  const s = t * 0.001;
  const delta = Math.min(s - lastT, 0.1) || 0.016;
  lastT = s;
  perfGuard(delta);

  if (heroRenderer && heroVisible) {
    toys.forEach(toy => {
      const u = toy.userData;
      toy.position.y = u.baseY + Math.sin(s * u.bob + u.phase) * 0.7;
      toy.rotation.x += u.spin * 0.004;
      toy.rotation.y += u.spin * 0.006;
    });
    // ease token rotation toward cursor; small range so it acknowledges, not spins
    heroToken.rotation.y = THREE.MathUtils.damp(heroToken.rotation.y,  mouseX * 0.6, 4, delta);
    heroToken.rotation.x = THREE.MathUtils.damp(heroToken.rotation.x, -mouseY * 0.4, 4, delta);
    heroToken.position.y = heroToken.userData.baseY + Math.sin(s * 1.2) * 0.45;

    heroCamera.position.x += (mouseX * 1.6 - heroCamera.position.x) * 0.04;
    heroCamera.position.y += (-mouseY * 1.0 - heroCamera.position.y) * 0.04;
    heroCamera.lookAt(0, 0, 0);
    heroRenderer.render(heroScene, heroCamera);
  }

  if (qRenderer && questVisible) {
    updateQuest(s, delta);
  }

  if (cRenderer && contactVisible) {
    planetGroup.rotation.y = s * 0.25;
    moonPivot.rotation.y = s * 0.6;
    cRenderer.render(cScene, cCamera);
  }
}

function renderOnce() {
  if (heroRenderer) heroRenderer.render(heroScene, heroCamera);
  renderQuestStatic();
  if (cRenderer) cRenderer.render(cScene, cCamera);
}

/* ────────────────────────────────────────────
   BOOT
   ──────────────────────────────────────────── */
try {
  initHero();
  initQuest();
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
    if (qRenderer) {
      qCamera.aspect = window.innerWidth / window.innerHeight;
      qCamera.updateProjectionMatrix();
      qRenderer.setSize(window.innerWidth, window.innerHeight);
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
