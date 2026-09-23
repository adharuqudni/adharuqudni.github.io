// Keep the photographic hero until all scene resources and WebGL are ready.
const hero = document.querySelector('.hero');
const host = document.getElementById('earth-canvas');
const ui = document.querySelector('.earth-interface');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let scene, loading = false, failed = false;

async function syncMotion() {
  if (reducedMotion.matches) {
    scene?.dispose();
    scene = null;
    hero.classList.remove('has-earth');
    ui.hidden = true;
    return;
  }
  if (scene || loading || failed) return;
  loading = true;
  try {
    const { createEarth } = await import('./earth-scene.js');
    if (reducedMotion.matches) return;
    const next = await createEarth(host, () => {
      scene?.dispose();
      scene = null;
      failed = true;
      hero.classList.remove('has-earth');
      ui.hidden = true;
    });
    if (reducedMotion.matches) next.dispose();
    else {
      scene = next;
      ui.hidden = false;
      hero.classList.add('has-earth');
      // Layout changes when the globe replaces the poster.
      scene.resize();
    }
  } catch {
    failed = true;
    hero.classList.remove('has-earth');
    ui.hidden = true;
  } finally { loading = false; }
}
reducedMotion.addEventListener('change', syncMotion);
syncMotion();
