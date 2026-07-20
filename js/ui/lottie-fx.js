/* ══════════════════════════════════════════════
   LOTTIE — hand-authored cartoon animations
   (spinning star badge + bouncy scroll arrow).
   Uses the global `lottie` from the CDN script tag.
   ══════════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initLottie() {
  if (reduceMotion || typeof lottie === 'undefined') return;

  const YELLOW = [1, 0.788, 0.235, 1];
  const INK    = [0.137, 0.137, 0.231, 1];
  const lin = { i: { x: [0.45], y: [1] }, o: { x: [0.45], y: [0] } };

  const starData = {
    v: '5.7.4', fr: 30, ip: 0, op: 120, w: 32, h: 32, nm: 'star', ddd: 0, assets: [],
    layers: [{
      ddd: 0, ind: 1, ty: 4, sr: 1, ao: 0, ip: 0, op: 120, st: 0, bm: 0,
      ks: {
        p: { a: 0, k: [16, 16] }, a: { a: 0, k: [0, 0] },
        s: { a: 1, k: [{ t: 0, s: [100, 100], e: [115, 115], ...lin }, { t: 60, s: [115, 115], e: [100, 100], ...lin }, { t: 120 }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360], i: { x: [0.6], y: [1] }, o: { x: [0.4], y: [0] } }, { t: 120 }] },
        o: { a: 0, k: 100 },
      },
      shapes: [{
        ty: 'gr',
        it: [
          {
            ty: 'sh',
            ks: { a: 0, k: {
              c: true,
              v: [[0, -12], [3, -3], [12, 0], [3, 3], [0, 12], [-3, 3], [-12, 0], [-3, -3]],
              i: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
              o: [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]],
            } },
          },
          { ty: 'fl', c: { a: 0, k: YELLOW }, o: { a: 0, k: 100 } },
          { ty: 'st', c: { a: 0, k: INK }, o: { a: 0, k: 100 }, w: { a: 0, k: 2.5 }, lc: 2, lj: 2 },
          { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      }],
    }],
  };

  const chevron = (oKeys, pKeys) => ({
    ddd: 0, ind: 1, ty: 4, sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
    ks: {
      p: { a: 1, k: pKeys },
      a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 },
      o: { a: 1, k: oKeys },
    },
    shapes: [{
      ty: 'gr',
      it: [
        {
          ty: 'sh',
          ks: { a: 0, k: { c: false, v: [[-8, -3.5], [0, 4.5], [8, -3.5]], i: [[0,0],[0,0],[0,0]], o: [[0,0],[0,0],[0,0]] } },
        },
        { ty: 'st', c: { a: 0, k: INK }, o: { a: 0, k: 100 }, w: { a: 0, k: 4 }, lc: 2, lj: 2 },
        { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
    }],
  });
  const scrollData = {
    v: '5.7.4', fr: 30, ip: 0, op: 60, w: 46, h: 46, nm: 'scroll', ddd: 0, assets: [],
    layers: [
      chevron([{ t: 0, s: [0], e: [95], ...lin }, { t: 10, s: [95], e: [0], ...lin }, { t: 45 }],
              [{ t: 0, s: [23, 12], e: [23, 32], ...lin }, { t: 45 }]),
      chevron([{ t: 15, s: [0], e: [95], ...lin }, { t: 25, s: [95], e: [0], ...lin }, { t: 60 }],
              [{ t: 15, s: [23, 12], e: [23, 32], ...lin }, { t: 60 }]),
    ],
  };

  const mount = (id, data) => {
    const el = document.getElementById(id);
    if (!el) return;
    lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: data });
  };
  mount('lottie-star', starData);
  mount('lottie-scroll', scrollData);
}
