# Career Quest — Gamification Refresh & Asset Regeneration

**Date:** 2026-07-18
**Goal (user):** "improve gamify on this, and regenerate all assets. but keep the theme. i think i like the game move on career"
**Theme guardrail:** Everything stays inside the existing *Saturday-Morning Dev* cartoon system (DESIGN.md): cream paper, 3px ink outlines, hard offset pop shadows, bounce easing, Lilita One / Baloo 2 / Space Mono, the fixed accent palette. No new colors, no new fonts.

---

## 1. Problem

The site already has gamification *fragments* — 5 hidden DOM coins, a walkable
3D career level with its own XP bar, a boss-fight email meter, filter chips —
but they are **disconnected systems**: coins don't grant XP, the journey level
resets every visit, the boss gives nothing, there is no place to see overall
progress. The user explicitly likes the walkable career game ("the game move
on career"), so that becomes the centerpiece.

Assets are also stale or off-theme:

- `static/journey-*.png` are five ~2 MB AI-generated 1536×1024 *posters*
  cropped into ~72px timeline logo circles → ~10 MB of page weight for logos.
- `static/favicon.svg` / `.ico` / PNGs are still the **old editorial-brutalism
  identity** (near-black square, serif A, red dot) — the one theme relic left.
- `og:image` points at the raw profile photo instead of a branded card.

## 2. Approaches considered

1. **Patch in place** — sprinkle XP awards into quest.js, keep separate HUDs.
   Cheap, but keeps the incoherence; progress still not persistent or legible.
2. **Unified game core + journey as centerpiece** *(chosen)* — one persistent
   state module every mechanic reports to, one player HUD + quest log, and the
   3D career level upgraded into a real little game (character, collectibles,
   scenery, juice). Assets regenerated as hand-authored vector/procedural art.
3. **Full game engine rewrite** (physics, enemies, sprite sheets) — over-scope
   for a portfolio; risks burying the résumé content under the game.

## 3. Design

### 3.1 Game core — `js/game/state.js` (no deps)

Single source of truth, persisted in `localStorage["career-quest-v1"]`
(migrates old `quest-coins` key). State:

```
xp, coins:Set, checkpoints:Set, branches:Set, worldCoins:Set,
bossDefeated, shared, certsSeen, achievements:Set
```

- `award(action, id)` → applies XP, dedupes by id, returns
  `{ gained, levelUp, unlocked[] }` and notifies subscribers.
- XP values: hidden coin **+40**, world coin **+15**, checkpoint **+80**,
  branch trail **+30**, boss defeat **+150**, share card **+50**,
  certs section visit **+20**, achievement bonus **+25**.
- Levels (career-flavored titles): thresholds
  `0 / 100 / 250 / 450 / 700 / 1000 / 1400` →
  `Lv.0 Newbie, Lv.1 Intern, Lv.2 Junior Dev, Lv.3 Engineer, Lv.4 Senior,
  Lv.5 Lead, Lv.6 Legend`.
- Quests (drive both the log and achievements):
  `🪙 Coin Hunter 5, 🟡 Treasure Trail (world coins) 12, 🚩 Career Historian 5,
  🧭 Trail Explorer 4, ⚔️ Boss Slayer 1, 📸 Show-off 1, 🏅 Homework Checker 1`.
  Completing a quest unlocks its achievement (toast + fanfare + bonus XP);
  completing all → **100% ACHIEVEMENT — Portfolio Completionist**.

### 3.2 Player HUD + quest log — `js/ui/hud.js`

- Replaces `#coin-hud`. Fixed bottom-left cartoon sticker panel: level badge
  (`Lv.3 Engineer`), XP bar (yellow fill, ink track), coin count, and a `🗺️`
  button that opens the **quest log** — a pop-over panel listing each quest
  with a progress bar / check, plus total completion %. Esc / outside click
  closes; focus is trapped while open; `role="dialog"`.
- Appears after the first XP gain (same behavior as the old coin HUD) so
  first-paint stays clean.
- XP gains float a small `+40 XP` chip off the HUD (reuses `.dmg-pop` idea).

### 3.3 SFX — `js/lib/sfx.js`

Tiny WebAudio synth (no assets): `coin`, `jump`, `checkpoint` (arpeggio),
`hit`, `fanfare`, `boom`. AudioContext lazily created on first user gesture.
Mute toggle (🔊/🔇) added to the existing `.fx-controls` cluster, persisted
under `sfx-pref`, **default on**; fully skipped under reduced motion? No —
sound is orthogonal to motion; it obeys only its own toggle, but never plays
before a user gesture (browser policy guarantees this anyway).

### 3.4 Journey — the centerpiece (`js/three/journey.js`)

Procedural asset regeneration + gameplay:

- **Character**: replace the anonymous ball with a little toon adventurer
  (~9 toon parts): rounded body (capsule, coral), head with real face (eyes +
  smile decal spheres), yellow cap with brim, swinging arms, stepping feet,
  tiny backpack. Walk cycle (limb sin swing + bob + lean), idle breathe,
  **Space = jump** with squash-and-stretch and a dust-puff ring on landing.
- **World coins**: 12 spinning gold toon coins placed along the main path and
  side trails. Proximity collect → pop-and-rise animation, `+15 XP`, sfx,
  persisted (collected ones don't respawn). Journey UI shows `🪙 n/12`.
- **Era landmarks** behind each checkpoint flag, ≤7 primitives each, in the
  company's accent color: Samsung = mini office tower + antenna; tiket.com =
  paper plane on a pole; decorps = launching rocket; Elnusa = oil derrick;
  Agni = big cartoon flame (agni = fire). Plus deterministic scatter of toon
  trees / bushes / rocks that tint with the biome.
- **Checkpoint juice**: reaching a flag fires the screen-space confetti burst
  at the flag's projected position, pulses the ring, plants a ✓ banner color,
  plays the arpeggio, awards `checkpoint` XP through the game core.
- **Persistence**: previously-reached checkpoints/coins load pre-collected;
  journey XP bar shows global level/XP from the game core, not a local count.
- Perf budget: everything stays MeshToonMaterial primitives; scatter uses
  shared geometries/materials; target ≤ ~90 draw calls in the journey scene
  (still far below the hero scene's texture-free comfort zone).

### 3.5 Other mechanics wired into the core

- Hidden DOM coins → `award('coin', id)` (migrating previously found ones).
- Boss defeat → `award('boss')`; boss hits play `hit` sfx.
- Share card button → `award('share')`; card v2 shows level + quest completion
  and the drawn coin/emblem art instead of plain pills.
- Scrolling the certifications section into view once → `award('certs')`.

### 3.6 Asset regeneration (all vector / procedural, on-theme)

| Asset | Replacement |
|---|---|
| `static/journey-*.png` (5 × ~2 MB) | `static/emblem-{samsung,tiket,decorps,elnusa,agni}.svg` — hand-authored cartoon sticker badges: rounded square, 3px ink border, hard offset shadow, company accent fill (green/blue/purple/orange-yellow/pink), central motif (office tower / paper plane / rocket / oil derrick / flame). Old PNGs deleted (recoverable from git). |
| `static/favicon.svg` (old theme) | Gold cartoon coin with chunky ink "A" (drawn path, no font dependency), cream highlights — matches the quest-coin element on the page. |
| `favicon-32.png`, `apple-touch-icon.png`, `favicon.ico` | Re-rendered from the new SVG via a headless canvas render. |
| `og:image` (raw profile photo) | `static/og-card.png` — branded 1200×630 card (share-card art incl. photo), generated once via the same canvas code. |
| 3D scene assets | Regenerated procedurally per §3.4 (character, landmarks, scatter, coins). |
| Kept | `profile.png` (it's his actual face), cert issuer logos (third-party marks), `dashboard.jpeg` (real project screenshot). |

### 3.7 Files

```
js/game/state.js      new — game core
js/ui/hud.js          new — HUD + quest log
js/lib/sfx.js         new — WebAudio synth
js/ui/quest.js        rewired through core
js/ui/sharecard.js    v2 layout + game stats
js/three/journey.js   character/coins/landmarks/jump/persistence
js/ui/controls.js     + sound toggle
js/main.js            boot order: game core first
index.html            emblem imgs, favicon links, og meta, HUD host
styles.css            HUD/quest log/emblem styles
static/…              new SVGs + regenerated rasters, old posters deleted
DESIGN.md             updated (game system + file map)
```

### 3.8 Error handling & floors

Unchanged philosophy: game core + HUD are dependency-free and run even if
CDNs die; journey remains skipped on low-end mobile (DOM timeline is the
fallback); reduced-motion keeps static frames and no particle juice;
localStorage failures degrade to in-memory session state; all sfx behind
try/catch (no AudioContext → silent).

### 3.9 Testing

Run `npm test` for dependency-free structural, asset, accessibility-regression,
and JavaScript syntax checks. Then manually verify: console clean, each mechanic
awards XP once, persistence across reload, quest log accuracy, emblem/favicon
rendering, keyboard-only career-map play, mobile layout, and reduced motion.

## Self-review notes

- Scope check: single coherent feature set around one page — OK.
- YAGNI cuts made: no minimap, no enemies, no sprint, no sound packs, no
  konami code, no server anything.
- Ambiguity resolved: "regenerate all assets" = every *identity/journey*
  asset re-authored in-theme; real photos & third-party logos intentionally
  kept (documented in §3.6 table).
