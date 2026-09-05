# Annas portfolio design

Apple-inspired restraint: generous space, clear typography, silver surfaces, and graphite project presentations. The signature object is a layered metal core carrying an interlocking AA monogram for Annas Adharuqudni.

## Foundation

| Role | Value |
| --- | --- |
| Canvas | #f5f5f7 |
| Content surface | #ffffff |
| Text | #1d1d1f |
| Secondary text | #6e6e73 |
| Dividers | #dcdce0 |
| Actions | #0071e3 |
| Dark project surface | #08090b |

System sans typography uses Apple system fonts where available, with Helvetica Neue, Segoe UI, and Arial fallbacks. Headlines use a large fluid scale and tight tracking. No external font requests.

## Page

- Compact sticky navigation, blue primary action, direct resume access.
- Centered hero with silver platform sculpture, built with CSS transforms.
- Data-driven fullstack positioning with AI as a collaborator.
- A scroll-driven 3D story introduces the full stack, data engineering, and building with AI. A silver assembly separates into layers, carries data, and reconnects as the reader moves through three chapters.
- Dark distributed-scraping showcase, a dedicated Cognito feature linking to cognito.web.id, then paired CCTV and ChaChing projects.
- Cognito’s roadmap preview uses verified public product capabilities and its existing logo.
- Current Samsung role is a three-platform spotlight; remaining career rows foreground documented outcomes.
- Native disclosure for nine additional projects. URL filters retain shareable query state.
- Career chronology retains overlapping source dates. Skills, education, and all eighteen certificates remain in HTML.
- Education pairs the Informatics degree with the documented 3.86 GPA. Certification summaries cover software development (10), cloud infrastructure (6), and data science (2); the full catalog expands across the page.
- Dark contact section with direct email, accessible clipboard feedback, and social links.

## Interaction and accessibility

Content and navigation remain usable without JavaScript. Disclosures use native details/summary. Mobile navigation is a nonmodal disclosure that closes on Escape, navigation, outside click, and breakpoint change. Keyboard focus is visible; section links have header offsets. Reduced-motion preferences disable entrance and perspective motion.

The story lazily imports locally hosted Three.js 0.160.0 only when it approaches the viewport and motion is allowed. Its MIT license is retained in static/vendor. There is no scroll interception or continuous idle render loop. Rendering stops offscreen, in hidden tabs, and when paused. Chapter buttons work alongside normal scrolling. Reduced motion, short viewports, unavailable JavaScript, or a failed WebGL context expose all three chapters with a CSS illustration. Text is always semantic HTML; the decorative canvas is hidden from assistive technology.

The CCTV dashboard is a real supplied screenshot. The phone is explicitly an interface concept. Professional claims come from the supplied portfolio and resume. Do not invent client logos, results, verification links, or production screenshots.

## Validation

Run npm test for HTML/assets/content and JavaScript syntax. Run npm run test:browser -- /path/to/playwright-core/index.mjs with an installed Playwright runtime for responsive interactions, no-JavaScript fallback, and screenshots. The browser audit also checks real WebGL rendering, chapter navigation, paused draw calls, live motion preferences, mobile composition, short viewports, and context-loss fallback. Screenshots go to ignored static/qa/minimal/.

The printable resume remains a separate document. Older game modules are retained as unloaded files so earlier work remains recoverable.
