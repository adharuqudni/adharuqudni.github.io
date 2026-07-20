/* ══════════════════════════════════════════════
   PARTICLES — full-screen GPU overlay.
   A pooled Points cloud in pixel space: a soft trail
   that follows the cursor + a burst() emitter fired by
   DOM events (coins, boss hits). Custom shader draws
   round, life-faded sprites. One canvas, no per-bit DOM.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';

const N = 700;                 // pool size
const TTL = 1.15;              // seconds a particle lives
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const PALETTE = [
  [1.0, 0.788, 0.235],  // yellow
  [1.0, 0.42, 0.59],    // pink
  [0.36, 0.66, 1.0],    // blue
  [0.33, 0.83, 0.53],   // green
  [0.65, 0.55, 0.98],   // purple
];

const vert = `
  attribute float aSize;
  attribute float aLife;
  attribute vec3 aColor;
  varying float vLife;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vLife = aLife;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (0.35 + 0.65 * aLife);
  }
`;
const frag = `
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;                 // round sprite
    float soft = smoothstep(0.25, 0.02, r);
    float core = smoothstep(0.04, 0.0, r); // faux-bloom hot centre
    vec3 c = mix(vColor, vColor + 0.7, core);
    gl_FragColor = vec4(c, soft * vLife);
  }
`;

let renderer, scene, camera, points, geo, material;
let W = window.innerWidth, H = window.innerHeight;
let head = 0, alive = 0;
let reduce = false, running = false;

const pos = new Float32Array(N * 3);
const col = new Float32Array(N * 3);
const size = new Float32Array(N);
const life = new Float32Array(N);
const vel = new Float32Array(N * 2);   // px/sec, y is screen-down

function ortho() {
  // pixel space: x 0..W (right), y 0..H (down)
  camera = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);
}

export function initParticles() {
  reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return false;

  const canvas = document.createElement('canvas');
  canvas.id = 'fx-canvas';
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '9998',
  });
  document.body.appendChild(canvas);

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H);

  scene = new THREE.Scene();
  ortho();

  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));

  material = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: DPR } },
    vertexShader: vert, fragmentShader: frag,
    transparent: true, depthTest: false, depthWrite: false,
  });

  points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  window.addEventListener('resize', onResize);
  document.addEventListener('pointermove', onMove, { passive: true });
  running = true;
  return true;
}

function onResize() {
  W = window.innerWidth; H = window.innerHeight;
  renderer.setSize(W, H);
  camera.right = W; camera.bottom = H;
  camera.updateProjectionMatrix();
}

let lastX = 0, lastY = 0, hasLast = false;
function onMove(e) {
  const x = e.clientX, y = e.clientY;
  if (hasLast) {
    const dx = x - lastX, dy = y - lastY;
    const speed = Math.hypot(dx, dy);
    if (speed > 2) {
      const n = Math.min(3, 1 + (speed / 40) | 0);
      const c = PALETTE[0];                       // yellow trail
      for (let i = 0; i < n; i++) spawn(x, y, c, 6, 40, -dx * 3, -dy * 3);
    }
  }
  lastX = x; lastY = y; hasLast = true;
}

function spawn(x, y, c, baseSize, spread, vx = 0, vy = 0) {
  const i = head; head = (head + 1) % N;
  pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = 0;
  col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  size[i] = baseSize + Math.random() * baseSize;
  life[i] = 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.random() * spread;
  vel[i * 2] = vx * 0.15 + Math.cos(a) * s;
  vel[i * 2 + 1] = vy * 0.15 + Math.sin(a) * s;
  alive = Math.min(alive + 1, N);
}

/* public: radial burst at screen coords (used by coins / boss) */
export function burst(x, y, count = 22, colorIdx = null) {
  if (reduce || !running) return;
  for (let i = 0; i < count; i++) {
    const c = PALETTE[colorIdx ?? (i % PALETTE.length)];
    spawn(x, y, c, 9, 260, 0, -60);
  }
}

export function updateParticles(dt) {
  if (!running || alive === 0) return false;
  const wasAlive = alive > 0;
  let active = 0;
  const g = 220;                    // gravity px/s^2 (screen-down)
  for (let i = 0; i < N; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt / TTL;
    if (life[i] <= 0) { life[i] = 0; size[i] = 0; continue; }
    active++;
    vel[i * 2 + 1] += g * dt;
    vel[i * 2] *= 0.96;
    pos[i * 3]     += vel[i * 2] * dt;
    pos[i * 3 + 1] += vel[i * 2 + 1] * dt;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.aLife.needsUpdate = true;
  geo.attributes.aSize.needsUpdate = true;
  geo.attributes.aColor.needsUpdate = true;
  alive = active;
  if (alive > 0 || wasAlive) renderer.render(scene, camera);
  return alive > 0;
}
