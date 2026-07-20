/* ══════════════════════════════════════════════
   TOON KIT — shared cel-shading helpers
   toon mesh + inflated back-face shell = fat outline
   ══════════════════════════════════════════════ */
import * as THREE from 'three';

export const INK = 0x23233b;
export const COLORS = {
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
export const gradientMap = makeGradientMap();

/* toon mesh + inflated BackSide shell. Returns a Group; the toon mesh is
   group.userData.core so callers can raycast / recolor just the surface. */
export function makeToon(geometry, color, outline = 0.08) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    geometry,
    new THREE.MeshToonMaterial({ color, gradientMap })
  );
  group.add(core);
  const shell = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  );
  shell.scale.setScalar(1 + outline);
  group.add(shell);
  group.userData.core = core;
  return group;
}

export function addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 10, 8);
  scene.add(sun);
}
