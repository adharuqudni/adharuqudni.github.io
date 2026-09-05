const story = document.getElementById('approach');
const stage = story?.querySelector('.story-stage');
const visual = story?.querySelector('.story-visual');
const chapters = [...(story?.querySelectorAll('[data-chapter]') || [])];
const buttons = [...(story?.querySelectorAll('[data-story-jump]') || [])];
const motionButton = document.getElementById('story-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const comfortableViewport = matchMedia('(min-height: 620px)');
let scene = null, loading = false, failed = false, paused = false, raf = 0;
let progress = 0, renderedProgress = -1, visible = false, active = -1;
const clamp = value => Math.max(0, Math.min(1, value));
const enabled = () => !reduced.matches && comfortableViewport.matches && !failed;

function staticStory() {
  cancelAnimationFrame(raf); raf = 0;
  story.classList.remove('is-immersive');
  chapters.forEach(chapter => { chapter.inert = false; chapter.removeAttribute('aria-hidden'); chapter.classList.remove('is-active'); });
}
function measure() {
  const box = story.getBoundingClientRect();
  const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
  return clamp((stickyTop-box.top) / Math.max(1, story.offsetHeight-stage.offsetHeight));
}
function updateCopy() {
  const next = Math.min(2, Math.floor(progress*3));
  if (next !== active) {
    active = next;
    chapters.forEach((chapter, i) => {
      chapter.classList.toggle('is-active', i===active);
      chapter.inert = i!==active;
      chapter.setAttribute('aria-hidden', String(i!==active));
    });
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i===active)));
  }
  story.style.setProperty('--story-progress', progress);
}
function tick() {
  raf = 0;
  if (!enabled()) { staticStory(); return; }
  if (!scene || !visible || document.hidden) return;
  progress = measure(); updateCopy();
  if (paused) return;
  if (renderedProgress < 0) renderedProgress = progress;
  renderedProgress += (progress-renderedProgress)*.16;
  scene.draw(renderedProgress);
  if (Math.abs(progress-renderedProgress) > .0002) raf = requestAnimationFrame(tick);
}
function requestTick() {
  // A preference can change between a frame and its media-query event.
  // Restore readable content immediately, even when that event is delayed.
  if (!enabled()) {
    if (story.classList.contains('is-immersive')) staticStory();
    return;
  }
  if (!raf && scene && visible && !document.hidden) raf = requestAnimationFrame(tick);
}
async function start() {
  if (!story || !enabled() || loading) return;
  if (scene) {
    story.classList.add('is-immersive'); active = -1;
    scene.resize(); renderedProgress = -1; requestTick(); return;
  }
  loading = true;
  try {
    const { createStoryScene } = await import('./story-scene.js');
    if (!enabled()) return;
    scene = createStoryScene(visual);
    story.classList.add('is-immersive');
    scene.resize(); active = -1; renderedProgress = -1; requestTick();
    scene.canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); failed = true; staticStory(); scene.dispose(); scene = null;
    });
  } catch {
    failed = true; scene?.dispose(); scene = null;
    visual.querySelector('canvas')?.remove(); staticStory();
  } finally { loading = false; }
}
if (story && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { start(); requestTick(); }
    else { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '240px 0px' });
  observer.observe(story);
  addEventListener('scroll', requestTick, { passive: true });
  const resize = new ResizeObserver(() => {
    scene?.resize();
    if (paused && scene && renderedProgress >= 0) scene.draw(renderedProgress);
    if (!paused) renderedProgress = -1;
    requestTick();
  });
  resize.observe(visual);
  function preferenceChanged() {
    if (!enabled()) staticStory();
    else if (visible) start();
  }
  reduced.addEventListener('change', preferenceChanged);
  comfortableViewport.addEventListener('change', preferenceChanged);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else requestTick();
  });
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    if (!story.classList.contains('is-immersive')) return;
    const startY = scrollY + story.getBoundingClientRect().top;
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const distance = story.offsetHeight-stage.offsetHeight;
    scrollTo({ top: startY-top+distance*([.05,.5,.93][i]), behavior: 'instant' });
    progress = measure(); updateCopy(); requestTick();
  }));
  motionButton.addEventListener('click', () => {
    paused = !paused;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = paused ? 'Resume motion ▶' : 'Pause motion Ⅱ';
    if (!paused) requestTick();
  });
  addEventListener('pagehide', event => {
    cancelAnimationFrame(raf); raf = 0;
    if (!event.persisted) { observer.disconnect(); resize.disconnect(); scene?.dispose(); }
  });
  addEventListener('pageshow', requestTick);
}
