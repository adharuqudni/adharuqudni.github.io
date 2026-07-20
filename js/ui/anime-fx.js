/* ══════════════════════════════════════════════
   ANIME FX — anime.js v4 enhancement layer.
   Loaded dynamically; if the CDN is unreachable the
   rest of the site is unaffected (see main.js). Used
   for the hero entrance and the flag-focus card pulse.
   ══════════════════════════════════════════════ */
import { animate, stagger, utils } from 'animejs';

const HERO_SEL = ['.hero-hi', '.hero-name', '.hero-portrait', '.hero-bubble', '.hero-cta .btn'];

/* staggered hero entrance. Elements are hidden here (not in CSS) so a failed
   anime import leaves them visible rather than blank. */
export function heroIntro() {
  const nodes = document.querySelectorAll(HERO_SEL.join(','));
  if (!nodes.length) return;
  utils.set(nodes, { opacity: 0 });

  animate('.hero-hi',       { opacity: [0, 1], y: [18, 0], duration: 700, ease: 'outExpo', delay: 100 });
  animate('.hero-name',     { opacity: [0, 1], y: [42, 0], duration: 850, ease: 'outExpo', delay: stagger(140, { start: 240 }) });
  animate('.hero-portrait', { opacity: [0, 1], scale: [0.85, 1], duration: 700, ease: 'outBack', delay: 560 });
  animate('.hero-bubble',   { opacity: [0, 1], x: [30, 0], duration: 700, ease: 'outExpo', delay: 660 });
  animate('.hero-cta .btn', { opacity: [0, 1], y: [16, 0], duration: 640, ease: 'outExpo', delay: stagger(90, { start: 820 }) });
}

/* brief pop when a journey flag scrolls you to its timeline card */
export function cardPulse(card) {
  if (!card) return;
  animate(card, { scale: [1, 1.045, 1], duration: 620, ease: 'inOutQuad' });
}
