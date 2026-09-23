# Portfolio design — space revision

The latest user direction supersedes the aerospace dashboard guide: literal space imagery, no neon theme, no monospaced text, and straightforward writing.

## Appearance

The hero uses a generated, photographic-style Earth against distant stars. A lightweight local star field continues behind the other sections. Charcoal surfaces and warm off-white accents replace cyan UI accents. Space Grotesk and Inter are the only type families; labels use sentence case without technical numbering or simulated telemetry.

`styles.css` holds the responsive layout; `project-previews.css` retains product illustrations; `space.css` applies the current atmospheric direction. The photographic Earth remains a preloaded fallback. The hero progressively loads a Three.js globe with day/night lighting and cloud maps, six satellites on inclined LEO paths, and three GEO satellites. GEO shares the Earth's equatorial plane and rotation speed. Distances are compressed, satellite sizes exaggerated, and time accelerated for an illustrative view, not live tracking.

Drag or use arrow keys to rotate the camera; Reset view restores the camera. Pause motion stops animation. Rendering suspends offscreen and in hidden tabs. Reduced motion and unavailable/lost WebGL use the static background. Only one canvas loads, pixel ratio is capped at 1.5, and all texture/geometry/material resources are disposed on teardown. Texture credits and licensing are shown below the scene and documented in `static/earth/ATTRIBUTION.md`.

## Content

### Satellite models

`js/satellite-models.js` builds distinct generic LEO observation and GEO communications spacecraft. Features include segmented solar-cell arrays, panel hinges and frames, insulation bump detail, radiator surfaces, parabolic reflectors with feed struts, optical instrumentation, antenna masts, and engine/thruster nozzles. The models are illustrative rather than exact mission replicas. Their size is enlarged relative to Earth and disclosed beside the scene. Parts are merged by material and geometry is shared between instances to limit draw calls.

Construction reference: [ESA satellite modules](https://resilience.esa.int/archives/projects/modular-design-telecommunication-satellites-mdts); [ESA thermal control](https://www.esa.int/Enabling_Support/Space_Engineering_Technology/Thermal_Control).

Navigation and section names use About, Experience, Projects, Skills, and Contact. Project titles name the actual work instead of slogans. Project descriptions, career facts, links, education and all 18 certifications remain. The learning section distinguishes space-related interests from professional experience. All nine archive projects remain filterable, alongside four featured projects.

## Verification

`npm test` checks assets, factual content, links, accessible structure, and JavaScript syntax. `npm run test:browser -- /path/to/playwright/index.mjs` checks responsive layouts from 320 to 1440px, filters and browser history, email copying, keyboard/mobile navigation, no-JavaScript content, reduced motion, and absence of monospaced fonts. `BROWSER_CHANNEL=msedge` selects an installed Edge browser. Screenshots: `static/qa/aerospace/`.

## Artwork provenance

Generated using the built-in image-generation tool. Optimized asset: `static/space-earth.webp`. Original retained at `C:/Users/annas/.codex/generated_images/01a0cf19-b3a1-7443-b31b-aa206e4229b0/exec-29238454-b5c5-4dfb-92ed-f41ee8945e8e.png`.

Final generation prompt:

> Create a cinematic photorealistic space background image for a software engineer portfolio website, wide landscape 1536x1024 or wider. A large shadowed Earth occupying the right half, lit by restrained pale blue-white sunlight from upper right, visible natural cloud swirls and tiny warm city lights near terminator. Deep near-black space with a visible fine field of distant stars across entire image, very subtle dusty Milky Way haze. Left half mostly dark stars to allow white text overlay. Serious astronomical photography aesthetic, desaturated natural colors, immense depth and silence. No neon, no saturated cyan, no purple nebula, no HUD, no text, no diagram, no orbit lines, no frames, no logos. Earth fully within frame on right with black space around. This is background artwork, not a screenshot or website mockup. Save generated file for integration into local website.
