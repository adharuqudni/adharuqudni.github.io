Quest-Map 3D for annas.dev — Technical Structure

A scroll-driven 3D scene (the spine) + a cursor-reactive hero token (the opening hook),
designed to extend your existing identity — warm cream palette, illustrated/toon feel,
"epic quest" career framing — rather than replace it with generic dark-premium 3D.

The 3D reinforces the metaphor your copy already uses: your journey is a quest map, and
the camera travels it as the visitor scrolls. Bonus: it's a live demo of the game-dev skill
you're selling.


0. Design constraints (so the 3D fits the brand)


Palette stays warm. Cream base (#FFF4DC), toon/flat shading — MeshToonMaterial
with a stepped gradient map, not physically-based dark rendering. No glassmorphism, no
cold acid accents.
Low-poly / illustrated, matching the hand-drawn footer vibe ("drawn & coded").
Motion is orchestrated, not scattered. One hero moment + one scroll journey. Nothing
gratuitous — extra effects are what make 3D read as gimmick.
Quality floor is non-negotiable: static fallback, prefers-reduced-motion honored,
mobile-safe, keyboard-navigable page underneath.



1. Stack

LayerChoiceWhyRendererthree.jsbase WebGLReact glue@react-three/fiber (R3F)declarative scene, useFrame loopHelpers@react-three/dreiScrollControls, useScroll, PerformanceMonitor, AdaptiveDpr, useGLTF, PreloadDampingmaath (easing.damp3) or THREE.MathUtils.dampframe-rate-independent smoothingScroll (alt)GSAP + ScrollTriggerif you sync HTML sections to 3D outside R3F's own scroll — you already use this


Lit note: R3F is React-bound. Since you're moving toward Lit, the clean pattern is to
keep the 3D as a React island (one mounted component for the hero + journey), or, if you
want it as a Lit web component, drive vanilla three.js from a ReactiveController and skip
R3F. The architecture below (curve, damping, fallbacks) is identical either way — only the
component wrapper changes.




2. Component structure

<HeroCanvas>                     ← opening hook, above the fold
  <Canvas dpr={[1, 1.75]}>
    <PerfGuard>                  ← PerformanceMonitor + AdaptiveDpr
      <Suspense fallback={null}>
        <HeroToken />            ← cursor-reactive object
        <Preload all />
      </Suspense>
    </PerfGuard>
  </Canvas>
</HeroCanvas>

<QuestCanvas>                    ← the spine, wraps the Journey section
  <Canvas>
    <ScrollControls pages={5} damping={0.25}>
      <QuestMap />               ← low-poly path + 5 checkpoints
      <ScrollCamera curve={...} />
      <Scroll html>             ← your existing journey HTML rides on top
        <JourneyDOM />
      </Scroll>
    </ScrollControls>
  </Canvas>
</QuestCanvas>

Two separate canvases keeps the hero cheap and independent of the heavier journey scene, and
lets you lazy-mount the journey one only when it scrolls near viewport.


3. The hook — cursor-reactive hero token

The whole trick is damped response: never snap to the cursor, ease toward it. That
lag-then-settle is what reads as "alive."

jsximport { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function HeroToken() {
  const ref = useRef()

  useFrame((state, delta) => {
    const { pointer, clock } = state          // pointer is normalized -1..1
    const g = ref.current

    // ease rotation toward cursor (lambda = responsiveness)
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y,  pointer.x * 0.6, 4, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.4, 4, delta)

    // ambient float so it's never fully static
    g.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.08
  })

  return (
    <group ref={ref}>
      <mesh castShadow>
        {/* swap for your GLTF token / avatar */}
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial color="#E8A23D" gradientMap={toonGradient()} />
      </mesh>
    </group>
  )
}

// stepped gradient → the flat "illustrated" toon look, not glossy PBR
function toonGradient() {
  const data = new Uint8Array([80, 160, 220, 255])   // 4 bands
  const tex = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat)
  tex.minFilter = tex.magFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

Tuning: lambda ≈ 4 feels responsive-but-smooth; lower = lazier, higher = snappier. Keep
rotation ranges small (±0.4–0.6 rad) so it acknowledges the cursor without spinning.


4. The spine — scroll-driven camera along the quest path

Model the journey as a 3D curve. Scroll offset (0→1) maps to position along the curve;
each of your 5 companies sits at a fixed t as a checkpoint. Scroll is the control, so set
the camera to the curve point directly (with light damping to smooth scroll jitter).

jsximport { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'

function ScrollCamera() {
  const scroll = useScroll()
  const look = useRef(new THREE.Vector3())

  // the path the camera walks — one control point per journey beat
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(  0, 2,  10),  // start
    new THREE.Vector3(  6, 3,   4),  // 01 Samsung
    new THREE.Vector3( -4, 2,  -2),  // 02 tiket
    new THREE.Vector3(  5, 4,  -8),  // 03 decorps
    new THREE.Vector3( -6, 2, -14),  // 04 Elnusa
    new THREE.Vector3(  0, 3, -20),  // 05 Agni
  ]), [])

  useFrame((state, delta) => {
    const t = scroll.offset                         // 0..1 from ScrollControls
    const p = curve.getPointAt(t)
    const ahead = curve.getPointAt(Math.min(t + 0.04, 1))

    state.camera.position.lerp(p, 1 - Math.pow(0.001, delta))  // frame-safe damp
    look.current.lerp(ahead, 1 - Math.pow(0.001, delta))
    state.camera.lookAt(look.current)
  })

  return null
}

Each checkpoint (QuestMap) is a low-poly marker — a flag, a node, a little building — placed
at the matching curve point, revealed as the camera passes. Your existing journey cards ride in
<Scroll html> so the real content stays selectable, accessible, and SEO-visible. The 3D is
atmosphere behind the DOM, not a replacement for it.


5. Performance & fallbacks — the part that actually protects the hook

A janky scene reads as broken, not premium. This section is mandatory, not optional.

jsximport { PerformanceMonitor, AdaptiveDpr } from '@react-three/drei'
import { useState } from 'react'

function PerfGuard({ children }) {
  const [dpr, setDpr] = useState(1.5)
  return (
    <PerformanceMonitor
      onDecline={() => setDpr(1)}       // drop resolution before dropping frames
      onIncline={() => setDpr(1.75)}
    >
      <AdaptiveDpr pixelated />
      {children}
    </PerformanceMonitor>
  )
}

Checklist:


Clamp DPR: dpr={[1, 1.75]} — never render at raw retina 3×, it destroys mobile GPUs.
Antialias off on the heavier canvas; lean on toon flatness to hide it.
Lazy-mount the journey canvas (IntersectionObserver / dynamic import) so the hero loads
instant and the heavy scene only spins up near viewport. You've done this exact lazy-load
pattern before with Lottie.
Suspense + <Preload all /> so GLTF/textures warm up before first paint of the scene.
Static poster fallback — render an image, not a canvas, when any of these are true:


jsconst reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const lowGPU = navigator.hardwareConcurrency <= 4
const mobile = window.matchMedia('(max-width: 768px)').matches
const useStatic = reduce || (mobile && lowGPU)
// useStatic → <img src="/static/quest-map-poster.png"> instead of <Canvas>


Honor prefers-reduced-motion everywhere: no float, no cursor reactivity, no camera
travel — just the poster + normal scrolling.
Dispose on unmount (R3F handles most of this; verify with GLTF and generated textures).



6. Grafting onto your current static site

Your site is a single hand-built static page today, so you don't rebuild it — you add two
islands:


Mount HeroCanvas into the existing hero container (absolute-positioned behind your
"Hi! I'm ANNAS" heading — text stays HTML for a11y/SEO).
Wrap the #journey section in QuestCanvas, keeping the current cards as the <Scroll html>
layer.


Everything else (toolbox, projects, certs) stays exactly as-is. Ship the hero island first,
measure, then add the journey spine — the two-pass approach keeps each moment tuned instead of
spreading attention thin.


7. Implementation status — DONE (vanilla three.js adaptation)

Implemented in three-scene.js / index.html / styles.css. Per the Lit note in §1, the site
stayed a static page, so both islands run vanilla three.js (CDN ES module) instead of R3F —
same architecture (curve, damping, fallbacks), no build step.

- §3 hook → gold toon icosahedron hero token: rotation damped toward cursor
  (THREE.MathUtils.damp, λ=4, ±0.4–0.6 rad) + ambient sine float, exactly as specced.
  Plus the pre-existing floating toys with damped camera parallax (lerp 0.04).
- §4 spine → #journey-canvas (fixed, z-index -1, fades in via IntersectionObserver;
  position: sticky was unusable because .section has overflow: hidden). Camera walks a
  CatmullRomCurve3 with one bend per company; scroll progress of the #journey section maps
  to curve u with THREE.MathUtils.damp (λ=4). Dashed ink dot-trail marks the path; 5 toon
  flags (pill colors: green/blue/purple/yellow/pink) pop in as the camera arrives, offset
  ±3.2 to the side so the camera never clips them; toon clouds drift for depth. Fog fades
  to paper cream (#FFF4DC). Journey cards stay plain DOM above the canvas (z-index 1).
- §5 floor → DPR clamped 1.75, antialias off on the quest canvas, render only while
  section visible, prefers-reduced-motion = single static frame (all flags planted),
  mobile + hardwareConcurrency ≤ 4 = no quest canvas at all, perf guard drops DPR to 1
  after sustained sub-30fps (vanilla stand-in for PerformanceMonitor + AdaptiveDpr),
  rAF paused on hidden tab, whole 3D layer wrapped in try/catch so WebGL failure leaves
  the page intact.
- Bonus §4-adjacent: contact section toon planet + moon (pre-existing).


8. One-line brief for a design agent


Add two R3F islands to a warm cream (#FFF4DC), illustrated, "epic-quest"-themed portfolio:
(1) a cursor-reactive toon-shaded hero token with damped rotation and ambient float; (2) a
scroll-driven camera traveling a low-poly quest path past 5 career checkpoints, with the
existing journey cards riding on <Scroll html>. Toon materials only, DPR clamped to 1.75,
static poster fallback for reduced-motion / low-end mobile. Motion orchestrated, never
gratuitous. Keep the underlying page fully accessible and SEO-visible.