/* ══════════════════════════════════════════════
   HUD — the player panel (level badge, XP bar, coin
   count) + the quest log dialog + the shared toast.
   Listens to game-core events and turns them into
   visible feedback: +XP chips, level-up / achievement
   toasts, fanfares. Dependency-free; builds its own
   DOM so the page works with the old markup gone.
   ══════════════════════════════════════════════ */
export function initHud(game, sfx) {
  // ── toast (shared with quest.js via the returned handle) ──
  const toastEl = document.getElementById('quest-toast');
  let toastTimer = null;
  function toast(msg, ms = 3200) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  // ── player HUD ──
  const hud = document.createElement('div');
  hud.className = 'player-hud';
  hud.innerHTML = `
    <button class="phud" id="phud-btn" type="button" aria-haspopup="dialog" aria-expanded="false" title="Open quest log">
      <span class="phud-lv" id="phud-lv">0</span>
      <span class="phud-mid">
        <span class="phud-title" id="phud-title">Newbie</span>
        <span class="phud-xp"><i id="phud-fill"></i></span>
      </span>
      <span class="phud-coin">🪙<b id="phud-coins">0</b></span>
      <span class="phud-map" aria-hidden="true">🗺️</span>
    </button>`;
  document.body.appendChild(hud);

  const log = document.createElement('div');
  log.className = 'quest-log';
  log.setAttribute('role', 'dialog');
  log.setAttribute('aria-modal', 'true');
  log.setAttribute('aria-labelledby', 'ql-title');
  log.hidden = true;
  document.body.appendChild(log);

  const btn = hud.querySelector('#phud-btn');
  const lvEl = hud.querySelector('#phud-lv');
  const titleEl = hud.querySelector('#phud-title');
  const fillEl = hud.querySelector('#phud-fill');
  const coinsEl = hud.querySelector('#phud-coins');
  let lastFocus = null;

  const focusables = () => [...log.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];

  function coinTotal() { return game.count('coin') + game.count('worldCoin'); }

  function render() {
    const lv = game.level();
    lvEl.textContent = lv.index;
    titleEl.textContent = lv.title;
    fillEl.style.width = Math.round(lv.progress * 100) + '%';
    coinsEl.textContent = coinTotal();
    hud.classList.toggle('show', game.xp() > 0);
    if (!log.hidden) renderLog();
  }

  function renderLog() {
    const pct = Math.round(game.completion() * 100);
    const lv = game.level();
    const rows = game.quests().map(q => `
      <li class="ql-row ${q.doneAll ? 'done' : ''}">
        <span class="ql-ic">${q.icon}</span>
        <span class="ql-txt"><b>${q.label}</b><small>${q.hint}</small></span>
        <span class="ql-num">${q.doneAll ? '✓' : `${q.count}/${q.target}`}</span>
      </li>`).join('');
    log.innerHTML = `
      <div class="ql-head">
        <span id="ql-title">🗺️ QUEST LOG — ${pct}%</span>
        <button class="ql-close" type="button" aria-label="Close quest log">✕</button>
      </div>
      <div class="ql-sub">Lv.${lv.index} ${lv.title} · ${game.xp()} XP${lv.nextXp ? ` · next level at ${lv.nextXp}` : ' · MAX'}</div>
      <ul class="ql-list" role="list">${rows}</ul>
      <div class="ql-foot">${pct >= 100 ? '👑 all quests complete — you legend!' : 'explore the page (and the career map) to earn XP'}</div>`;
    log.querySelector('.ql-close').addEventListener('click', close);
  }

  function open() {
    lastFocus = document.activeElement;
    renderLog();
    log.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    const c = log.querySelector('.ql-close');
    c && c.focus();
  }
  function close() {
    if (log.hidden) return;
    log.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    else btn.focus();
  }
  btn.addEventListener('click', () => (log.hidden ? open() : close()));
  document.addEventListener('keydown', e => {
    if (log.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (!items.length) { e.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('pointerdown', e => {
    if (!log.hidden && !log.contains(e.target) && !hud.contains(e.target)) close();
  });

  // ── +XP chip ──
  function xpChip(gained) {
    if (!gained) return;
    const el = document.createElement('span');
    el.className = 'xp-pop';
    el.textContent = `+${gained} XP`;
    hud.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ── react to game events ──
  const MSG = {
    coin: () => `🪙 Coin found! ${game.count('coin')}/5`,
    boss: () => '🏆 FINAL BOSS DOWN — now send that email for real! ⚔️',
    share: () => '📸 Share card saved!',
  };
  game.onChange(evt => {
    render();
    xpChip(evt.gained);
    const big = evt.unlocked.find(u => u.id === 'all');
    if (big) {
      toast(`👑 100% COMPLETE — ${big.label}! You actually did it all.`, 5200);
      sfx.play('fanfare');
    } else if (evt.unlocked.length) {
      toast(`🏆 ACHIEVEMENT — ${evt.unlocked[0].label}!`, 4200);
      sfx.play('fanfare');
    } else if (evt.levelUp) {
      toast(`⬆️ LEVEL UP — Lv.${evt.levelUp.index} ${evt.levelUp.title}!`, 3600);
      sfx.play('fanfare');
    } else if (MSG[evt.action]) {
      toast(MSG[evt.action](), 2200);
    }
  });

  render();
  return { toast };
}
