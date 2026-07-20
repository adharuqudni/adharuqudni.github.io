/* ══════════════════════════════════════════════
   RAYCAST — pointer picking helpers, shared by any
   scene that wants click / drag on 3D objects.
   ══════════════════════════════════════════════ */
import * as THREE from 'three';

/* clientX/Y → normalized device coords (-1..1), y flipped, relative to el */
export function pointerNDC(event, el, out = new THREE.Vector2()) {
  const r = el.getBoundingClientRect();
  out.x = ((event.clientX - r.left) / r.width) * 2 - 1;
  out.y = -((event.clientY - r.top) / r.height) * 2 + 1;
  return out;
}

/* Pick the first candidate root hit by the ray. `candidates` are the
   pickable Groups; we intersect recursively then walk parents back up to
   whichever candidate owns the hit mesh. Returns { root, point } or null. */
export function pick(raycaster, ndc, camera, candidates) {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(candidates, true);
  if (!hits.length) return null;
  const set = new Set(candidates);
  let o = hits[0].object;
  while (o && !set.has(o)) o = o.parent;
  return o ? { root: o, point: hits[0].point } : null;
}
