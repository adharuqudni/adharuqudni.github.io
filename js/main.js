/* ══════════════════════════════════════════════
   ENTRY — boots the page.
   Dependency-free layers (game core, HUD, nav, quest,
   lottie, controls, share card) load statically and
   always run. The CDN-backed layers (three.js 3D +
   playable level, anime.js FX) are imported dynamically
   inside try/catch so a CDN outage degrades gracefully.
   ══════════════════════════════════════════════ */
import { initDom } from './ui/dom.js';
import { initGame } from './game/state.js';
import { initSfx } from './lib/sfx.js';
import { initHud } from './ui/hud.js';
import { initQuest } from './ui/quest.js';
import { initLottie } from './ui/lottie-fx.js';
import { initControls } from './ui/controls.js';
import { initShareCard } from './ui/sharecard.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initDom();
const game = initGame();
const sfx = initSfx();
const hud = initHud(game, sfx);
const quest = initQuest(game, hud, sfx);
initLottie();
initShareCard(game);

// ── 3D layer (three.js): scenes + walkable journey ──
let three = { burst: () => {}, stats: { fps: 0, calls: 0, tris: 0 }, setMotion: () => {} };
try {
  const { initThree } = await import('./three/index.js');
  three = initThree({ onFlagClick: quest.focusStage, game, sfx });
} catch (e) {
  console.warn('3D layer unavailable:', e);
}
quest.setBurst(three.burst);
initControls(three, sfx);

// ── anime.js FX layer ──
try {
  const fx = await import('./ui/anime-fx.js');
  quest.setCardPulse(fx.cardPulse);
  if (!reduceMotion) fx.heroIntro();
} catch (e) {
  console.warn('anime.js layer unavailable:', e);
}
