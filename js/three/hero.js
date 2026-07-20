/* ══════════════════════════════════════════════
   HERO — floating cel-shaded toys around the title.
   GRABBABLE: click + drag a toy on a camera-facing
   plane, release to fling it; a critically-damped
   spring reels it home. Untouched toys bob + spin.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';
import { makeToon, addLights, COLORS } from '../lib/toon.js';
import { pointerNDC, pick } from '../lib/raycast.js';

const isMobile = window.matchMedia('(max-width: 768px)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 1.75);

export function createHero(canvas, onGrab) {
  const host = canvas.parentElement;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(host.clientWidth, host.clientHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, host.clientWidth / host.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 24);
  addLights(scene);

  const X = isMobile ? 0.42 : 1;
  const defs = [
    { geo: new THREE.TorusGeometry(2.4, 1.05, 24, 48),    color: COLORS.pink,   pos: [-16 * X,  5.5, -6], spin: 0.35, bob: 1.0 },
    { geo: new THREE.SphereGeometry(2.0, 32, 24),         color: COLORS.yellow, pos: [ 15 * X,  7.0, -5], spin: 0.20, bob: 1.4 },
    { geo: new THREE.ConeGeometry(1.9, 3.4, 24),          color: COLORS.green,  pos: [-13 * X, -7.5, -5], spin: 0.45, bob: 0.8 },
    { geo: new THREE.TorusKnotGeometry(1.5, 0.5, 90, 12), color: COLORS.purple, pos: [ 16 * X, -6.0, -7], spin: 0.30, bob: 1.2 },
    { geo: new THREE.OctahedronGeometry(1.7, 0),          color: COLORS.blue,   pos: [  9 * X, 11.5, -9], spin: 0.55, bob: 0.9 },
    { geo: new THREE.SphereGeometry(1.0, 24, 18),         color: COLORS.coral,  pos: [ -8 * X, 12.0, -8], spin: 0.25, bob: 1.6 },
  ];

  const toys = [];
  defs.forEach((d, i) => {
    const toy = makeToon(d.geo, d.color, 0.07);
    toy.position.set(...d.pos);
    toy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    toy.userData = {
      base: new THREE.Vector3(...d.pos), spin: d.spin, bob: d.bob, phase: i * 1.7,
      vel: new THREE.Vector3(), angVel: new THREE.Vector2(), dragging: false, home: true,
    };
    toys.push(toy);
    scene.add(toy);
  });

  // cursor-reactive token (also grabbable)
  const token = makeToon(new THREE.IcosahedronGeometry(2.1, 0), COLORS.yellow, 0.06);
  token.position.set(isMobile ? 0 : 11, isMobile ? 13.5 : 2.5, -1);
  token.userData = {
    base: token.position.clone(), spin: 0, bob: 0, phase: 0,
    vel: new THREE.Vector3(), angVel: new THREE.Vector2(), dragging: false, home: true, isToken: true,
  };
  scene.add(token);

  const pickables = [...toys, token];

  // ── input ── window-level so we never steal clicks from DOM content
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const planeHit = new THREE.Vector3();
  const lastHit = new THREE.Vector3();
  let held = null, lastMoveT = 0;
  let mouseX = 0, mouseY = 0;

  function planePoint(e) {
    pointerNDC(e, canvas, ndc);
    ray.setFromCamera(ndc, camera);
    // plane parallel to camera, through the held toy
    camera.getWorldDirection(dragPlane.normal);
    dragPlane.setFromNormalAndCoplanarPoint(dragPlane.normal, held.position);
    return ray.ray.intersectPlane(dragPlane, planeHit);
  }

  function onDown(e) {
    if (e.target.closest?.('a, button, input, textarea, select')) return; // real UI wins
    pointerNDC(e, canvas, ndc);
    const hit = pick(ray, ndc, camera, pickables);
    if (!hit) return;
    e.preventDefault();                          // no text-selection while dragging a toy
    held = hit.root;
    held.userData.dragging = true;
    held.userData.home = false;
    lastHit.copy(held.position);
    lastMoveT = performance.now();
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    onGrab && onGrab(e.clientX, e.clientY);
  }
  function onMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    if (held) {
      e.preventDefault();
      if (planePoint(e)) {
        const now = performance.now();
        const dt = Math.max((now - lastMoveT) / 1000, 0.001);
        held.userData.vel.copy(planeHit).sub(held.position).divideScalar(dt).multiplyScalar(0.55);
        held.position.copy(planeHit);
        lastMoveT = now;
      }
      return;
    }
    // hover affordance
    const hit = pick(ray, ndc.set(
      ((e.clientX - canvas.getBoundingClientRect().left) / canvas.clientWidth) * 2 - 1,
      -((e.clientY - canvas.getBoundingClientRect().top) / canvas.clientHeight) * 2 + 1
    ), camera, pickables);
    if (!e.target.closest?.('a, button')) document.body.style.cursor = hit ? 'grab' : '';
  }
  function onUp() {
    if (held) {
      held.userData.dragging = false;
      held.userData.angVel.set(held.userData.vel.y * 0.06, held.userData.vel.x * 0.06);
      held = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }
  window.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);

  const rest = new THREE.Vector3();
  const K = 24, D = 7;   // spring stiffness / damping

  return {
    visible: true,
    update(s, dt) {
      pickables.forEach(toy => {
        const u = toy.userData;
        if (u.dragging) {
          toy.rotation.x += 0.02; toy.rotation.y += 0.03;
          return;
        }
        // rest target = base + gentle bob
        rest.copy(u.base);
        rest.y += Math.sin(s * (u.bob || 1) + u.phase) * (u.isToken ? 0.45 : 0.7);
        // spring toward rest
        const ax = (rest.x - toy.position.x) * K - u.vel.x * D;
        const ay = (rest.y - toy.position.y) * K - u.vel.y * D;
        const az = (rest.z - toy.position.z) * K - u.vel.z * D;
        u.vel.x += ax * dt; u.vel.y += ay * dt; u.vel.z += az * dt;
        toy.position.x += u.vel.x * dt;
        toy.position.y += u.vel.y * dt;
        toy.position.z += u.vel.z * dt;

        // spin: idle spin + fling-imparted angular velocity that decays
        toy.rotation.x += u.spin * 0.004 + u.angVel.x;
        toy.rotation.y += u.spin * 0.006 + u.angVel.y;
        u.angVel.multiplyScalar(0.94);

        if (u.isToken) {
          toy.rotation.y = THREE.MathUtils.damp(toy.rotation.y,  mouseX * 0.6, 4, dt);
          toy.rotation.x = THREE.MathUtils.damp(toy.rotation.x, -mouseY * 0.4, 4, dt);
        }
      });

      camera.position.x += (mouseX * 1.6 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.0 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    },
    resize() {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    },
    renderer,
  };
}
