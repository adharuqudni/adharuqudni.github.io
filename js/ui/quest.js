/* ══════════════════════════════════════════════
   QUEST — page mechanics wired into the game core:
   hidden coins, the certs-section quest, side-quest
   filters, the final-boss email meter, and flag-focus
   (a journey flag click scrolls to its timeline card).
   All progress/toasts flow through game + hud; visual
   flourishes (burst, pulse) are injected from main.
   ══════════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initQuest(game, hud, sfx) {
  let burst = () => {};
  let cardPulse = () => {};

  // ── hidden coins ──
  const coins = [...document.querySelectorAll('.quest-coin')];
  coins.forEach(c => {
    if (game.has('coin', c.dataset.coin)) c.style.display = 'none';
    c.addEventListener('click', () => {
      const evt = game.award('coin', c.dataset.coin);
      if (!evt) return;
      c.classList.add('collected');            // CSS coinPop handles the pop
      const r = c.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 24, 0);
      sfx.play('coin');
    });
  });

  // ── certs quest — seeing the homework counts ──
  const certs = document.getElementById('certifications');
  if (certs && !game.has('certs')) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { game.award('certs'); obs.disconnect(); }
      });
    }, { threshold: 0.35 });
    obs.observe(certs);
  }

  // ── side-quest filters ──
  const filterChips = [...document.querySelectorAll('.filter-chip')];
  const projectCards = [...document.querySelectorAll('.project-card[data-cat]')];
  const filterStatus = document.createElement('p');
  filterStatus.className = 'sr-only';
  filterStatus.setAttribute('role', 'status');
  filterStatus.setAttribute('aria-live', 'polite');
  document.querySelector('.filter-chips')?.after(filterStatus);

  function applyFilter(filter, { syncUrl = true, announce = true } = {}) {
    const chip = filterChips.find(c => c.dataset.filter === filter) || filterChips[0];
    if (!chip) return;
    const selected = chip.dataset.filter;
    filterChips.forEach(c => {
      const active = c === chip;
      c.classList.toggle('active', active);
      c.setAttribute('aria-pressed', String(active));
    });
    let visible = 0;
    projectCards.forEach(card => {
      const hidden = selected !== 'all' && card.dataset.cat !== selected;
      card.classList.toggle('filtered-out', hidden);
      card.hidden = hidden;
      if (!hidden) visible++;
    });
    if (announce) filterStatus.textContent = `${visible} side-quest projects shown.`;
    if (syncUrl) {
      const url = new URL(window.location.href);
      if (selected === 'all') url.searchParams.delete('filter');
      else url.searchParams.set('filter', selected);
      url.hash = 'projects';
      history.replaceState(null, '', url);
    }
  }

  filterChips.forEach(chip => chip.addEventListener('click', () => applyFilter(chip.dataset.filter)));
  const initialFilter = new URLSearchParams(window.location.search).get('filter') || 'all';
  applyFilter(initialFilter, { syncUrl: false, announce: false });

  // ── final boss minigame — combo attacks + a killing email ──
  const bossFill = document.getElementById('boss-hp');
  const bossName = document.getElementById('boss-name');
  const bossHint = document.getElementById('boss-hint');
  const bossUi = document.querySelector('.boss-ui');
  const bossBar = document.getElementById('boss-bar');
  const bossAttack = document.getElementById('boss-attack');
  const bossCombo = document.getElementById('boss-combo');
  if (bossFill && bossName && bossHint && bossUi) {
    let hp = 100, combo = 0, lastHit = 0, dead = game.has('boss');

    function shake() {
      if (reduceMotion) return;
      bossUi.classList.remove('boss-shake');
      void bossUi.offsetWidth;
      bossUi.classList.add('boss-shake');
    }

    function popDamage(x, y, dmg, crit) {
      if (reduceMotion) return;
      const el = document.createElement('span');
      el.className = 'dmg-pop' + (crit ? ' crit' : '');
      el.textContent = '-' + dmg;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 850);
    }

    function showCombo() {
      if (!bossCombo) return;
      if (combo > 1) {
        bossCombo.textContent = `COMBO ×${combo}!`;
        bossCombo.classList.add('show');
        if (!reduceMotion) { bossCombo.classList.remove('bump'); void bossCombo.offsetWidth; bossCombo.classList.add('bump'); }
      } else {
        bossCombo.classList.remove('show');
      }
    }

    function paintDead() {
      bossFill.style.width = '0%';
      bossFill.classList.add('dead');
      bossName.textContent = '💥 BOSS DEFEATED — QUEST COMPLETE!';
      bossHint.textContent = 'critical hit: one email sent ⚔️🏆';
      if (bossCombo) bossCombo.classList.remove('show');
    }
    if (dead) paintDead();   // returning champion

    function defeat() {
      dead = true; hp = 0;
      paintDead();
      const r = bossFill.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top, 44);
      sfx.play('boom');
      game.award('boss');
    }

    function attack(x, y) {
      if (dead) return;
      const now = performance.now();
      combo = (now - lastHit < 900) ? combo + 1 : 1;
      lastHit = now;
      const mult = 1 + Math.min(combo - 1, 5) * 0.5;         // up to ×3.5
      const crit = combo >= 4;
      const dmg = Math.round((6 + Math.random() * 5) * mult);
      hp = Math.max(hp - dmg, 1);                             // clicks can't kill — email does
      bossFill.style.width = hp + '%';
      bossFill.style.background = hp < 35 ? 'linear-gradient(90deg,#ff8a3c,#ffc93c)' : '';
      shake();
      burst(x, y, 8 + combo * 2);
      popDamage(x, y, dmg, crit);
      showCombo();
      sfx.play('hit');
      bossHint.textContent = hp <= 1
        ? 'boss is on the ropes — finish it with an email ⚔️'
        : `${crit ? 'CRIT! ' : ''}boss HP ${hp}/100`;
    }

    const onAttack = e => {
      const r = (e.currentTarget || bossAttack).getBoundingClientRect();
      attack(r.left + r.width / 2, r.top + r.height / 2);
    };
    bossAttack && bossAttack.addEventListener('click', onAttack);
    bossBar && bossBar.addEventListener('click', e => attack(e.clientX, e.clientY));
    bossBar && bossBar.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAttack({ currentTarget: bossBar }); }
    });

    // the email is the finisher
    const email = document.querySelector('#contact a[href^="mailto:"]');
    email && email.addEventListener('click', () => { if (!dead) defeat(); });
  }

  // ── flag focus (called by the 3D journey on flag click) ──
  const tlCards = [...document.querySelectorAll('.tl-card')];
  function focusStage(index) {
    const card = tlCards[index];
    if (!card) return;
    card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    cardPulse(card);
  }

  return {
    focusStage,
    setBurst: f => { if (f) burst = f; },
    setCardPulse: f => { if (f) cardPulse = f; },
  };
}
