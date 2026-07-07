# Design System — Annas Adharuqudni Portfolio

**Theme name:** Saturday-Morning Dev — cartoon pop
**Vibe:** playful, hand-drawn, sticker-book energy. Thick black outlines, bright flat colors, bouncy hover states, hard drop-shadows instead of soft blur. Built to feel like a comic-book / toy-shelf version of a software engineer's résumé.

---

## 1. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | `Lilita One` (fallback `Comic Sans MS`, cursive) | Big rounded cartoon letterforms. Used for names, section titles, card titles. |
| Body | `Baloo 2` (fallback `Segoe UI`, sans-serif) | Rounded, friendly, weight 500–800. Used for paragraphs, buttons, labels. |
| Mono / stickers | `Space Mono` (fallback `Consolas`, monospace) | Used for pills, code stickers, kickers, tags — anything that should feel "technical" or terminal-like inside the cartoon frame. |

Loaded via Google Fonts in `index.html`:
```
Lilita+One
Baloo+2:wght@400;500;600;700;800
Space+Mono:ital,wght@0,400;0,700;1,400
```

**Text treatment for emphasis (`em` in titles):**
Outlined fill using `-webkit-text-stroke` + `text-shadow` offset to fake a sticker/pop-out effect:
```css
color: var(--yellow);
-webkit-text-stroke: 2-3px var(--ink);
paint-order: stroke fill;
text-shadow: 4-6px 4-6px 0 var(--ink);
```

---

## 2. Color Tokens

Defined in `:root` in `styles.css`.

### Base
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FFF4DC` | Page background (warm cream) |
| `--paper2` | `#FFEAC2` | Deeper cream (nested panels) |
| `--ink` | `#23233B` | Universal outline / text color |
| `--white` | `#FFFFFF` | Cards, buttons, bubbles |
| `--night` | `#232850` | Contact section background (night sky) |

### Accents (each has a `2`-suffixed pale/pastel variant for panel fills)
| Token | Hex | Pastel (`*2`) |
|---|---|---|
| `--yellow` | `#FFC93C` | `#FFE08A` |
| `--pink` | `#FF6B97` | `#FFD0DE` |
| `--coral` | `#FF5D5D` | — (text emphasis only) |
| `--blue` | `#5BA8FF` | `#BFE0FF` |
| `--green` | `#53D387` | `#C5EFD3` |
| `--purple` | `#A78BFA` | `#E2D6FF` |
| `--orange` | `#FF9F45` | — |

**Usage rule:** solid accent = interactive/hot elements (buttons, hover, "NOW" badges). Pastel `*2` = static panel/card backgrounds (skills, timeline pills, education cards).

---

## 3. Signature Effects

### Hard shadow / "pop" (the core visual signature)
No blur, ever — just a solid offset duplicate:
```css
--pop:    6px 6px 0 var(--ink);
--pop-sm: 4px 4px 0 var(--ink);
--pop-lg: 9px 9px 0 var(--ink);
```
Applied to: buttons, cards, pills, badges, chips, tags, portrait frame, code stickers.

### Outline
Every discrete shape gets a 3px solid ink border:
```css
--line: 3px solid var(--ink);
```

### Bounce easing
All hover/reveal transforms use an overshoot cubic-bezier so things feel springy, not linear:
```css
--bounce: cubic-bezier(.34, 1.56, .64, 1);
```

### Hand-placed tilt
Cards are never perfectly aligned — alternating rotation gives a "stuck on with tape" feel:
```css
transform: rotate(-1deg) / rotate(1deg) / rotate(-2deg) / rotate(3deg) ...
```
Rotation resets toward 0° on hover (`:hover { transform: rotate(0) translateY(-Npx) }`) combined with a bigger shadow (`--pop` → `--pop-lg`) to simulate the card lifting off the page.

### Dot-grid background
```css
background: radial-gradient(rgba(35,35,59,0.07) 1.5px, transparent 1.6px), var(--paper);
background-size: 22px 22px, auto;
```
Same pattern in `--yellow` on the mobile nav overlay, and in white-on-navy for the contact section.

---

## 4. Components

### Buttons (`.btn`)
White or yellow fill, thick border, `--pop` shadow. On hover: translate up-left + bigger shadow. On active (press): translate down-right + shadow collapses to 0 (physically "pressed into the page").
Variants: `.btn-yellow`, `.btn-white`, `.btn-sm`, `.btn-big`.

### Pills (`.pill`)
Small rounded-full mono-font labels (dates, categories) — `pill-green/blue/purple/orange/pink` background variants.

### Badges (`.badge`)
Rotated sticker-style label overlapping a heading (e.g. "NOW!", "🥇 GOLD", "FOUNDER"). Always has its own shadow + rotation independent of parent.

### Chips & Tags (`.chip`, `.tag`)
Chips = skill pills in the toolbox section, bold, hover-lifts. Tags = smaller mono tech labels on project cards (no hover animation, informational only).

### Speech bubble (`.speech-bubble`)
White card with a css-triangle "tail" (rotated square, border-matched) pointing at the portrait photo. Reflows to point upward on mobile stacking.

### Timeline (`.timeline`, `.tl-card`)
Zig-zag two-column card list connected by a dashed vertical line (`.timeline-line`), with a circular numbered "pin" badge (`.tl-pin`) floating at the card's outer edge. Collapses to a single left-aligned column with pins on the left on tablet/mobile.

### Code sticker (`.code-sticker`)
Dark rounded card styled like a mini code editor window (traffic-light dots + mono text), used inside featured project panels instead of plain code blocks.

### Cert marquee (`.marquee-track` / `.reverse`)
Two infinite-scroll rows moving in opposite directions, built from `.cert-card` stickers with alternating tilt.

---

## 5. Motion

| Interaction | Behavior |
|---|---|
| Scroll reveal (`.reveal`) | Pop-in: opacity 0→1 + `translateY(36px) scale(0.96)` → none, via `--bounce` easing, staggered with `.reveal-d1/d2/d3` delay classes. Tilted elements re-apply their signature rotation once revealed (see the `.reveal.visible:nth-child` overrides) so the pop-in doesn't flatten the "stuck on with tape" look. |
| Hover (cards/buttons) | Rotation → 0°, lift via `translateY`, shadow grows from `--pop` to `--pop-lg`. |
| Button press | Shadow collapses to 0, element translates into the shadow's former position. |
| Marquee / strip ticker | Linear infinite scroll, pauses on hover (`marquee-track:hover { animation-play-state: paused }`). |
| Hero badge entrance | `popIn` keyframe: scale 0.7 + rotate(-6deg) → scale 1 + rotate(-2deg). |
| Reduced motion | All animation/transition durations forced to `0.01ms`; reveals shown fully opaque with no transform; marquees and 3D loops stopped (single static frame rendered instead). |

---

## 6. 3D Layer (Three.js) — `three-scene.js`

Cartoon "cel-shaded" toon rendering, not realistic 3D:

- **Toon material recipe:** `MeshToonMaterial` with a 3-step hand-rolled gradient map (harsh light/mid/dark bands, no smooth gradient) + an inflated inverted-normal "shell" mesh (`MeshBasicMaterial`, `BackSide`, ink color, scaled up ~7%) behind it. The shell is what produces the thick black outline around every 3D shape — same trick as the CSS `--pop` shadow, just in 3D.
- **Hero scene** (`#hero-canvas`): six floating toy-primitives (torus, sphere, cone, torus-knot, octahedron) in the accent palette, bobbing on individual sine-wave loops and drifting with a soft mouse-parallax camera. Positions scale inward (`X` multiplier) on mobile viewports so they don't collide with text.
- **Contact scene** (`#contact-canvas`): a toon planet (sphere) with a tilted ring (torus) and an orbiting moon on its own pivot group, sitting in the bottom-right of the night-sky section.
- Both scenes pause their render loop when their section leaves the viewport (`IntersectionObserver`) and respect `prefers-reduced-motion` (render one static frame, no `requestAnimationFrame` loop).
- Wrapped in try/catch — if WebGL is unavailable, the canvases simply stay empty and the rest of the page is unaffected.

---

## 7. Lottie Layer — `app.js`

Two animations, **authored inline as raw Lottie JSON** (no external asset files) so there's nothing to fetch:

1. **Star badge** (`#lottie-star`, hero "Open to new challenges" pill) — a spinning + pulsing 4-point star.
2. **Scroll hint** (`#lottie-scroll`, bottom of hero) — two chunky chevrons bouncing downward in sequence, mimicking a "scroll down" affordance.

Both skip mounting entirely under `prefers-reduced-motion`.

---

## 8. Layout / Responsive Rules

- **Breakpoints:** `1024px` (tablet — nav collapses to hamburger, grids go to 1–2 columns, timeline goes single-column-left-aligned), `640px` (mobile — stacked hero bubble, 2-col stat grid, full-width buttons/links).
- **Section rhythm:** every content section uses `.section-head` (kicker pill + big title) followed by a content grid — this pattern repeats for Journey, Toolbox, Projects, Certifications, Education, so a reader always sees "label → punchline → content."
- **Touch devices:** `@media (hover: none)` disables hover-lift transforms (they'd stick "on" after tap).
- **No-JS fallback:** `html:not(.js) .reveal` forces all reveal content visible immediately.

---

## 9. Content Voice

Copy leans conversational and self-aware rather than corporate:
- Section kickers read like exclamations: "★ The adventure so far", "★ The toolbox", "★ Built with love (and caffeine)".
- Headlines use exclamation and playful metaphor: "One epic quest.", "Stuff I'm really good at.", "Projects that actually shipped."
- Achievement call-outs use energy words + emoji prefixes inside dashed-border boxes (`.tl-pow`): "⚡ Research meets reality", "💥 Cut hotel scraping costs by 90%...", "🏆 First place at CIP Forum 2021".
- Still fact-dense underneath the tone — every card keeps real dates, metrics, and stack tags; the cartoon skin never replaces substance.

---

## 10. File Map

| File | Role |
|---|---|
| `index.html` | Structure/content for all sections |
| `styles.css` | Full design system (tokens, components, responsive, motion) |
| `app.js` | Nav, reveal-on-scroll, counters, marquee builder, back-to-top, inline Lottie JSON + mount logic |
| `three-scene.js` | Toon-shaded Three.js scenes for hero + contact (ES module, loaded via CDN import) |
