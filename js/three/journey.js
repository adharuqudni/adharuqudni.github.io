/* ══════════════════════════════════════════════
   JOURNEY — walkable career level (the centerpiece).
   Drive a toon adventurer (WASD / arrows / d-pad, Space
   to jump) down the career path. Main checkpoints = the
   five jobs: reaching one awards XP through the game
   core and pops its card. Side-trails lead to project /
   cert nodes; gold coins along the way are collectible
   (persisted). Era landmarks + scatter décor sell the
   biome shift (day → night) as you progress. A ⛶
   button fullscreens the same level. Keys are captured
   only while the stage is "active" (click / tap to
   enter) so the page stays usable. The DOM timeline
   below is the no-JS / a11y codex.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';
import { makeToon, gradientMap, COLORS, INK } from '../lib/toon.js';
import { pointerNDC, pick } from '../lib/raycast.js';

const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const lowGPU = (navigator.hardwareConcurrency || 8) <= 4;

const STOPS = [
  { name: 'Samsung R&D',  role: 'Software Engineer · now',      color: COLORS.green,  blurb: 'Cross-platform framework across Android, iOS & WebView — one codebase, three platforms.' },
  { name: 'tiket.com',    role: 'Intern → Software Engineer I', color: COLORS.blue,   blurb: 'Distributed data-mining platform feeding pricing — GCS & BigQuery ETL, resilient scraping.' },
  { name: 'decorps',      role: 'Founder & Lead Engineer',      color: COLORS.purple, blurb: 'Founded a studio, mentored 20+ — all mentees landed internships or full-time roles.' },
  { name: 'PT Elnusa',    role: 'Fullstack Engineer · 🥇 gold', color: COLORS.yellow, blurb: '1,000+ asset tracking platform + ERM system. First place at CIP Forum Elnusa 2021.' },
  { name: 'PT Agni',      role: 'Frontend Engineer',            color: COLORS.pink,   blurb: 'A sharp 3-month sprint: clean routing + Vue 3 Composition API UI on Express.' },
];

// side-trails off the main path
const BRANCHES = [
  { z: -6,  x: 12,  label: '🤖 AI & Vision',    blurb: 'YOLO people-tracking, pothole detection, Notula RAG.', href: '#projects', filter: 'ai' },
  { z: -17, x: -12, label: '🎮 Games & Creative', blurb: 'Artle auto-battler + ComfyUI game-asset pipeline.',   href: '#projects', filter: 'games' },
  { z: -28, x: 12,  label: '⚙️ Platform & Data',  blurb: 'Ledger, field attendance, Android emulator farm.',    href: '#projects', filter: 'platform' },
  { z: -39, x: -12, label: '🏅 18+ Certs',        blurb: 'GCP, Kubernetes, Firebase, Terraform & more.',        href: '#certifications', filter: null },
];

/* the whole portfolio lives in the level: projects are loot chests
   (gold = featured / main quests), skills are toolbox crates */
const CHESTS = [
  { x: -8.5, z: 3,     gold: true,  cat: 'ai',       title: 'Real-Time CCTV People Tracking', tag: '⭐ personal · 2025',  blurb: 'YOLO v11 + BoT-SORT on a live HLS feed — realtime zone counting to a Next.js dashboard.' },
  { x: 8,    z: -13,   gold: true,  cat: 'platform', title: 'Distributed Data-Mining Platform', tag: '⭐ tiket.com',      blurb: 'Hotel & flight data acquisition feeding pricing — GCS & BigQuery ETL, resilient scraping.' },
  { x: -6.5, z: -13,   gold: true,  cat: 'games',    title: 'ChaChing — Financial Pause', tag: '⭐ Android · 2025',       blurb: 'Intercepts payment-app launches with a budget rule engine. 52+ unit tests, zero servers.' },
  { x: 14.5, z: -4.5,  cat: 'ai',       title: 'Notula — WhatsApp Team-Intel', tag: '🤖 AI & Vision',      blurb: 'WhatsApp groups → LLM summaries → Obsidian memory → RAG Q&A, orchestrated in n8n.' },
  { x: 15.5, z: -6.5,  cat: 'ai',       title: 'AI Development Platform', tag: '🤖 AI & Vision',           blurb: 'LLMs + MCP + spec-driven development: requirements in, code + docs out.' },
  { x: 14.5, z: -8.2,  cat: 'ai',       title: 'Road Hole Detection', tag: '🤖 AI & Vision',               blurb: 'YOLOv8 computer vision detecting and classifying potholes in road imagery.' },
  { x: -14.5,z: -15.5, cat: 'games',    title: 'Artle — "Art of Battle"', tag: '🎮 Games & Creative',      blurb: 'Deterministic auto-battler engine — local PvE + authoritative Colyseus PvP + replays.' },
  { x: -15.2,z: -18,   cat: 'games',    title: 'ComfyUI Game Asset Pipeline', tag: '🎮 Games & Creative',  blurb: 'Consistent 2D pixel-art characters: races, gear, poses, sprite sheets — identity never drifts.' },
  { x: 14.5, z: -26,   cat: 'platform', title: 'AKTUDINUS Ledger', tag: '⚙️ Platform & Data',             blurb: 'VB6 accounting → web general ledger. 52,700+ real transactions balancing to 0.00.' },
  { x: 15.6, z: -27.9, cat: 'platform', title: 'Merchandiser Attendance', tag: '⚙️ Platform & Data',      blurb: 'GPS + camera field attendance, server-side geofencing, offline IndexedDB queue.' },
  { x: 14.6, z: -29.8, cat: 'platform', title: 'Android Emulator Farm & Frida', tag: '⚙️ Platform & Data', blurb: '8 KVM emulators + a Node.js Frida service in one compose file — instrumentation research.' },
  { x: 13.6, z: -31.3, cat: 'platform', title: 'Autonomous Ship Ground Control', tag: '⚙️ Platform & Data', blurb: 'WPF ground station: satellite map, click-to-set waypoints, Arduino telemetry over serial.' },
];
const TOTEMS = [
  { x: -11,   z: 2.8,  color: 0xff5d5d, title: '🎨 Frontend & Mobile',      blurb: 'React / Next.js · TypeScript · Vue · Jetpack Compose · Zustand · Capacitor · PWA' },
  { x: -12.6, z: 1.0,  color: 0x5ba8ff, title: '⚙️ Backend, Data & Cloud',  blurb: 'Node.js · Spring Boot · PostgreSQL · BigQuery / GCP · Docker · Terraform · Supabase · reverse engineering' },
  { x: -11.6, z: -0.9, color: 0xa78bfa, title: '🤖 AI, Languages & Tools',  blurb: 'MCP · LLMs · spec-driven dev · ComfyUI / SD · n8n · Java · Kotlin · Python · C++ · 日本語' },
];

// biome palette per era (day → golden → sunset → night)
const BIOME = [
  { sky: 0xbfe3ff, ground: 0x8fdc9a, light: 0xffffff, li: 1.6, star: 0 },
  { sky: 0xa7d9ff, ground: 0x86d59a, light: 0xffffff, li: 1.5, star: 0 },
  { sky: 0xffe0a8, ground: 0x9fd488, light: 0xfff0d0, li: 1.5, star: 0.05 },
  { sky: 0xff9f6b, ground: 0x8fbf7a, light: 0xffd0a0, li: 1.3, star: 0.35 },
  { sky: 0x2a2a55, ground: 0x3f5a68, light: 0x9fb0ff, li: 1.0, star: 1.0 },
];
const Z_START = 7, Z_END = -44;
const pathX = z => Math.sin(z * 0.18) * 3.5;

/* deterministic RNG so the décor never pops differently between visits */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createJourney(canvas, stage, ui, deps = {}) {
  if (isMobile && lowGPU) return null;   // DOM timeline stands alone

  const game = deps.game || {
    award: () => null, has: () => false, ids: () => new Set(),
    count: () => 0, level: () => ({ index: 0, progress: 0 }), onChange: () => {},
  };
  const sfx = deps.sfx || { play: () => {} };
  const screenFx = deps.burst || (() => {});
  const onFlagClick = deps.onFlagClick || (() => {});

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const sky = new THREE.Color(BIOME[0].sky);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky.clone(), 30, 62);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 12, 8);
  scene.add(sun);

  const toonMesh = (geo, color) => new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap }));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 180),
    new THREE.MeshToonMaterial({ color: BIOME[0].ground })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01;
  scene.add(ground);

  // ── path dots (instanced: 2 draw calls for all 53 dots) ──
  const dotM = new THREE.Object3D();
  function instancedDots(positions, radius, color) {
    const im = new THREE.InstancedMesh(
      new THREE.CircleGeometry(radius, 12),
      new THREE.MeshBasicMaterial({ color }),
      positions.length
    );
    positions.forEach((p, i) => {
      dotM.position.set(p[0], p[1], p[2]);
      dotM.rotation.set(-Math.PI / 2, 0, 0);
      dotM.scale.setScalar(1);
      dotM.updateMatrix();
      im.setMatrixAt(i, dotM.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    scene.add(im);
    return im;
  }
  const mainDots = [];
  for (let z = 6; z >= -42; z -= 2) mainDots.push([pathX(z), 0.01, z]);
  instancedDots(mainDots, 0.6, 0xfff4dc);
  const trailDots = [];
  BRANCHES.forEach(br => {
    const midX = br.x > 0 ? 3 : -3;
    for (let t = 0; t <= 1; t += 0.16) trailDots.push([midX + (br.x - midX) * t, 0.02, br.z]);
  });
  for (let t = 0; t <= 1; t += 0.16) trailDots.push([-3 + (-11 - -3) * t, 0.02, 1.6]);   // toolbox-camp trail
  instancedDots(trailDots, 0.4, 0xffe6a0);

  // ── scatter décor (instanced: 4 draw calls) ──
  const canopyMat = new THREE.MeshToonMaterial({ color: 0x3eb872, gradientMap });
  const bushMat = new THREE.MeshToonMaterial({ color: 0x7fd99a, gradientMap });
  const trunkMat = new THREE.MeshToonMaterial({ color: 0x9c6b3f, gradientMap });
  const rockMat = new THREE.MeshToonMaterial({ color: 0xcfd4e8, gradientMap });
  {
    const rng = mulberry32(7);
    const spot = () => {
      for (let tries = 0; tries < 20; tries++) {
        const side = rng() > 0.5 ? 1 : -1;
        const x = side * (8 + rng() * 9);
        const z = 6 - rng() * 48;
        const clear = [...BRANCHES, ...CHESTS, ...TOTEMS].every(p => Math.abs(x - p.x) > 3 || Math.abs(z - p.z) > 3);
        if (clear) return { x, z, s: 0.7 + rng() * 0.7 };
      }
      return { x: 14, z: -20, s: 1 };
    };
    const trees = Array.from({ length: 14 }, spot);
    const bushes = Array.from({ length: 8 }, spot);
    const rocks = Array.from({ length: 8 }, spot);
    const fill = (im, list, y, extra = 0) => {
      list.forEach((p, i) => {
        dotM.position.set(p.x, y * p.s, p.z);
        dotM.rotation.set(0, (i * 2.4) % Math.PI, 0);
        dotM.scale.setScalar(p.s);
        dotM.updateMatrix();
        im.setMatrixAt(i, dotM.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    };
    fill(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.26, 1.1, 6), trunkMat, 14), trees, 0.55);
    fill(new THREE.InstancedMesh(new THREE.ConeGeometry(1.15, 2.0, 8), canopyMat, 14), trees, 1.9);
    fill(new THREE.InstancedMesh(new THREE.SphereGeometry(0.72, 10, 8), bushMat, 8), bushes, 0.45);
    fill(new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.5, 0), rockMat, 8), rocks, 0.3);
  }

  // starfield (fades in at night)
  const starN = 160;
  const sp = new Float32Array(starN * 3);
  for (let i = 0; i < starN; i++) { sp[i*3] = (Math.random()-0.5)*120; sp[i*3+1] = 6+Math.random()*40; sp[i*3+2] = -60+Math.random()*70; }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));

  function flag(color) {
    const g = new THREE.Group();
    const pole = makeToon(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 8), INK, 0.04); pole.position.y = 1.6; g.add(pole);
    const pen = makeToon(new THREE.BoxGeometry(1.9, 1.25, 0.14), color, 0.06); pen.position.set(1.05, 2.5, 0); g.add(pen);
    const ring = makeToon(new THREE.TorusGeometry(2.6, 0.2, 8, 32), color, 0.05); ring.rotation.x = -Math.PI/2; ring.position.y = 0.05; g.add(ring);
    g.userData.ring = ring;
    return g;
  }
  // gold star planted on a flag once its checkpoint is reached
  function plantStar(flagGroup) {
    if (flagGroup.userData.star) return;
    const s = toonMesh(new THREE.OctahedronGeometry(0.34, 0), COLORS.yellow);
    s.position.y = 3.6;
    s.scale.y = 1.3;
    flagGroup.add(s);
    flagGroup.userData.star = s;
  }

  // ── era landmarks (shell-less toon, ≤5 meshes each) ──
  function landmarkFor(i) {
    const g = new THREE.Group();
    if (i === 0) {                    // Samsung — office tower + antenna
      const tower = toonMesh(new THREE.BoxGeometry(2.2, 4.6, 2.2), COLORS.green); tower.position.y = 2.3; g.add(tower);
      const win1 = toonMesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), 0xfff4dc); win1.position.set(0, 3.3, 1.16); g.add(win1);
      const win2 = win1.clone(); win2.position.y = 2.3; g.add(win2);
      const ant = toonMesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 6), INK); ant.position.y = 5.3; g.add(ant);
      const tip = toonMesh(new THREE.SphereGeometry(0.16, 10, 8), COLORS.coral); tip.position.y = 6.1; g.add(tip);
    } else if (i === 1) {             // tiket.com — swooping paper plane
      const pole = toonMesh(new THREE.CylinderGeometry(0.07, 0.07, 3.4, 6), INK); pole.position.y = 1.7; g.add(pole);
      const body = toonMesh(new THREE.ConeGeometry(0.9, 2.6, 4), 0xffffff);
      body.scale.set(1, 1, 0.45); body.rotation.set(Math.PI / 2.6, 0, 0); body.position.y = 3.6; g.add(body);
      const wing = toonMesh(new THREE.ConeGeometry(0.7, 2.0, 4), COLORS.blue);
      wing.scale.set(1.5, 1, 0.3); wing.rotation.copy(body.rotation); wing.position.set(0, 3.35, 0.1); g.add(wing);
    } else if (i === 2) {             // decorps — launching rocket
      const body = toonMesh(new THREE.CylinderGeometry(0.55, 0.65, 2.4, 12), 0xffffff); body.position.y = 2.2; g.add(body);
      const nose = toonMesh(new THREE.ConeGeometry(0.62, 1.1, 12), COLORS.purple); nose.position.y = 3.95; g.add(nose);
      const finL = toonMesh(new THREE.BoxGeometry(0.16, 1.0, 0.7), COLORS.purple); finL.position.set(-0.68, 1.3, 0); g.add(finL);
      const finR = finL.clone(); finR.position.x = 0.68; g.add(finR);
      const fire = toonMesh(new THREE.ConeGeometry(0.45, 1.2, 10), 0xff9f45);
      fire.rotation.x = Math.PI; fire.position.y = 0.55; g.add(fire);
      g.userData.fire = fire;
      g.rotation.z = -0.09;
    } else if (i === 3) {             // Elnusa — oil derrick
      const tower = toonMesh(new THREE.ConeGeometry(1.5, 4.8, 4, 1, true), 0xff9f45); tower.position.y = 2.4; g.add(tower);
      const top = toonMesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), INK); top.position.y = 4.9; g.add(top);
      const drop = toonMesh(new THREE.SphereGeometry(0.35, 12, 10), INK);
      drop.scale.y = 1.35; drop.position.set(1.6, 0.5, 0.6); g.add(drop);
    } else {                          // Agni — cartoon flame on a log
      const log = toonMesh(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 8), 0x9c6b3f);
      log.rotation.z = Math.PI / 2; log.position.y = 0.3; g.add(log);
      const fl = toonMesh(new THREE.ConeGeometry(1.0, 2.6, 8), COLORS.pink); fl.position.y = 1.8; g.add(fl);
      const inner = toonMesh(new THREE.ConeGeometry(0.5, 1.4, 8), COLORS.yellow); inner.position.y = 1.5; g.add(inner);
      g.userData.flicker = [fl, inner];
    }
    return g;
  }

  // main checkpoints (jobs) + their landmarks
  const takenSet = game.ids('checkpoint');
  const checkpoints = STOPS.map((st, i) => {
    const g = flag(st.color);
    const side = i % 2 ? 1 : -1;
    g.position.set(side * 4.5, 0, -i * 10);
    g.userData.i = i; g.userData.kind = 'job';
    g.userData.taken = takenSet.has(String(i));
    if (g.userData.taken) plantStar(g);
    scene.add(g);

    const lm = landmarkFor(i);
    lm.position.set(side * 8.5, 0, -i * 10 - 1.5);
    lm.rotation.y = -side * 0.5;
    lm.userData.i = i;
    scene.add(lm);
    g.userData.landmark = lm;
    return g;
  });

  // branch nodes
  const branchNodes = BRANCHES.map((br, i) => {
    const g = flag(0xffd166);
    g.scale.setScalar(0.8);
    g.position.set(br.x, 0, br.z);
    g.userData.i = i; g.userData.kind = 'branch';
    const sign = makeToon(new THREE.BoxGeometry(1.6, 1.0, 0.16), 0xffffff, 0.05); sign.position.set(0, 3.3, 0); g.add(sign);
    scene.add(g);
    return g;
  });

  // ── loot chests (projects) — gold = featured main quests ──
  const CAT_COLOR = { ai: COLORS.purple, games: COLORS.pink, platform: COLORS.blue };
  const openedSet = game.ids('loot');
  const chests = CHESTS.map((ch, i) => {
    const g = new THREE.Group();
    const color = ch.gold ? COLORS.yellow : CAT_COLOR[ch.cat] || COLORS.blue;
    const mk = ch.gold
      ? (geo, c) => makeToon(geo, c, 0.08)
      : (geo, c) => toonMesh(geo, c);
    const base = mk(new THREE.BoxGeometry(0.95, 0.55, 0.7), color); base.position.y = 0.28; g.add(base);
    const lid = new THREE.Group(); lid.position.set(0, 0.55, -0.35); g.add(lid);
    const lidM = mk(new THREE.BoxGeometry(0.95, 0.22, 0.7), color); lidM.position.set(0, 0.11, 0.35); lid.add(lidM);
    const lock = toonMesh(new THREE.BoxGeometry(0.18, 0.22, 0.08), INK); lock.position.set(0, 0.5, 0.37); g.add(lock);
    g.position.set(ch.x, 0, ch.z);
    g.rotation.y = (i * 1.7) % 1.2 - 0.6;
    g.userData = { i, lid, opened: openedSet.has(String(i)), openT: 0 };
    if (g.userData.opened) lid.rotation.x = -1.7;
    scene.add(g);
    return g;
  });

  // ── toolbox crates (skills) at the camp near the start ──
  const totemSet = game.ids('totem');
  const totems = TOTEMS.map((t, i) => {
    const g = new THREE.Group();
    const box = makeToon(new THREE.BoxGeometry(1.05, 0.62, 0.62), t.color, 0.08); box.position.y = 0.31; g.add(box);
    const handle = toonMesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14, Math.PI), INK); handle.position.y = 0.68; g.add(handle);
    const latch = toonMesh(new THREE.BoxGeometry(0.16, 0.14, 0.06), 0xfff4dc); latch.position.set(0, 0.44, 0.33); g.add(latch);
    g.position.set(t.x, 0, t.z);
    g.rotation.y = i * 0.7 - 0.6;
    g.userData = { i, seen: totemSet.has(String(i)) };
    scene.add(g);
    return g;
  });

  // ── trophy corner at the certs trail end ──
  {
    const g = new THREE.Group();
    const podium = toonMesh(new THREE.CylinderGeometry(0.8, 0.95, 0.5, 10), 0xfff4dc); podium.position.y = 0.25; g.add(podium);
    const stem = toonMesh(new THREE.CylinderGeometry(0.12, 0.2, 0.5, 8), COLORS.yellow); stem.position.y = 0.75; g.add(stem);
    const cup = toonMesh(new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), COLORS.yellow);
    cup.rotation.x = Math.PI; cup.position.y = 1.35; g.add(cup);
    g.position.set(-13.6, 0, -40.5);
    scene.add(g);
  }

  // ── collectible world coins (persisted through the game core) ──
  const COIN_TOTAL = 12;
  const coinSpots = [];
  [3, -2, -8, -13, -20, -26, -33, -40].forEach((z, i) => {
    coinSpots.push([pathX(z) + (i % 2 ? 1.2 : -1.2), z]);
  });
  coinSpots.push([7.5, -6], [-7.5, -17], [7.5, -28], [-7.5, -39]);   // one per side-trail
  const gotCoins = game.ids('worldCoin');
  const worldCoins = [];
  coinSpots.forEach(([x, z], i) => {
    if (gotCoins.has(String(i))) return;
    const c = makeToon(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 20), COLORS.yellow, 0.08);
    c.userData.core.rotation.x = Math.PI / 2;
    c.children[1].rotation.x = Math.PI / 2;   // shell follows the disc
    c.position.set(x, 0.95, z);
    c.userData.id = i; c.userData.phase = i * 1.3; c.userData.pop = -1;
    scene.add(c);
    worldCoins.push(c);
  });

  // ── celebration star pool ──
  const starPool = Array.from({ length: 8 }, () => {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({ color: COLORS.yellow, transparent: true })
    );
    m.visible = false;
    m.userData.vel = new THREE.Vector3();
    m.userData.life = 0;
    scene.add(m);
    return m;
  });
  function spawnStars(pos) {
    starPool.forEach((m, i) => {
      m.visible = true;
      m.userData.life = 1;
      m.position.copy(pos).setY(2.6);
      const a = (i / starPool.length) * Math.PI * 2;
      m.userData.vel.set(Math.cos(a) * 3, 4 + Math.random() * 2, Math.sin(a) * 3);
    });
  }

  // ── dust puff pool (jump landings) ──
  const dustPool = Array.from({ length: 2 }, () => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.08, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff4dc, transparent: true })
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    m.userData.life = 0;
    scene.add(m);
    return m;
  });
  let dustIdx = 0;
  function puff(x, z) {
    const m = dustPool[dustIdx++ % dustPool.length];
    m.visible = true;
    m.userData.life = 1;
    m.position.set(x, 0.06, z);
  }

  // ── the adventurer ──
  const player = new THREE.Group();
  const rig = new THREE.Group();            // squash/stretch happens on the rig
  player.add(rig);
  {
    const body = makeToon(new THREE.CapsuleGeometry(0.56, 0.55, 6, 14), COLORS.coral, 0.07);
    body.position.y = 1.05; rig.add(body);
    const pack = makeToon(new THREE.BoxGeometry(0.6, 0.8, 0.36), COLORS.purple, 0.09);
    pack.position.set(0, 1.2, -0.6); rig.add(pack);

    const head = new THREE.Group(); head.position.y = 2.12; rig.add(head);
    const skull = makeToon(new THREE.SphereGeometry(0.62, 24, 18), 0xffe3b3, 0.06); head.add(skull);
    const eyeGeo = new THREE.SphereGeometry(0.085, 10, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: INK });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.22, 0.06, 0.54); head.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.22; head.add(eyeR);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 12, Math.PI), eyeMat);
    smile.position.set(0, -0.1, 0.55); smile.rotation.z = Math.PI; head.add(smile);
    const cheekMat = new THREE.MeshBasicMaterial({ color: COLORS.pink });
    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), cheekMat);
    cheekL.position.set(-0.4, -0.08, 0.44); head.add(cheekL);
    const cheekR = cheekL.clone(); cheekR.position.x = 0.4; head.add(cheekR);

    const cap = makeToon(new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), COLORS.yellow, 0.07);
    cap.position.y = 0.26; head.add(cap);
    const brim = makeToon(new THREE.BoxGeometry(0.62, 0.09, 0.5), COLORS.yellow, 0.1);
    brim.position.set(0, 0.3, 0.55); head.add(brim);

    const prop = new THREE.Group(); prop.position.y = 0.86; head.add(prop);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), eyeMat); prop.add(hub);
    const bladeGeo = new THREE.BoxGeometry(0.62, 0.05, 0.14);
    const bladeA = toonMesh(bladeGeo, COLORS.blue); prop.add(bladeA);
    const bladeB = toonMesh(bladeGeo, COLORS.pink); bladeB.rotation.y = Math.PI / 2; prop.add(bladeB);

    const armGeo = new THREE.CapsuleGeometry(0.16, 0.5, 4, 8);
    const armL = new THREE.Group(); armL.position.set(-0.72, 1.5, 0); rig.add(armL);
    const armLm = makeToon(armGeo, COLORS.coral, 0.09); armLm.position.y = -0.35; armL.add(armLm);
    const armR = new THREE.Group(); armR.position.set(0.72, 1.5, 0); rig.add(armR);
    const armRm = makeToon(armGeo, COLORS.coral, 0.09); armRm.position.y = -0.35; armR.add(armRm);

    const footGeo = new THREE.SphereGeometry(0.3, 12, 10);
    const footL = makeToon(footGeo, COLORS.blue, 0.09); footL.position.set(-0.34, 0.26, 0); rig.add(footL);
    const footR = makeToon(footGeo, COLORS.blue, 0.09); footR.position.set(0.34, 0.26, 0); rig.add(footR);

    player.userData = { armL, armR, footL, footR, prop, head };
  }
  player.position.set(0, 0, Z_START - 1);
  scene.add(player);

  // ── state ──
  const keys = new Set();
  const dir = new THREE.Vector2();
  let heading = 0, active = false, poiKey = '';
  let walkPhase = 0, jumpY = 0, vy = 0, grounded = true, squashT = 0;
  const tmpA = new THREE.Color(), tmpB = new THREE.Color(), tmpV = new THREE.Vector3();

  function setBiome(p) {
    const f = THREE.MathUtils.clamp(p, 0, 1) * (BIOME.length - 1);
    const a = BIOME[Math.floor(f)], b = BIOME[Math.min(Math.ceil(f), BIOME.length - 1)];
    const k = f - Math.floor(f);
    tmpA.set(a.sky).lerp(tmpB.set(b.sky), k);
    scene.background.copy(tmpA); scene.fog.color.copy(tmpA);
    tmpA.set(a.ground).lerp(tmpB.set(b.ground), k); ground.material.color.copy(tmpA);
    canopyMat.color.copy(tmpA).multiplyScalar(0.72);
    bushMat.color.copy(tmpA).multiplyScalar(0.88);
    tmpA.set(a.light).lerp(tmpB.set(b.light), k); sun.color.copy(tmpA);
    sun.intensity = a.li + (b.li - a.li) * k;
    starMat.opacity = a.star + (b.star - a.star) * k;
  }

  // ── UI helpers ──
  function showCard(html, accent) {
    ui.card.innerHTML = html;
    ui.card.style.setProperty('--accent', accent);
    ui.card.classList.add('show');
  }
  function hideCard() { ui.card.classList.remove('show'); }

  function syncBar() {
    const lv = game.level();
    if (ui.xpLabel) ui.xpLabel.textContent = `Lv.${lv.index}`;
    if (ui.xpFill) ui.xpFill.style.width = Math.round(lv.progress * 100) + '%';
    if (ui.coins) ui.coins.textContent = `🪙 ${game.count('worldCoin')}/${COIN_TOTAL}`;
    if (ui.flags) ui.flags.textContent = `🚩 ${game.count('checkpoint')}/${STOPS.length}`;
  }
  game.onChange(syncBar);
  syncBar();

  function banner(text) {
    ui.level.textContent = text;
    ui.level.classList.add('show');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => ui.level.classList.remove('show'), 2600);
  }

  /* world → screen coords for the DOM confetti overlay */
  function burstAt(pos, n) {
    tmpV.copy(pos).setY(2.5).project(camera);
    const r = canvas.getBoundingClientRect();
    if (tmpV.z > 1) return;
    screenFx(r.left + (tmpV.x + 1) / 2 * r.width, r.top + (1 - tmpV.y) / 2 * r.height, n);
  }

  function setActive(v) {
    active = v;
    stage.classList.toggle('playing', v);
    stage.dataset.active = String(v);
    if (!v) keys.clear();
  }

  // ── input ──
  const codeDir = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'jump',
  };
  function onKey(e, down) {
    if (!active) return;
    if (e.code === 'Escape' && down) {
      setActive(false);
      if (document.activeElement === stage) stage.blur();
      return;
    }
    const d = codeDir[e.code];
    if (!d) return;
    e.preventDefault();
    down ? keys.add(d) : keys.delete(d);
  }
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));

  // click stage to play; click elsewhere to release. A "still" click on a
  // job flag jumps to its timeline card.
  const downPos = { x: 0, y: 0 };
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  stage.addEventListener('focusin', () => setActive(true));
  stage.addEventListener('focusout', e => {
    if (!stage.contains(e.relatedTarget)) setActive(false);
  });
  stage.addEventListener('pointerdown', e => {
    setActive(true);
    if (e.target === canvas) stage.focus({ preventScroll: true });
    downPos.x = e.clientX;
    downPos.y = e.clientY;
  });
  stage.addEventListener('pointerup', e => {
    if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
    if (e.target !== canvas) return;
    const hit = pick(ray, pointerNDC(e, canvas, ndc), camera, checkpoints);
    if (hit) onFlagClick(hit.root.userData.i);
  });
  document.addEventListener('pointerdown', e => { if (!stage.contains(e.target)) setActive(false); }, true);

  ui.dpad.forEach(b => {
    const d = b.dataset.d;
    const add = e => { e.preventDefault(); setActive(true); keys.add(d); };
    const rem = e => { e.preventDefault(); keys.delete(d); };
    b.addEventListener('pointerdown', add);
    b.addEventListener('pointerup', rem);
    b.addEventListener('pointerleave', rem);
    b.addEventListener('pointercancel', rem);
    b.addEventListener('click', e => {
      if (e.detail !== 0) return;
      setActive(true);
      keys.add(d);
      setTimeout(() => keys.delete(d), d === 'jump' ? 180 : 140);
    });
  });

  // fullscreen toggle
  ui.fs.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen && stage.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', resize);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // ── frame ──
  function frame(s, dt) {
    const u = player.userData;
    dir.set((keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0),
            (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0));
    const moving = dir.lengthSq() > 0;
    if (moving) {
      dir.normalize();
      const spd = 12;
      player.position.x = THREE.MathUtils.clamp(player.position.x + dir.x * spd * dt, -20, 20);
      player.position.z = THREE.MathUtils.clamp(player.position.z + dir.y * spd * dt, Z_END, Z_START + 2);
      heading = Math.atan2(dir.x, dir.y);
    }
    player.rotation.y = THREE.MathUtils.damp(player.rotation.y, heading, 8, dt);

    // jump
    if (keys.has('jump') && grounded) {
      grounded = false; vy = 8.4;
      sfx.play('jump');
    }
    if (!grounded) {
      vy -= 22 * dt;
      jumpY += vy * dt;
      if (jumpY <= 0) {
        jumpY = 0; grounded = true; squashT = 0.18;
        puff(player.position.x, player.position.z);
        sfx.play('land');
      }
    }
    const bob = grounded ? Math.abs(Math.sin(s * 6)) * (moving ? 0.24 : 0.05) : 0;
    player.position.y = jumpY + bob;

    // squash & stretch on the rig
    squashT = Math.max(0, squashT - dt);
    const targetSy = !grounded ? THREE.MathUtils.clamp(1 + vy * 0.03, 0.88, 1.18) : (squashT > 0 ? 0.84 : 1);
    rig.scale.y = THREE.MathUtils.damp(rig.scale.y, targetSy, 14, dt);
    const sxz = 1 / Math.sqrt(rig.scale.y);
    rig.scale.x = sxz; rig.scale.z = sxz;

    // limbs
    walkPhase += dt * (moving ? 11 : 2.2);
    const swing = moving ? 0.95 : 0.05;
    u.armL.rotation.x = Math.sin(walkPhase) * swing;
    u.armR.rotation.x = -Math.sin(walkPhase) * swing;
    u.footL.position.z = Math.sin(walkPhase) * (moving ? 0.32 : 0);
    u.footR.position.z = -Math.sin(walkPhase) * (moving ? 0.32 : 0);
    u.footL.position.y = 0.26 + Math.max(0, Math.sin(walkPhase)) * 0.14 * (moving ? 1 : 0);
    u.footR.position.y = 0.26 + Math.max(0, -Math.sin(walkPhase)) * 0.14 * (moving ? 1 : 0);
    u.prop.rotation.y += dt * (moving || !grounded ? 22 : 3);
    u.head.rotation.y = moving ? THREE.MathUtils.damp(u.head.rotation.y, 0, 6, dt) : Math.sin(s * 0.7) * 0.28;

    // biome by progress along z
    setBiome((Z_START - player.position.z) / (Z_START - Z_END));

    // world coins: spin, bob, collect, pop
    for (let i = worldCoins.length - 1; i >= 0; i--) {
      const c = worldCoins[i];
      const cu = c.userData;
      if (cu.pop >= 0) {
        cu.pop += dt * 3;
        c.position.y += dt * 4;
        c.rotation.y += dt * 20;
        c.scale.setScalar(1 + cu.pop * 0.6);
        if (cu.pop >= 1) { scene.remove(c); worldCoins.splice(i, 1); }
        continue;
      }
      c.rotation.y += dt * 2.5;
      c.position.y = 0.95 + Math.sin(s * 2 + cu.phase) * 0.12;
      const dx = c.position.x - player.position.x, dz = c.position.z - player.position.z;
      if (dx * dx + dz * dz < 2.1) {
        cu.pop = 0;
        game.award('worldCoin', cu.id);
        sfx.play('coin');
        burstAt(c.position, 14);
      }
    }

    // checkpoint proximity (jobs)
    let nj = -1;
    checkpoints.forEach(c => {
      const dx = c.position.x - player.position.x, dz = c.position.z - player.position.z;
      const near = dx*dx + dz*dz < 17;
      c.userData.ring.rotation.z += dt * (near ? 3 : 0.5);
      c.scale.setScalar(THREE.MathUtils.damp(c.scale.x, near ? 1.15 : 1, 6, dt));
      if (near) nj = c.userData.i;
      const lm = c.userData.landmark;
      if (lm.userData.fire) lm.userData.fire.scale.setScalar(0.9 + Math.sin(s * 14) * 0.14);
      if (lm.userData.flicker) lm.userData.flicker.forEach((f, k) => { f.scale.x = f.scale.z = 1 + Math.sin(s * 9 + k) * 0.1; });
      if (c.userData.star) c.userData.star.rotation.y += dt * 2;
    });
    // branch proximity
    let nb = -1;
    branchNodes.forEach(c => {
      const dx = c.position.x - player.position.x, dz = c.position.z - player.position.z;
      const near = dx*dx + dz*dz < 15;
      c.userData.ring.rotation.z += dt * (near ? 3 : 0.4);
      c.scale.setScalar(THREE.MathUtils.damp(c.scale.x, near ? 0.95 : 0.8, 6, dt));
      if (near) nb = c.userData.i;
    });

    // chest proximity — open + award on approach, regardless of card priority
    let nc = -1;
    chests.forEach(c => {
      const dx = c.position.x - player.position.x, dz = c.position.z - player.position.z;
      const near = dx*dx + dz*dz < 5;
      const cu = c.userData;
      if (near) {
        nc = cu.i;
        if (!cu.opened) {
          cu.opened = true;
          game.award('loot', cu.i);
          sfx.play('coin');
          burstAt(c.position, 12);
        }
      }
      if (cu.opened) cu.lid.rotation.x = THREE.MathUtils.damp(cu.lid.rotation.x, -1.7, 7, dt);
    });
    // toolbox crate proximity
    let nt = -1;
    totems.forEach(t => {
      const dx = t.position.x - player.position.x, dz = t.position.z - player.position.z;
      if (dx*dx + dz*dz < 5) {
        nt = t.userData.i;
        if (!t.userData.seen) { t.userData.seen = true; game.award('totem', nt); sfx.play('coin'); }
      }
    });

    // one card at a time: job > branch > chest > toolbox
    const poi = nj >= 0 ? `j${nj}` : nb >= 0 ? `b${nb}` : nc >= 0 ? `c${nc}` : nt >= 0 ? `t${nt}` : '';
    if (poi !== poiKey) {
      poiKey = poi;
      if (nj >= 0) {
        const st = STOPS[nj];
        const cp = checkpoints[nj];
        if (!cp.userData.taken) {
          cp.userData.taken = true;
          plantStar(cp);
          game.award('checkpoint', nj);
          sfx.play('checkpoint');
          spawnStars(cp.position);
          burstAt(cp.position, 30);
          banner(`⭐ CHECKPOINT ${game.count('checkpoint')}/${STOPS.length} — ${st.name}!`);
        }
        showCard(`<div class="jc-name">${st.name}</div><div class="jc-role">${st.role}</div><p>${st.blurb}</p>`,
          '#' + st.color.toString(16).padStart(6, '0'));
      } else if (nb >= 0) {
        const br = BRANCHES[nb];
        game.award('branch', nb);
        showCard(`<div class="jc-name">${br.label}</div><p>${br.blurb}</p>
          <a class="jc-go" href="${br.href}" data-filter="${br.filter || ''}">→ View</a>`, '#ffc93c');
      } else if (nc >= 0) {
        const ch = CHESTS[nc];
        showCard(`<div class="jc-name">${ch.gold ? '🏆 ' : '📦 '}${ch.title}</div><div class="jc-role">${ch.tag}</div><p>${ch.blurb}</p>
          <a class="jc-go" href="#projects" data-filter="${ch.cat}">→ See on page</a>`, ch.gold ? '#ffc93c' : '#a78bfa');
      } else if (nt >= 0) {
        const t = TOTEMS[nt];
        showCard(`<div class="jc-name">${t.title}</div><p>${t.blurb}</p>`, '#5ba8ff');
      } else {
        hideCard();
      }
    }

    // celebration stars
    starPool.forEach(m => {
      if (!m.visible) return;
      m.userData.life -= dt * 1.2;
      if (m.userData.life <= 0) { m.visible = false; return; }
      m.userData.vel.y -= 9 * dt;
      m.position.addScaledVector(m.userData.vel, dt);
      m.rotation.y += dt * 6;
      m.scale.setScalar(Math.max(m.userData.life, 0.001));
      m.material.opacity = m.userData.life;
    });
    // dust puffs
    dustPool.forEach(m => {
      if (!m.visible) return;
      m.userData.life -= dt * 2.6;
      if (m.userData.life <= 0) { m.visible = false; return; }
      const g = 1 + (1 - m.userData.life) * 1.8;
      m.scale.setScalar(g);
      m.material.opacity = m.userData.life * 0.8;
    });

    // camera 3/4 top-down follow
    camera.position.x += (player.position.x - camera.position.x) * 0.08;
    camera.position.z += (player.position.z + 14 - camera.position.z) * 0.08;
    camera.position.y = 16;
    camera.lookAt(player.position.x, 0.5, player.position.z - 2);

    renderer.render(scene, camera);
  }

  // branch "View" click → optional project filter, then normal anchor scroll
  ui.card.addEventListener('click', e => {
    const a = e.target.closest('.jc-go');
    if (!a) return;
    const f = a.dataset.filter;
    if (f) { const chip = document.querySelector(`.filter-chip[data-filter="${f}"]`); if (chip) setTimeout(() => chip.click(), 400); }
    setActive(false);
  });

  const handle = { visible: false };
  handle.update = frame;
  handle.renderStatic = () => { setBiome(0.15); resize(); frame(0, 0.016); };
  handle.setVisible = v => { handle.visible = v; canvas.classList.toggle('on', v); if (v) resize(); };
  handle.resize = resize;
  handle.renderer = renderer;
  resize();
  return handle;
}
