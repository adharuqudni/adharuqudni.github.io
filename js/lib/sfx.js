/* ══════════════════════════════════════════════
   SFX — tiny WebAudio chiptune synth, zero assets.
   The AudioContext is created lazily on the first
   play() (always downstream of a user gesture), so
   autoplay policy is never an issue. Muting persists;
   any WebAudio failure just means silence.
   ══════════════════════════════════════════════ */
const KEY = 'sfx-pref';

export function initSfx() {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === 'off'; } catch {}

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    return ctx;
  }

  /* one enveloped oscillator note */
  function tone(freq, t0, dur, { type = 'square', vol = 0.05, to = null } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  const RECIPES = {
    coin(t)  { tone(988, t, 0.09); tone(1319, t + 0.08, 0.22); },
    jump(t)  { tone(300, t, 0.18, { type: 'triangle', to: 640, vol: 0.06 }); },
    land(t)  { tone(180, t, 0.1, { type: 'triangle', to: 120, vol: 0.05 }); },
    hit(t)   { tone(220, t, 0.08, { to: 110, vol: 0.06 }); tone(90, t, 0.12, { type: 'triangle', vol: 0.07 }); },
    checkpoint(t) { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.16, { vol: 0.055 })); },
    fanfare(t)    { [392, 523, 659, 784, 659, 1047].forEach((f, i) => tone(f, t + i * 0.11, i === 5 ? 0.5 : 0.14, { vol: 0.06 })); },
    boom(t)  { tone(200, t, 0.6, { type: 'sawtooth', to: 45, vol: 0.08 }); tone(100, t, 0.5, { type: 'triangle', to: 40, vol: 0.08 }); },
  };

  return {
    play(name) {
      if (muted || !RECIPES[name]) return;
      try {
        ensure();
        if (ctx.state === 'suspended') ctx.resume();
        RECIPES[name](ctx.currentTime + 0.001);
      } catch {}
    },
    muted: () => muted,
    setMuted(v) {
      muted = v;
      try { localStorage.setItem(KEY, v ? 'off' : 'on'); } catch {}
    },
  };
}
