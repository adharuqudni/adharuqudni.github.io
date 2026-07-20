/* ══════════════════════════════════════════════
   GAME CORE — Career Quest state.
   Single source of truth for XP, level, quests and
   achievements. Every mechanic (hidden coins, the
   walkable journey, boss fight, share card) reports
   here via award(); the HUD and share card read from
   here. Dependency-free; persists to localStorage and
   degrades to in-memory state if storage is blocked.
   ══════════════════════════════════════════════ */
const KEY = 'career-quest-v1';
const LEGACY_COINS = 'quest-coins';

const XP = { coin: 40, worldCoin: 15, checkpoint: 80, branch: 30, loot: 20, totem: 15, boss: 150, share: 50, certs: 20 };
const ACH_BONUS = 25;

export const LEVELS = [
  { xp: 0,    title: 'Newbie' },
  { xp: 100,  title: 'Intern' },
  { xp: 250,  title: 'Junior Dev' },
  { xp: 450,  title: 'Engineer' },
  { xp: 700,  title: 'Senior' },
  { xp: 1000, title: 'Lead' },
  { xp: 1400, title: 'Legend' },
];

const QUESTS = [
  { id: 'coin',       icon: '🪙', label: 'Coin Hunter',      hint: 'find the 5 coins hidden on the page', target: 5 },
  { id: 'worldCoin',  icon: '🟡', label: 'Treasure Trail',   hint: 'grab every coin on the career map',   target: 12 },
  { id: 'checkpoint', icon: '🚩', label: 'Career Historian', hint: 'walk to all 5 job flags',             target: 5 },
  { id: 'branch',     icon: '🧭', label: 'Trail Explorer',   hint: 'visit the 4 side trails',             target: 4 },
  { id: 'loot',       icon: '🎁', label: 'Loot Collector',   hint: 'open every project chest on the map', target: 12 },
  { id: 'totem',      icon: '🧰', label: 'Tool Master',      hint: 'check the 3 toolbox crates',          target: 3 },
  { id: 'boss',       icon: '⚔️', label: 'Boss Slayer',      hint: 'defeat the final boss with an email', target: 1 },
  { id: 'share',      icon: '📸', label: 'Show-off',         hint: 'generate the share card',             target: 1 },
  { id: 'certs',      icon: '🏅', label: 'Homework Checker', hint: 'check out the certificates',          target: 1 },
];
const ALL_DONE = { id: 'all', icon: '👑', label: 'Portfolio Completionist', hint: 'finish every quest' };

export function initGame() {
  const s = { xp: 0, done: {}, achievements: new Set() };
  QUESTS.forEach(q => { s.done[q.id] = new Set(); });

  // ── load (with legacy coin migration) ──
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      s.xp = j.xp | 0;
      QUESTS.forEach(q => { s.done[q.id] = new Set(j.done && j.done[q.id] || []); });
      s.achievements = new Set(j.achievements || []);
    } else {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_COINS) || '[]');
      legacy.forEach(id => s.done.coin.add(String(id)));
      s.xp = s.done.coin.size * XP.coin;
    }
  } catch { /* storage blocked → fresh in-memory run */ }

  function save() {
    try {
      const done = {};
      QUESTS.forEach(q => { done[q.id] = [...s.done[q.id]]; });
      localStorage.setItem(KEY, JSON.stringify({ xp: s.xp, done, achievements: [...s.achievements] }));
      localStorage.setItem(LEGACY_COINS, JSON.stringify([...s.done.coin])); // keep legacy readers happy
    } catch {}
  }

  const listeners = [];
  function notify(evt) { listeners.forEach(fn => { try { fn(evt); } catch {} }); }

  function levelAt(xp) {
    let i = 0;
    while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
    const cur = LEVELS[i], next = LEVELS[i + 1];
    return {
      index: i,
      title: cur.title,
      progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
      nextXp: next ? next.xp : null,
    };
  }

  const questView = q => {
    const count = Math.min(s.done[q.id].size, q.target);
    return { ...q, count, doneAll: count >= q.target };
  };

  const api = {
    /* record an action once per (action, id); returns null if already done */
    award(action, id = '1') {
      if (!(action in s.done)) return null;
      id = String(id);
      if (s.done[action].has(id)) return null;

      const before = levelAt(s.xp);
      s.done[action].add(id);
      let gained = XP[action] || 0;

      const unlocked = [];
      QUESTS.forEach(q => {
        if (questView(q).doneAll && !s.achievements.has(q.id)) {
          s.achievements.add(q.id);
          gained += ACH_BONUS;
          unlocked.push(q);
        }
      });
      if (QUESTS.every(q => questView(q).doneAll) && !s.achievements.has(ALL_DONE.id)) {
        s.achievements.add(ALL_DONE.id);
        gained += ACH_BONUS * 2;
        unlocked.push(ALL_DONE);
      }

      s.xp += gained;
      const after = levelAt(s.xp);
      save();

      const evt = { action, id, gained, unlocked, levelUp: after.index > before.index ? after : null };
      notify(evt);
      return evt;
    },

    has: (action, id = '1') => !!s.done[action] && s.done[action].has(String(id)),
    ids: action => new Set(s.done[action] || []),
    count: action => (s.done[action] ? s.done[action].size : 0),
    xp: () => s.xp,
    level: () => levelAt(s.xp),
    quests: () => QUESTS.map(questView),
    completion() {
      const qs = api.quests();
      return qs.reduce((a, q) => a + q.count / q.target, 0) / qs.length;
    },
    achievementCount: () => s.achievements.size,
    onChange(fn) { listeners.push(fn); },
  };
  return api;
}
