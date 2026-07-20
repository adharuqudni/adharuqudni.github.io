/* ══════════════════════════════════════════════
   CONTROLS — a small fixed cluster with three toggles:
   • Motion  — in-page pause of all animation (overrides
               OS setting either way), persisted.
   • Sound   — mutes the chiptune SFX layer, persisted.
   • Perf    — live FPS / draw-call / triangle HUD, also
               togglable with the "P" key.
   Reads/drives the 3D layer handle + the sfx module.
   ══════════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function button(icon, label, title) {
  const b = document.createElement('button');
  b.className = 'fx-btn';
  b.type = 'button';
  b.title = title;
  b.setAttribute('aria-pressed', 'false');
  b.innerHTML = `<span class="fx-ic" aria-hidden="true">${icon}</span><span class="fx-lb">${label}</span>`;
  return b;
}

const typing = e => !!e.target.closest?.('input, textarea, [contenteditable]');

export function initControls(three, sfx) {
  const cluster = document.createElement('div');
  cluster.className = 'fx-controls';
  const panel = document.createElement('div');
  panel.className = 'fx-panel';
  panel.id = 'fx-panel';
  const motionBtn = button('⏸', 'Motion', 'Pause all motion');
  const soundBtn = button('🔊', 'Sound', 'Mute game sounds');
  const perfBtn = button('⚡', 'FPS', 'Toggle performance HUD (P)');
  const menuBtn = document.createElement('button');
  menuBtn.className = 'fx-menu-toggle';
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', 'Display settings');
  menuBtn.setAttribute('aria-controls', panel.id);
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.innerHTML = '<span aria-hidden="true">⚙</span>';
  panel.append(motionBtn, soundBtn, perfBtn);
  cluster.append(panel, menuBtn);
  document.body.appendChild(cluster);

  function closePanel(restoreFocus = false) {
    if (!cluster.classList.contains('open')) return;
    cluster.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', () => {
    const open = cluster.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) motionBtn.focus();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cluster.classList.contains('open')) {
      e.preventDefault();
      closePanel(true);
    }
  });
  document.addEventListener('pointerdown', e => {
    if (!cluster.contains(e.target)) closePanel();
  });

  // ── sound toggle ──
  function paintSound() {
    const off = sfx.muted();
    soundBtn.classList.toggle('off', off);
    soundBtn.setAttribute('aria-pressed', String(off));
    soundBtn.querySelector('.fx-ic').textContent = off ? '🔇' : '🔊';
    soundBtn.querySelector('.fx-lb').textContent = off ? 'Muted' : 'Sound';
  }
  paintSound();
  soundBtn.addEventListener('click', () => {
    sfx.setMuted(!sfx.muted());
    paintSound();
    sfx.play('coin');   // silent when muted — audible confirmation when unmuting
  });

  // ── perf HUD ──
  const hud = document.createElement('div');
  hud.className = 'perf-hud';
  hud.hidden = true;
  hud.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hud);
  let hudOn = false;
  function paint() {
    if (!hudOn) return;
    const s = three.stats || { fps: 0, calls: 0, tris: 0 };
    hud.textContent = `${Math.round(s.fps)} FPS · ${s.calls} draws · ${(s.tris / 1000).toFixed(1)}k tris`;
    requestAnimationFrame(paint);
  }
  function toggleHud() {
    hudOn = !hudOn;
    hud.hidden = !hudOn;
    perfBtn.classList.toggle('on', hudOn);
    perfBtn.setAttribute('aria-pressed', String(hudOn));
    if (hudOn) paint();
  }
  perfBtn.addEventListener('click', toggleHud);
  document.addEventListener('keydown', e => { if ((e.key === 'p' || e.key === 'P') && !typing(e)) toggleHud(); });

  // ── motion toggle (persisted; default follows OS) ──
  const KEY = 'motion-pref';
  const stored = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  let on = stored ? stored === 'on' : !reduceMotion;

  function apply(v, persist) {
    three.setMotion && three.setMotion(v);
    motionBtn.classList.toggle('off', !v);
    motionBtn.setAttribute('aria-pressed', String(!v));
    motionBtn.querySelector('.fx-ic').textContent = v ? '⏸' : '▶';
    motionBtn.querySelector('.fx-lb').textContent = v ? 'Motion' : 'Paused';
    if (persist) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch {} }
  }
  apply(on, false);
  motionBtn.addEventListener('click', () => { on = !on; apply(on, true); });
}
