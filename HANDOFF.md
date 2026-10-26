# DDC Portfolio — Session Handoff
> Generated: 2026-06-06 | Updated: 2026-10-27 | Branch: `main` (+ V3 in progress on `v3`)

> **V3 is in progress on the local `v3` branch.** Everything below describes `main` unless a line says "V3". The V3 record (design, decisions, plans, status) lives in `docs/v3/`; start with `docs/v3/README.md`. V3 Phase 1 (branch `v3-phase-1`) removed `Marquee.jsx` and added the ASCII hero portrait (its wave plays as the kept `IntroStamp` curtain lifts) and the cursor lens — see *V3 Phase 1* below.

---

## Project Identity
- **Site:** https://damiandc.com
- **Owner:** Damian De Cruz — Creative Technologist, BSc (Hons) Computer Science, IIT Sri Lanka (University of Westminster)
- **Repo:** https://github.com/EnderGuardian25/personal-portfolio (`main` branch)
- **Local path:** `D:\personal-portfolio`
- **Last commit:** `2026-10-06` — `40708c4` fix(deploy): PM2 now runs `next start -H localhost` (loopback-only); binding `-H 127.0.0.1` had silently 404'd `lab.damiandc.com` — see *Server Info → Loopback binding*. nginx upstream moved to `[::1]:3000` the same day. Previous: `2026-07-18` — `2a9ac17` perf(site): slow-load gating — entrance replay skipped and intro resolve shortened when hydration arrives >2.5s in (content that's been visible for seconds must not blink away; prompt loads unchanged). One earlier the same day: `0758068` the main Lighthouse performance pass (see *Performance Pass* under "What's in main"). **Both deployed 2026-07-18.** Earlier commits since 07-13: `5622ec0` AccordionGallery tweak, `90b49a1` spotlight-grid reworked into Inspector Spotlight (roster below), `d2fed66` dropped deprecated jsconfig `baseUrl`. Previous: `2026-07-13` — `3baa9fd` fix(liquid-type): still pointer leaves still glass, local damped ripples, loop parks when calm (see *Hover rule* note below — LiquidType is now a deliberate exception). One earlier the same day: `e2ded2d` **lab wave 3** — 70 demos (10 per category, 20 new), sectioned index, clean subdomain URLs, 10 verified review fixes (see the */lab* section). Previous: `2026-07-11` — fix(lab): LineDrawScroll dash reveal measured in SCREEN space. With `vector-effect: non-scaling-stroke`, browsers compute the dash pattern in screen px, but dasharray was set from `getTotalLength()` (viewBox units, ~197 vs ~3200px rendered) — the on/off pattern repeated ~8× down the route, scattering stroke segments across the "undrawn" line. `preserveAspectRatio="none"` scales x/y unevenly, so there's no single conversion factor: the path is now sampled (400 pts) and integrated into a cumulative screen-length table that drives the dasharray/offset, the head bead (binary search for the tip sample), and the milestone fractions, re-measured on ResizeObserver. Same day, earlier: XrayHero trail width = aperture (`falloff: APERTURE_R * 2` — flowmap stamp radius is `falloff × 0.5` in the same aspect-corrected height units), heal delayed (DISS 0.988 moving / 0.997 still); RippleSwap sustained hover source is now an ELLIPSE (170px along the line × 56px vertical) — wider swap when resting on the letters, inert above/below the sentence. One commit earlier: XrayHero aperture rides the cursor at CONSTANT size (user follow-up: same size moving or resting → no moving↔still transition to read at all; movement just leaves the trail healing behind); stillness only drives trail-linger dissipation. Same day, one commit earlier: XrayHero + RippleSwap true stationary hover (spec: `docs/superpowers/specs/2026-07-11-xray-ripple-stationary-hover-design.md`) — XrayHero full-reveal shader aperture (`f = max(trail, aperture)`) replacing the faint-wobble hack, dissipation 0.982→0.996 with stillness; RippleSwap sustained hover source (resting cursor holds its neighborhood swapped to B) + continuous per-frame rotateX/opacity rendering (no class toggle, no CSS transitions on the JS path). Both use time-based smoothing/decay (`1 − e^(−dt/τ)`) — per-frame lerp factors ran ~2.4× faster on 144Hz displays. Earlier same day: visual-review round 2 (full 50-demo pass, 12 files fixed) (see *Verified* under `/lab`). Headline fixes: LogoSting replay rebuilds a fresh timeline per run (invalidate().restart() re-measured the FLIP hand-off from the parked-in-slot position → garbage slide targets), RippleSwap pins sentence-B glyphs at B's own measured flow offsets via a hidden probe (centering B glyphs in A-width cells mangled B's spacing), gsap `y: 0` alongside `yPercent` in CounterPreloader/CurtainTransition (gsap parses JSX inline `translateY(N%)` from the computed matrix as a PIXEL offset that rides along with every yPercent tween), LabStage dropped its stage-level `group` class (made every demo's internal `group-hover:` fire card-wide), type-size clamps in SliceHero/ExpandGrid/XrayHero/LiquidType (Syne 800 runs wide → edge clipping), HoverIndexList dims non-active rows, XrayHero idle wobble is now a constant-magnitude circle (mismatched sin/cos frequencies made the aperture pulse), ParticleComet warm halo → faint blue. Previous 2026-07-10: first visual-review round + wave 2 launch (50 demos) — LabStage `overflow-hidden` (tall demo content was defeating the card aspect ratio), ParticleNameHero opaque clear + white name (additive blend left near-zero canvas alpha → machine-dependent washout), RippleSwap aligned word boundaries + natural cell widths + 230px ripple cap, and the stationary-hover rule applied to XrayHero / LiquidType / ImageTrail / ParticleComet. Earlier same day: `/lab` wave 2 (34 new demos, 50 total across 7 categories) and the gallery launch; `v3` branch deleted (fully merged)
- **Motion system:** the `v3` "refined-editorial motion" work (SplitLines, IntroStamp, Parallax, ScrollProgress, `lib/motion.js`, v:03 stamps) is now in `main` — see the *Motion System — v3* section below. Both pages verified Lighthouse **100/100/100/100** (a11y · BP · SEO · Agentic), desktop + mobile, dark mode

---

## Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.10 / React 19 (upgraded 2026-07-11; App Router, **two root layouts** via route groups — see `/lab` below) |
| Styling | Tailwind CSS 4 (CSS-first config — `@theme` + `@custom-variant dark` in `globals.css`; **no `tailwind.config.js`**) + CSS-variable-backed tokens |
| Animation | Framer Motion 12 (`MotionConfig reducedMotion="user"`); `/lab` also uses **GSAP** + **ogl** (WebGL) |
| Smooth scroll | Lenis (skipped on `prefers-reduced-motion`) — portfolio only, not `/lab` |
| Fonts | Portfolio: Instrument Serif (display/italic), Manrope (sans), JetBrains Mono (mono). `/lab`: Syne (display, variable wght), IBM Plex Mono (mono) |
| Hosting | Hetzner VPS, Ubuntu 22.04 |
| Process manager | PM2 (`damiandc-website`), port 3000, bound to `localhost` (= `::1` only) |
| Reverse proxy | nginx — one server block serves `damiandc.com` + `www` + `lab.damiandc.com` → `[::1]:3000`; HTTP/2 on; SAN cert covers all three (see *Server Info*) |
| Subdomain routing | `proxy.js` (Next proxy/middleware) maps `lab.damiandc.com` onto the `/lab` routes; `damiandc.com/lab` 404s |

---

## `/lab` — Unlisted UI/Animation Reference Gallery (2026-07-10)

A personal library of live, reusable UI patterns (hero sections, text animations, image carousels, cursor/hover effects, scroll effects, transitions/loaders, grids/layout) — for reuse in future client builds and for showing clients directly ("which of these do you like?").

### Why two root layouts
The lab deliberately does **not** inherit the portfolio's theme — no ivory palette, no grain, no theme toggle, no GA, no JSON-LD. Next.js App Router route groups make this possible: `app/(site)/` and `app/(lab)/` are two independent root layouts sharing one `app/` tree. URLs are unaffected (`/`, `/services`, `/lab` all resolve normally); navigating between the two groups is a full page load, which is irrelevant since nothing links from the lab back to the portfolio.

- `app/(site)/` — the original `layout.jsx`, `page.jsx`, `services/`, `globals.css` (moved via `git mv`, unedited)
- `app/(lab)/layout.jsx` + `app/(lab)/lab.css` — dark-studio identity: near-black canvas (`--lab-bg`), muted chrome (`--lab-dim`), Syne + IBM Plex Mono, `metadata.robots: { index: false, follow: false }`
- **Sharp edge:** Next (14 through 16) rejects a root `app/not-found.jsx` when there's no single root layout (multiple root layouts = no shared one to attach it to). The fix: `app/(site)/not-found.jsx` (renders inside the portfolio theme) + `app/(site)/[...notFound]/page.jsx` (a catch-all that calls `notFound()` so any unmatched URL funnels into that boundary). Don't try to add a top-level `app/not-found.jsx` again — it breaks the build with "doesn't have a root layout."

### Unlisted mechanics
- **Not** in `app/sitemap.js`, **not** in any nav (`lib/site.js` `NAV_LINKS` untouched)
- `noindex, nofollow, nocache` via the `(lab)` layout's `metadata.robots` — deliberately **no** `disallow` entry in `robots.txt` (a disallow line would publicly advertise the path to anyone reading robots.txt; meta-noindex alone keeps it reachable only by direct link)

### Registry pattern (how to add demo #71)
1. One entry in `lib/lab.js` `ALL_DEMOS[]` — `{ slug, title, category, tags, description, webgl?, span? }` (pure data; authored wave-by-wave). The exported `DEMOS` is **regrouped by category** from it, so array order (which drives fullscreen prev/next) always matches the sectioned index order; unknown-category entries are appended, never dropped.
2. One component in `components/lab/demos/YourDemo.jsx` — receives the standard contract `{ active, reducedMotion, standalone }` from `LabStage`
3. One line in `components/lab/registry.jsx` — `"your-slug": demo(() => import("./demos/YourDemo"))` (the `next/dynamic` + `ssr:false` client boundary)

That's it — the demo appears in its category section on the index (filter chips still work) and gets its own fullscreen route with prev/next, automatically.

**Single owners in `lib/lab.js` (wave 3):** `SECTIONS` (category grouping + counts — LabGrid renders this, never re-derives), `labHref(slug)` + `LAB_INDEX_HREF` (the visible URL shape: clean `/<slug>` and `/`; never hardcode `/lab/...` in a component), `LAB_PHOTOS` (the shared captioned photo set — don't re-declare it per demo). Easing comes from `lib/motion.js` `EASE` — don't re-hardcode `[0.22,1,0.36,1]`.

### Perf model (why demos don't burn WebGL contexts)
`components/lab/hooks.js` `useActive()` gates every demo on IntersectionObserver + `document.hidden` — but unlike `GlitchField.jsx` (which just pauses its rAF loop), `LabStage.jsx` **unmounts** the demo entirely when inactive, swapping in a static `Poster.jsx` placeholder. Browsers cap concurrent WebGL contexts (~8–16/page); with 6 of the 50 demos using ogl, unmounting (not just pausing) is what keeps a scroll through the whole gallery safe. `components/lab/useOgl.js` explicitly calls `WEBGL_lose_context` on cleanup rather than waiting for GC.

### Signature demos
- **`xray-hero`** (`components/lab/demos/XrayHero.jsx`) — ogl's built-in `Flowmap` class (a ping-pong FBO pair holding a decaying pointer-trail texture) masks between a front photo and a hidden text layer rendered to an off-screen 2D canvas. The trail's RG velocity channels also warp the front image's UVs at the reveal edge for the streak look. The hover reveal is a SEPARATE shader-side system: a radial aperture (`f = max(trail, aperture)`) rides the cursor at CONSTANT full size — moving or resting — so there is no moving↔still transition at all (user preference); the only fades are pointer enter/leave. Don't try to fake this through the flowmap by feeding it wobble velocity (partial reveal, pulse, swirl). The trail is the aperture's exact width (`falloff: APERTURE_R * 2` — the flowmap stamp radius is `falloff × 0.5` in the same aspect-corrected height units as the aperture), so a moving cursor draws a tube the circle fits in. Dissipation is dynamic (0.988 moving → 0.997 still, via `flowmap.mesh.program.uniforms.uDissipation.value`, driven by a time-smoothed stillness value) so the trail lingers while the pointer rests and heals over ~1s while sweeping. Touch users get an auto-play intro sweep since there's no hover.
- **`ripple-swap`** (`components/lab/demos/RippleSwap.jsx`) — pure DOM/rAF, no WebGL. Two sentences share paired character cells (`.glyph-a` / `.glyph-b` stacked via CSS grid); each cell's `energy` value is driven by a gaussian of distance to recent pointer-path points, PLUS an expanding ripple ring (`delay = distance / rippleSpeed`) so farther cells light up later — that's what makes the swap propagate instead of popping — PLUS a sustained gaussian source at the live hover position, so a resting pointer HOLDS its neighborhood swapped to B (released on `pointerleave`). The hover source is an ELLIPSE (`HOVER_RADIUS_X` 170 × `HOVER_RADIUS_Y` 56) — wide along the sentence, tight vertically — so resting on the letters swaps a broad section while a cursor above/below the line stays inert (user preference; don't widen it isotropically). Energy decays with a time constant (`HEAL_TAU`) so everything else heals back to sentence A. Cells render CONTINUOUSLY: per-frame `rotateX`/opacity writes from eased energy — no `.on` class toggle, and no CSS transitions on the JS path (they'd smear the per-frame values). Direct style mutation via refs (same pattern as `Marquee.jsx`), not React state per frame. Cell text uses literal NBSP (` `) for space characters — plain spaces are whitespace-only text nodes and collapse inside `inline-grid` cells; don't "clean up" those into ASCII spaces.

### Demo roster (70 — 10 per category; wave 3 added 2026-07-13)
| Category | Demos |
|---|---|
| Hero (10) | `xray-hero` ★, `kinetic-slab-hero`, `gradient-field-hero` (ogl), `split-panel-hero`, `particle-name-hero` ★ (6k GPU particles form "DAMIAN"), `blueprint-hero` (GSAP self-drafting plan), `slice-hero` + w3: `aurora-veil-hero` (blob drift behind frosted pane, pointer tilt), `terminal-hero` (deterministic gsap boot script → display stamp), `floating-panels-hero` (fake UI cards at depths, scene leans with pointer) |
| Text (10) | `ripple-swap` ★, `scramble-hover`, `variable-weight-wave`, `velocity-marquee`, `liquid-type` (ogl refraction — see hover-rule exception), `path-text`, `odometer-roll` + w3: `split-flap` (departure-board halves; mono glyphs keep the seam registered), `focus-type` (gaussian rack-focus; emphasis = transform scale, NEVER `wght` — animating weight re-wraps the line, browser-verified), `rag-doll-type` (per-letter framer drag, `dragSnapToOrigin`) |
| Carousel (10) | `distortion-slider` (ogl), `momentum-gallery`, `clip-reveal-carousel`, `depth-stack`, `panorama-strip` (ogl), `filmstrip-scrub`, `accordion-gallery` + w3: `coverflow` (continuous rAF position, cqw transforms, masked reflections, drag+snap+keys), `ken-burns` (CSS-keyframe zoom/drift, rAF ring parks while hover-paused), `shared-frame` (layoutId FLIP thumb→frame; per-image generation suffix stops reverse-morph) |
| Cursor & Hover (10) | `image-trail`, `magnetic-dock`, `hover-lens`, `spotlight-grid` (reworked 2026-07-13 → "Inspector Spotlight": finished mini-site + masked inspect clone — dashed outlines, `attr(data-el)` tag chips, stroked ghost type, baseline/column guides; identical markup in both layers keeps them registered; the old dim-grid version read as a twin of glow-cards), `particle-comet`, `char-repel`, `tilt-glare-cards` + w3: `glow-cards` (border ring via padding-box mask composite + interior wash, violet accent, NO tilt), `morph-cursor` (spring blob, velocity stretch, melts onto `[data-pill]` rects, mix-blend-difference), `dot-field` (canvas lattice, heat LUT — no per-dot string building; idle wave at half rate) |
| Scroll Effects (10) | `pin-morph-scroll` ★, `horizontal-journey`, `parallax-scene`, `velocity-skew`, `text-scrub-reveal`, `sticky-stack`, `mask-wipe-scroll`, `line-draw-scroll` + w3: `scroll-dolly` (camera pushes through 5 depth planes, `exp((p−depth)·k)` scale), `chapter-split` (pinned copy left / crossfading images right, triangular per-chapter presence) |
| Transitions & Loaders (10) | `curtain-transition`, `counter-preloader`, `morph-loader`, `pixel-dissolve`, `iris-transition`, `glitch-transition`, `logo-sting` + w3: `lens-blur` (rack-focus scene swap: blur+bloom out, sharpen in), `skeleton-morph` (shimmer bars morph into the content they stood for; reuses lab.css `lab-shimmer`), `ink-bleed` (feTurbulence+feDisplacementMap wipe edge; filtered rim ring + unfiltered interior cap keeps the photo crisp) |
| Grids & Layout (10) | `infinite-drag-canvas` ★, `expand-grid`, `masonry-flow`, `hover-index-list`, `mosaic-ripple`, `bento-cascade`, `counter-columns` + w3: `sort-grid` (manual 2D drag-reorder, motion values + imperative springs; rect re-read per move — scroll-safe), `isometric-board` (rotateX 54° rotateZ 45° plane, gaussian lift holds while resting; null-guard in apply() — refs die before deferred cleanup on unmount), `view-morph` (list ⇄ grid, framer `layout` FLIP; card paddings in capped cqw so 6 rows fit the small card) |

Three wave-1 demos deliberately evolve existing portfolio components for the dark lab: `kinetic-slab-hero` ← `Hero.jsx` word-mask technique, `velocity-marquee` ← `Marquee.jsx` drag physics, `scramble-hover` ← `GlitchField.jsx` charset. `hover-lens` references `Lens.jsx`'s hover-lift pattern.

### Hover rule (user, 2026-07-10; refined 2026-07-13 — REQUIRED for any new hover demo)
A hovering pointer must produce the effect **even while stationary** — movement-only effects read as broken. Position-driven demos get this for free; anything driven by pointer *velocity* or move-events needs an idle path — and the idle path should be a REAL sustained source, not a faint fake-motion feed: XrayHero composites a full-reveal shader aperture that rides the cursor at constant size, moving or resting (its earlier faint-wobble feed gave only a partial, pulsing reveal — since replaced), RippleSwap keeps a sustained energy source at the live hover position so the swap holds, ImageTrail sheds a gentle stamp every ~640ms (plus one on first contact), ParticleComet's autopilot only resumes after pointer*leave*, never mid-hover. Prefer a continuous 0..1 stillness/hover value over a binary moving/resting switch — binary regime flips read as chop at slow pointer speeds. Track hover with `pointermove` + `pointerleave` (pointerleave fires after touch end too).

**Refinement (user, 2026-07-13): the rule applies to demos "that need it", not universally.** Where the physical metaphor says a still input leaves a still surface, stillness IS the correct behavior — **LiquidType is the canonical exception**: a resting pointer leaves the glass calm (its earlier ~0.75s resting re-stir was removed on request), ripples are local damped bobs that settle in ~1s (they must NOT keep spreading after the pointer stops), the moving streak is smoothed by interpolated spawns between pointer samples, and the render loop parks 1.5s after the last stir. Judge new demos by their metaphor before applying the sustained-idle-source pattern.

### Scroll-driven demo pattern (wave 2 — REQUIRED for any new scroll demo)
The page is NOT the scroller, so **ScrollTrigger is banned** in lab demos. Instead: the demo root is an internal scroller (`h-full w-full overflow-y-auto`) containing an explicit tall wrapper (e.g. `height: 340%`) whose first child is the sticky scene (`position: sticky; top: 0`, height = `100% / 3.4`). Progress = `scrollTop / (scrollHeight − clientHeight)`, read in a **passive scroll listener**, applied via refs in **rAF** (exponentially smoothed). Never set `overscroll-behavior` (default chaining must let the index page scroll past the card). Show a `Scroll ↓` mono hint; `reducedMotion` renders a static ~60%-progress state with no listeners. **Unit gotcha:** the stage is an `inline-size`-only container — `cqw` works, but `cqh` silently resolves against the *viewport*; never use it. **SVG dash gotcha:** with `vector-effect: non-scaling-stroke`, dash patterns are computed in SCREEN px, not viewBox units — never feed `getTotalLength()` straight into `stroke-dasharray` on such a path (and with `preserveAspectRatio="none"` there's no single conversion factor; sample + integrate the screen length, see `LineDrawScroll.jsx`).

### Wave-2 fixes to wave-1 demos (same commit)
- `DistortionSlider.jsx` — the noise-wipe `mix()` order was inverted: at rest it showed the incoming texture, causing a snap when `current++` re-synced `tA`. Now `m` maps 0→current (`tA`), 1→incoming (`tB`).
- `MagneticDock.jsx` — the cursor blob used `translateX/Y: "-50%"` alongside framer `x`/`y` motion values, which alias-collide; replaced with `left-0 top-0 -ml-4 -mt-4` self-centering.
- `MomentumGallery.jsx` — the fixed `-0.08` inner-parallax factor could exceed the 32px image bleed on narrow viewports, exposing blank strips; the factor is now clamped to the drag range (`min(0.08, 30 / bound)`).

### Verified (gallery launch, 2026-07-10)
- `/` and `/services` regression-checked pixel-identical after the route-group move (ivory theme, fonts, grain, theme toggle, Lenis, GA, JSON-LD all intact)
- `/sitemap.xml` still lists only `/` and `/services`; `/robots.txt` unaffected; custom 404 works for bogus URLs
- `next build` First Load JS: portfolio routes unchanged; gsap/ogl chunks only appear under `/lab` routes (verified no bundle leak)
- Both wave-1 signature effects (x-ray reveal + heal, ripple-swap propagation) confirmed live via chrome-devtools pointer simulation
- Mobile viewport (390×844): no horizontal overflow, grid collapses to 1 column, filter chips wrap

### Verified (wave 2, 2026-07-10)
- All 50 `/lab/[slug]` routes return 200 and statically generate (`next build` — 61 pages total, lint + types green)
- All 50 demo files: `"use client"` + default export + `reducedMotion` handling; zero ScrollTrigger / `overscroll-behavior` usage
- Damian's first visual pass (2026-07-10) caught 4 issues, all fixed + browser-verified: the LabStage aspect-ratio blowout, the ParticleNameHero alpha washout, RippleSwap cell-width gaps/over-reach, and movement-only hover in 4 demos (see the Hover rule above)

### Verified (visual-review round 2, 2026-07-11 — ALL 50 demos eyeballed)
- Full demo-by-demo browser pass over every `/lab/[slug]` route (a power cut interrupted the session mid-pass; the follow-up session confirmed via the dev-server log that all demos had been visited, then re-verified the tail rather than repeating the pass)
- 12 files fixed this round — see the *Last commit* line at the top for the full list
- Post-cut verification: `/lab` index renders with zero console errors and correct filter counts; hover-index-list card confirmed per-row highlight + non-active dimming (the LabStage `group` removal — LabStage's own chrome uses plain `hover:`, and all three `group-hover:` demos carry their own local `group`); LogoSting replay verified deterministically (settled slot transform identical across run 1 and replay); particle-name-hero renders clean
- `next build` green: lint + types pass, 61/61 static pages, lab chunks still isolated from portfolio routes

### Wave 3 (2026-07-13) — 70 demos, sectioned index, clean URLs
- **20 new demos** brought every category to exactly 10 (roster above). All follow the house contract; two scroll demos use the internal-scroller pattern.
- **Sectioned index:** the "All" view groups demos under category headers (Syne label + real count). Grouping/counts live in `lib/lab.js` `SECTIONS`; `DEMOS` is exported category-grouped so **fullscreen prev/next always matches the index order**.
- **Clean URLs:** internal links dropped the visible `/lab` — `labHref(slug)` → `/<slug>`, index → `/`. `proxy.js` already rewrote clean slugs on the lab host; `/lab/...` still serves as back-compat for old links. Route files stay at `app/(lab)/lab/[slug]`.
- **Review pass (8 finder angles → 1-vote verify) fixed 10 confirmed findings**, notably: Coverflow swallowed keyboard activation after any drag (`moved` never reset on pointerup) + first-paint pose baked into JSX; SortGrid re-reads the wall rect per pointermove (grab-time snapshot desynced under mid-drag wheel scroll); KenBurns ring hover was dead (inline `opacity: var()` beats any hover class — dim the inner svg instead); TerminalHero cleanup must clear gsap-set caret styles (React skips value-identical style prop writes, so a killed timeline's inline `visibility` survives); rAF loops park when settled/idle (DotField heat-LUT + half-rate idle, FocusType convergence-park, KenBurns hover-park); IsometricBoard's `apply()` null-guards its refs (React nulls ref-callbacks synchronously on unmount, the effect cleanup that cancels the rAF runs deferred — one tick can fire between).
- Deliberately deferred (touch 30+ pre-existing demos, not that diff): a `--lab-accent` token for the ~47 hardcoded `#3b82f6`, and extracting the shared rAF/scroll-progress scaffolding into `hooks.js`.

### Growing the library
70 demos across 7 categories — the registry pattern above scales without any other structural change. Add demos incrementally; no need to touch `LabStage`, `hooks.js`, `useOgl.js`, or the routes. Known accepted trade-off: `infinite-drag-canvas` sets `touch-action: none` (page scroll doesn't pass through that one card on touch — required for free 2D dragging).

---

## What's in main

### Performance Pass — Lighthouse perf (2026-07-18)
Both pages were 100/100/100/100 on a11y/BP/SEO/Agentic but **performance** sat at 66–90: every above-fold element SSR'd with framer's `initial` inline styles (`opacity:0`), so nothing painted until hydration + stagger delays — LCP recorded 2.3–3.9s late ("element render delay") and Speed Index absorbed the whole entrance. Fixes (local prod-build verified: **desktop 100 both pages**; mobile localhost numbers are Lantern-skewed, see below):
- **`EagerReveal.jsx`** (new) — SSR-visible entrance: server HTML renders children fully visible (early paint + LCP), the entrance replays once hydrated. Uses ONE stable DOM node (`initial={false}` + `useAnimationControls`) — **do not "simplify" into a conditional plain-tag/motion-tag swap**: remounting creates a fresh element whose late reveal re-registers LCP. `replay={false}` renders plain static markup — used on the two LCP paragraphs (homepage hero bio, services lead) because re-hiding them lets the webfont swap happen while invisible, re-registering LCP at reveal end. Applied: homepage kicker + bio + "Currently" block, services hero labels + lead + CTAs. Keep `Reveal` for below-fold sections.
- **`IntroStamp` is now SSR-rendered** — the curtain covers the page from the very first paint (pre-hydration visitors see a static deterministic glitch frame, seeded scramble — `Math.random` at SSR would hydration-mismatch). Hero content painting beneath the opaque curtain still records LCP. Three CSS gates in globals.css: reduced-motion (`display:none`), no-JS (`html:not(.js)` — the theme inline script stamps `js` on `<html>`), and a 5s `intro-stamp-failsafe` keyframe that dissolves the curtain if hydration never arrives (dead chunk = otherwise permanently covered page).
- **GA → `strategy="lazyOnload"`** (both Script tags) — gtag (163KB) off the trace window; only bounce-before-load visitors go untracked.
- **Localhost Lighthouse trap:** on an instant network every JS chunk finishes before first paint, so Lantern chains the whole bundle into simulated mobile LCP (~3.5s shown while observed LCP = observed FCP = 224ms). Localhost mobile scores (~88–93) are a simulation artifact — judge mobile against the LIVE site. Structural mobile LCP floor = FCP + preloaded-font fetch (~95KB / 4 files) on simulated slow-4G; mobile 100 would additionally require `font-display: optional`-style tradeoffs (not taken — design first).
- **Slow-load gating (`2a9ac17`):** if hydration arrives >2.5s after nav start, EagerReveal skips the entrance replay (content that's been visible for seconds must not blink away) and IntroStamp resolves in ~0.3s instead of ~0.9s. Prompt loads play the full choreography unchanged.
- Lighthouse runs from the user's daily Chrome profile are polluted by extensions (AdBlock injected ~750KB JS + ~1.6s main thread in the 2026-07-18 reports) — audit in Incognito or headless.
- **Live scores after deploy (2026-07-18, clean headless, measured from Sri Lanka — real ~0.5–1.5s of latency to the Hetzner box baked in):** desktop 96/96, mobile 94 (home) / 86 (services) *before* the slow-load gating commit; gating expected to lift mobile to ~95+. **Judge against Google PSI (pagespeed.web.dev)** — it measures from Google's infra and scores higher; it's also what search sees. Known accepted trade-off: the every-load intro costs ~1–1.5s of desktop Speed Index (≈ the 96→100 gap on the homepage) — trimming/removing it is Damian's call and has NOT been taken.

### Dark Mode
- Sun/moon `ThemeToggle` in nav — writes to `localStorage`, toggles `.dark` on `<html>`
- No-flash inline script in `<head>` reads preference before first paint
- Dark variant via `@custom-variant dark (&:is(.dark *))` in `globals.css` (Tailwind 4 CSS-first config — the old `tailwind.config.js` `darkMode: "class"` is gone)
- All color tokens CSS-variable-backed — full site re-themes by flipping one class
- Navy blue dark palette in `globals.css` (`:root` light + `.dark` block)
- `suppressHydrationWarning` on `<html>`

### SEO & Metadata
- Title: `"Damian De Cruz — Creative Technologist & Freelance Web Designer"`
- Meta description: freelance web designer/developer, Colombo, Sri Lanka, delivered in days often 2–3
- OG + Twitter cards updated to match
- `app/icon.svg` + `app/icon.png` (512×512) + `app/apple-icon.png` (180×180) — DDC favicon
- `app/robots.js` + `app/sitemap.js` — auto-wired by Next.js App Router; sitemap includes `/services`
- JSON-LD `Person` + `Service` structured data in `app/layout.jsx`
- `FAQPage` JSON-LD in `app/services/page.jsx` — 7 Q&As, eligible for Google rich results
- OG image converted: `public/og.jpg` (45KB JPEG, was 753KB PNG); unused `og.png` (771KB) deleted
- `alternates: { canonical: "/" }` in metadata
- `next.config.mjs`: removed `unoptimized: true`, added `formats: ['image/avif','image/webp']`
- Google Search Console: DNS TXT record verified via Squarespace DNS panel
- **Google Analytics 4** (`G-PC1HZKKSEC`) — added via `next/script strategy="afterInteractive"` in `app/layout.jsx`; covers all pages from root layout

### Services Page (`/services`)
- Standalone route with its own metadata, canonical, OG, Twitter, `OfferCatalog` JSON-LD, and `FAQPage` JSON-LD
- 6 sections: Intro (unnumbered) · `§ 01 — What I do` · `§ 02 — How it works` · `§ 03 — Recent work` · `§ 04 — FAQ` · `§ 05 — Start a project`
- **7 services** with LKR/USD pricing and turnarounds:
  - § 01 Web design & development — from LKR 18,000 / $150, ~2–3 days
  - § 02 Business & portfolio sites — from LKR 40,000 / $500, ~1 week
  - § 03 Booking & scheduling sites — from LKR 65,000 / $800, 1–2 weeks
  - § 04 Redesigns & speed fixes — from LKR 25,000 / $200, 1–3 days
  - § 05 SEO & AI visibility audit — from LKR 50,000 / $299, 2–4 days
  - § 06 SEO & GEO implementation — from LKR 65,000 / $400, 1–2 weeks *(final price quoted from audit scope)*
  - § 07 Ongoing SEO & GEO retainer — from LKR 48,000 / $225/mo, monthly
- **SEO/GEO service flow:** audit (§05) → implementation (§06, quoted after audit) → retainer (§07, optional ongoing)
- FAQ section has 7 entries including deposit/cancellation policy
- `mailto:` links include `?subject=Website%20enquiry` pre-fill in both `Services.jsx` and `Contact.jsx`
- CTA buttons: WhatsApp (electric fill) + email (outline) — constants from `lib/site.js`
- Uses its own `ServicesNav` (logo **DDC / Services '26**, section links Pricing · Process · Work · FAQ)
- **Hero corner block mirrors the homepage hero**: `(002) Services / Hire` label (fades on scroll) with **Portfolio →** button, desktop only
- Hero left-column label reads **Damian De Cruz**
- Recent Work (`§ 03`): **See the full portfolio →** link + **3 project cards in a 1×3 row** (`sm:grid-cols-3`, hairline `gap-px bg-rule` dividers) — This Portfolio (`/`) · Spades Solutions · Aloys Travels. `work[]` array lives at the top of `Services.jsx`
- Not in the homepage navbar — surfaced via hero corner button (desktop) and nav hamburger overlay (mobile)

### Navigation
- **Two separate, mirrored navbars** — the homepage uses `Nav.jsx`; `/services` uses its own `ServicesNav.jsx`. Both carry: section links · theme toggle · `Available · 2026` badge (desktop right + mobile overlay) · and a cross-link to the *other* page in the mobile overlay.
- `Nav.jsx` (homepage): logo `"Portfolio '26"` → `#top`; links About · Work · Timeline · Résumé · Contact (`NAV_LINKS`); `usePathname()` + `resolveHref()` rewrites `#anchor` → `/#anchor` on non-home routes (defensive — only the homepage currently uses it); mobile overlay has a **Services →** cross-link button
- `ServicesNav.jsx` (`/services`): logo `"Services '26"` → `#top`; centred section links (Pricing · Process · Work · FAQ → `#what-i-do`, `#process`, `#recent`, `#faq`); theme toggle; mobile overlay has a **Portfolio →** cross-link button. **No desktop nav cross-link button** — the Portfolio CTA lives in the services hero corner instead (mirrors how the homepage's Services CTA lives in its hero corner)
- Services removed from `NAV_LINKS` (homepage keeps 5 clean scroll anchors; avoids breaking smooth-scroll feel)

### Lenis Smooth Scroll Fix
- `SmoothScroll.jsx` intercepts all `a[href^="#"]` clicks via a **single delegated listener on `document`** (`e.target.closest('a[href^="#"]')`)
- Calls `lenis.scrollTo(target, { offset: -80 })` so smooth scroll runs and `whileInView` animations fire correctly
- Delegation (not a one-time `querySelectorAll` snapshot) means it catches links rendered *after* mount too — the `ServicesNav` links and both navs' conditionally-rendered mobile-menu overlays now smooth-scroll on every page
- Without this, native anchor jumps bypass Lenis and `whileInView` triggers all at once

### Interactive Marquee (`Marquee.jsx`) — removed in V3 Phase 1 (kept here as history)
- The italic ribbon between homepage sections ("Creative Technologist ✦ Code ✦ …") — **JS-driven `requestAnimationFrame` loop**, NOT a CSS keyframe (the old `@keyframes marquee` / `.marquee-track` rule was removed from `globals.css`)
- **Auto-scrolls** leftward at the same speed as before (`baseline = -single / LOOP_SECONDS`, `LOOP_SECONDS = 38`; `single = track.scrollWidth / 2` since two copies are rendered)
- **Grab-to-drag:** pointerdown grabs it, pointermove moves the offset 1:1 with the cursor, a smoothed throw velocity is captured
- **Momentum + settle:** on release the flick keeps gliding, then an exponential blend (`SETTLE_TAU = 0.9`) decelerates it back into the normal leftward rotation. Two tuning knobs live at the top of the file: `LOOP_SECONDS` (speed) + `SETTLE_TAU` (settle laziness)
- **Pause on grab only** — auto-scroll keeps running on hover; it only stops while actively held
- Offset wraps modulo `single` for a seamless loop in both directions; `dt` is clamped (0.05s) so tab-switches don't cause jumps
- `touch-pan-y` lets horizontal drag grab the ribbon while vertical page scroll still works on mobile; `data-hover` expands the custom cursor ring; `cursor: grab` → `grabbing`
- **Reduced motion:** `baseline = 0` (no perpetual spin) and the loop idle-suspends; drag still works and settles to a stop. `Marquee.jsx` is no longer referenced in the `prefers-reduced-motion` CSS block

### Hero
- Kicker: `"Creative Technologist · Freelance Web Designer"`
- Services CTA — desktop only: electric button in the top-right corner below the `(001) Index / Landing` label, `hidden md:inline-flex`, fades in at delay 1.9s
- On **mobile** the homepage Services link lives in the **nav hamburger overlay** (no separate hero button — that was removed as redundant)
- Button dark mode: light → `bg-electric text-ivory`; dark → `bg-ink text-ivory` (white fill, navy text)
  - Token note: `ivory` = navy in dark, `ink` = white in dark — the CSS vars swap symmetrically

### About
- Bio lead: `"a creative technologist and freelance web designer in Colombo"`
- "What I build" copy: mentions freelance work for businesses/creatives in Colombo and beyond
- "How I work" copy: "Most client sites go from brief to live in a couple of days"
- Electric "Services & pricing →" link added after "What I build" paragraph

### Contact
- Intro: removed `"classmates from IIT"` — now reads `"Internships, collaborations, or anyone with a good idea"`
- "See services & pricing →" link removed (surfaced adequately via Hero and About)

### Content
- **Projects:** Danella De Cruz (06) — went `status: "live"` 2026-08-03, href `https://danelladc.com`; tags: Client Work / Music / Next.js. Blurb now reads "a Colombo cover artist" (was "an upcoming vocal artist" — the live site shows venue credits and a 10K+ following, so "upcoming" undersold it)
- **Projects:** Kahatagaha Graphite added 2026-08-03 (07, `status: "live"`, tags: HTML/CSS/JS / Concept / Design) — a speculative pitch, not paid client work, hence the `Concept` tag. Coursework Archive renumbered 07 → 08
- **Projects:** Blurb reads `"Seven projects out in the world. One more in motion."` (updated as client sites shipped)
- **Timeline:** no Danella De Cruz entry — an earlier note here claimed one was added (2026 · "Client project · Portfolio & Booking"), but `components/Timeline.jsx` has never contained it. Corrected 2026-08-03; the Timeline stays education/personal-milestone only, with client work living in Projects

### Contact Details (single source of truth in `lib/site.js`)
- `EMAIL` → `hello@damiandc.com`
- `WHATSAPP` → `94777120272`
- `WHATSAPP_LINK` → auto-generated `wa.me` link with pre-filled message

### Performance & Refactors
- `ClientEnhancements.jsx` — lazy-loads Cursor + SmoothScroll via `next/dynamic ssr:false`
- First Load JS: 148 kB → 143 kB
- `sharp` moved from `devDependencies` to `dependencies`

### Accessibility & UX
- Mobile menu: `aria-expanded`, `role="dialog"`, `aria-modal`, focus trap, Escape-to-close, body scroll lock, focus restoration
- **Mobile menu now also sets `<main>` `inert`** while open (Nav + ServicesNav) so browse-mode screen readers can't reach content behind the overlay
- `MotionProvider.jsx` wraps entire app with `<MotionConfig reducedMotion="user">`
- `cursor: none` gated behind `html.js-cursor` class — `Cursor.jsx` adds it on mount, removes on unmount; JS failure leaves native cursor visible. **Also skipped entirely for `prefers-reduced-motion` and `forced-colors: active` users** (JS bail in `Cursor.jsx` + CSS media guards in `globals.css`) so they keep the native cursor
- `:focus-visible` ring using `rgb(var(--c-electric))`
- `@media (prefers-reduced-motion: reduce)` block in globals.css

### Accessibility Pass — Lighthouse a11y 100 (2026-07-01)
Verified **100 / 100 / 100 / 100** (Accessibility · Best Practices · SEO · Agentic) on a production build in dark mode, via chrome-devtools Lighthouse.
- **Timeline list semantics:** `<ol>` children had been wrapped in a `<div>` (invalid list). `Reveal.jsx` gained an `as` prop so the reveal wrapper renders as the real `<li>` — valid `<ol>`/`<li>` nesting with the animation intact
- **Heading order:** About's `§ 01 — About` label changed from `<div>` to `<h2>` (keeps the `.section-label` class → no visual change) so headings descend sequentially
- **Decorative elements hidden:** Hero scroll-cue and the `Availability` pulse dot marked `aria-hidden`
- **Résumé download:** `aria-label="Download CV — PDF"` so the file type is announced
- **ThemeToggle:** switched to an isomorphic `useLayoutEffect` so the correct sun/moon icon is set before paint — no icon flash for dark-mode visitors
- **Contrast:** the two "soon" project cards were `opacity-60`, dragging their text under 4.5:1 in dark mode → lifted to `opacity-75` and the "soon" badge muted from `electric` to `ink-soft`

### Motion System — v3 (2026-07-08)
A site-wide "refined editorial" motion pass. All shared values live in **`lib/motion.js`** (`EASE`, `DUR`, `VIEWPORT`, `SPRING` configs, intro singleton) — import from there, never re-hardcode `[0.22,1,0.36,1]`.

**New components:**
- **`SplitLines.jsx`** — masked line reveals for headings. SSR renders plain text (SEO, no CLS); client-side it tokenizes React children (nested styled `<span>`s supported), waits for `document.fonts.ready`, groups words into real lines by `offsetTop`, then each line rises `y:120%→0` behind an `overflow-hidden` mask. **Masks carry `pb-[0.14em] -mb-[0.14em]`** — italic serif descenders (g/y/j) need far more allowance than the hero's all-caps `0.04em`; don't shrink it or descenders get clipped. A11y: split innards are `aria-hidden`, an `sr-only` span carries the coherent string (**NOT `aria-label`** — invalid on `<p>`, cost an a11y point once). Debounced resize re-splits without replaying. Reduced motion / unsupported children → plain fade fallback. Used on every section h2 (both pages), services h1, and About's intro line.
- **`IntroStamp.jsx`** — decrypt intro on **every page load** (user preference; originally session-gated): name + coordinates resolve from glitch chars (~0.65s) on an ivory `z-[65]` curtain, clip-path wipes up by ~1.3s. `pointer-events-none`, `aria-hidden`, skipped under reduced motion via `shouldPlayIntro()` in `lib/motion.js` — Hero reads the same memoized decision and shifts its delays by `INTRO_OFFSET` (1.0s). Homepage only.
- **`ScrollProgress.jsx`** — 2px electric `scaleX` bar, fixed top, **`z-[55]`** (stack: top-fade 40 → nav 50 → progress 55 → grain 60 → cursor 70). Mounted on both pages. Kept under reduced motion (it's information), spring removed.
- **`Parallax.jsx`** — scroll drift wrapper. **Text/headings must NOT use it** (user: drift on letters reads as lag when scrolling up — removed twice). Only on: Lens photo cards (alternating 12/22px) and Contact's `hello.` watermark (30px).

**Modified behavior:**
- **Hero** — name lines rise as units (line-2 words share one delay); whole entrance compressed to one sequence ending ~1.7s (`at(s) = t0 + s`, `t0 = INTRO_OFFSET` when the intro plays).
- **Projects cards** — staggered `whileInView` entrance (delay capped at `i≤2`; **soon cards animate to `opacity: 0.75`**, not 1 — framer's inline opacity overrides the class). Live-card hover: mist fill sweep (`scale-y` from bottom, transform-only), title→electric, SVG arrow draw-in (`stroke-dashoffset 1→0`, pre-drawn on `hover:none` devices). **No title slide** (removed by user), **no heading parallax** (removed by user). Cards live inside the right grid column so the `§ 04` label can be sticky.
- **Timeline** — electric line draws via `scaleY` (`useScroll` offset `["start 0.7","end 0.55"]` + `SPRING.draw`); dots flip `bg-ink`→`bg-electric` as the tip passes their measured thresholds (`useMotionValueEvent`, discrete state). The old hardcoded `accent` dot prop is ignored. Reduced motion: fully drawn, all lit.
- **Sticky labels** — `md:sticky md:top-32` on section labels: Projects, Timeline, Contact (homepage) + all five `/services` sections. About already had it.
- **Marquee** — reads `window.scrollY` delta inside its existing rAF loop (no new listeners; works with or without Lenis): scroll velocity adds an offset boost (≤400px/s, signed by travel direction — never touches drag `velocity`) and a `skewX` shear (≤5°) that settles as you stop. Both gated by the `reduce` flag.
- **Footer** — three cells now `Reveal y={16} margin="0px"` (Reveal gained a `margin` prop — footer elements can never scroll 80px past the fold, default viewport margin would keep them invisible).
- **Services page** — full system: SplitLines h1/h2s, sticky labels, ScrollProgress, work cards with sweep + drawn arrow. WhatsApp CTA gained `dark:bg-ink dark:text-ivory` (electric bg + navy text was 4.46:1 in dark — pre-existing contrast fail).
- **Magnetic CTAs — built then REMOVED** (user: cursor-pull "reduces the professional effect"). `Magnetic.jsx` was deleted; buttons keep their colour-fill + arrow-nudge hovers only. Don't reintroduce magnetic/cursor-follow effects on buttons.

### Upcoming-Projects Glitch Field (2026-07-01)
- `GlitchField.jsx` — a decorative, continuously-scrambling field of monospace glyphs rendered behind each "soon" project card (Coursework Archive; Danella De Cruz until it went live 2026-08-03), matching the reference in `docs/Glitch Text.png` (untracked, local-only)
- **Canvas-rendered, not DOM text — on purpose:** carries no accessible text (screen readers ignore it) and no DOM glyphs for the contrast audit to flag at its intentionally-faint opacity. Drawn in the real **JetBrains Mono** stack read from the wrapper's computed `font-family` (Canvas can't parse `var(--font-mono)`); redraws once `document.fonts.ready` resolves
- Radial center-fade mask keeps the overlaid title/blurb readable; `aria-hidden`; glyph colour re-read on theme flip via a `MutationObserver` on `<html>` so it never lags the theme
- **Reduced motion:** paints a single static frame, no loop
- **Perf:** the rAF loop is gated by an `IntersectionObserver` (only animates while on screen, 100px rootMargin) **and** a `visibilitychange` listener (pauses on hidden tabs) — off-screen fields don't churn the main thread during scroll
- A live-title "decrypt" animation was prototyped and **removed** (too janky) — only the "soon" cards animate

---

## Custom Tailwind Tokens
All tokens are CSS-variable-backed (`rgb(var(--c-*) / <alpha-value>)`) so `/opacity` modifiers work in both themes.
**Token swap rule:** `ivory` ↔ `ink` invert between light and dark — use this when building theme-aware components.

| Token | Light | Dark |
|---|---|---|
| `ivory` | #F6F6F1 (warm white — page bg) | #0B1F3A (navy — page bg) |
| `paper` | #FBFBF7 (elevated surface) | #112646 (elevated surface) |
| `ink` | #0B1F3A (navy — primary text) | #F6F6F1 (white — primary text) |
| `ink-soft` | #16315A | #A2B4D0 |
| `ink-faint` | #5A6B82 | #8EA1C0 |
| `electric` | #2563EB | #3B82F6 (brightened for navy contrast) |
| `sky` | #DBEAFE | #2D5496 |
| `mist` | #EEF4FD | #142C52 |
| `rule` | #D9DEE6 | #2A3F63 |

---

## V3 Phase 1 (branch `v3-phase-1`, 2026-10-27)

Plan: `docs/v3/plan-phase-1.md`; spec: `docs/v3/design.md` + `docs/v3/hero-portrait.md`.
- **Hero portrait:** `public/hero/portrait.webp` (800×1000, EXIF-free) comes from `npm run process-portrait "<headshot.png>"`. The original headshot stays outside the repo. The canvas samples it with `createImageBitmap` (off the main thread). Don't switch back to `drawImage` + `getImageData` on the full image: that readback was a ~65 ms task on a throttled phone.
- **Loader:** `IntroStamp` stays (every load of Home). As it lifts (`INTRO_OFFSET`), the portrait plays a 2.4 s wave from the face and the hero text floats in as before. Its states are exposed as `data-state` on `[data-portrait]`: `loading → wave → static`, `skipped` (late) or `error`.
- **Lens:** over the portrait, the cursor ring (`.cursor-ring.is-lens`, 240 px) grows into a lens over the full-colour photo. On touch, dragging moves a canvas-drawn lens.
- **Decode language:** the 8 § labels on Home decode on entry. Mono buttons (the hero SERVICES buttons, "Request CV") scramble on hover and focus. Underlined links (nav, "Services & pricing") don't (Damian). `/services` gets these in Phase 4.
- **Lighthouse (prod builds, devtools throttling):** at parity with `main`. Desktop scores 100, and mobile is 79–81 with LCP about 2.1 s on both.
- **Fixed on `v3`, still live on `main`:** under reduced motion, components that branched markup on framer's `useReducedMotion()` (`SplitLines`, `Parallax`, `Timeline`, `ScrollProgress`) failed hydration (React #418), and the rebuild reset the theme to light. They now use `lib/useReducedMotion.js`, a hydration-safe hook. Any new component that changes its markup for reduced motion must use it too. The fix reaches the live site when `v3` merges to `main` (see `docs/v3/README.md` → "Before `v3` merges to `main`").

---

## Key Files

```
app/
  not-found.jsx does NOT exist at this level — see (site)/not-found.jsx below (route-group sharp edge)

  (site)/                — portfolio root layout group (ivory theme)
    layout.jsx            — metadata, Person + Service JSON-LD, fonts, no-flash theme script, MotionProvider
    page.jsx              — assembles all homepage sections, ClientEnhancements
    globals.css           — :root + .dark token blocks, .top-fade, .grain, .link-line, etc.
    not-found.jsx          — 404 UI, rendered inside the portfolio theme
    [...notFound]/page.jsx — catch-all that calls notFound() so unmatched URLs reach the boundary above
    services/
      page.jsx            — /services metadata, OfferCatalog JSON-LD, renders ServicesNav + Services + Footer

  (lab)/                  — /lab root layout group (dark studio theme, unlisted)
    layout.jsx            — Syne + IBM Plex Mono, metadata.robots noindex, MotionProvider
    lab.css               — --lab-* tokens, color-scheme: dark, reduced-motion kill block
    lab/
      page.jsx            — gallery index (header + LabGrid)
      [slug]/page.jsx      — fullscreen demo route, generateStaticParams from lib/lab.js, prev/next nav

  icon.svg / icon.png   — DDC favicon (navy square, Georgia serif, ivory rules) — shared, resolved at app root
  apple-icon.png        — 180×180 Apple touch icon
  robots.js             — allows all, references sitemap
  sitemap.js            — homepage + /services entries only (lab intentionally absent)

lib/
  lab.js                — CATEGORIES + ALL_DEMOS (authored wave order) → exported DEMOS (category-grouped),
                          SECTIONS (index grouping/counts), labHref()/LAB_INDEX_HREF (clean URL shape),
                          LAB_PHOTOS (shared captioned photo set), getDemo, demoIndex
  decode.js             — (V3) noise set, scrambleText (pure, unit-tested)
  portrait.js           — (V3) every hero-portrait number: field build, density, shade, fade, wave, scan (pure, unit-tested)
  cursor.js             — (V3) the cursor ring's eased position, shared with the portrait lens

components/
  lab/
    registry.jsx         — slug → next/dynamic(ssr:false) component map (the client boundary)
    LabStage.jsx          — demo shell: mounts/unmounts on IntersectionObserver+visibility, Replay, Full link (labHref)
    LabGrid.jsx           — sectioned index grid (renders SECTIONS; filter chips unmount hidden demos)
    Poster.jsx            — static CSS placeholder shown while a demo is unmounted
    hooks.js              — useActive, usePrefersReducedMotion, useLatest
    useOgl.js             — shared ogl renderer bootstrap + dispose (WEBGL_lose_context on unmount)
    demos/*.jsx           — the 70 demo components (see /lab section above for the full roster + scroll pattern rules)

components/
  Nav.jsx               — homepage fixed header; ThemeToggle; desktop nav + a11y mobile menu (NAV_LINKS)
  ServicesNav.jsx       — /services fixed header; section links + Portfolio button + ThemeToggle + a11y mobile menu
  ThemeToggle.jsx       — sun/moon animated toggle, localStorage + .dark class
  Availability.jsx      — reusable pulse dot + "Available · 2026"
  MotionProvider.jsx    — <MotionConfig reducedMotion="user"> wrapper
  ClientEnhancements.jsx— lazy-loads Cursor + SmoothScroll (ssr:false)
  SmoothScroll.jsx      — Lenis init + delegated anchor click interception on document (lenis.scrollTo, offset -80)
  Hero.jsx              — oversized name, kicker, scroll parallax, desktop corner Services button; (V3) portrait stage + mobile Services button
  About.jsx             — bio, "What I build" + "How I work" + Services link
  Services.jsx          — full /services page content (6 sections, pricing, hero corner Portfolio button, WhatsApp + email CTAs)
  Leadership.jsx        — prefect/interact roles
  Skills.jsx            — tech skills
  Projects.jsx          — selected work (live = motion.a, soon = motion.div dimmed to 75% + GlitchField bg)
  GlitchField.jsx       — canvas glitch/decrypt field behind "soon" cards (aria-hidden, JetBrains Mono, IntersectionObserver-gated)
  Reveal.jsx            — scroll-reveal wrapper; `as` prop renders it as a semantic tag (e.g. <li>) instead of a div
  Timeline.jsx          — chronological milestones
  Resume.jsx            — CV download (id="resume")
  Lens.jsx              — phone photography gallery
  Contact.jsx           — email + socials (data from lib/site.js)
  Footer.jsx            — v:03 / Always evolving

  SplitLines.jsx        — masked line reveals for headings (fonts.ready + offsetTop grouping; sr-only a11y text)
  HeroPortrait.jsx      — (V3) canvas ASCII portrait: field/rest render, loader wave as the curtain lifts, idle scan + flicker, cursor lens
  Scramble.jsx          — (V3) DecodeLabel (§ labels decode on entry) + ScrambleText (link/button hover/focus scramble)
  ScrollProgress.jsx    — 2px electric top progress bar (z-55, both pages)
  Parallax.jsx          — scroll drift for NON-TEXT accents only (Lens photos, hello. watermark)

lib/
  site.js               — YEAR, SHORT_YEAR, EMAIL, WHATSAPP, WHATSAPP_LINK, WHATSAPP_MESSAGE,
                          NAV_LINKS, SOCIALS (single source of truth — update here, not in components)
  motion.js             — EASE, DUR, VIEWPORT, SPRING configs + shouldPlayIntro()/INTRO_OFFSET
                          (single source for motion values — import, never re-hardcode the ease)

public/
  og.jpg                — 1200×630 OG image (45KB JPEG)
  photography/          — optimized 1600px-wide JPEGs for Lens.jsx (EXIF stripped)

assets/
  photography-originals/ — raw phone JPEGs (gitignored — contain GPS EXIF, never commit)
  private/               — full CV PDF with personal details (gitignored — Résumé section uses a
                           mailto "Request CV" link instead; never commit or serve this file)

posts/                    — local social media exports (gitignored — lives on this machine only)
  DDC-Services-Poster.png — 2160×2160 light-theme services poster, rendered from /poster route (now deleted)

scripts/
  optimize-photos.mjs   — sharp resize: assets/photography-originals/ → public/photography/

ecosystem.config.js     — PM2 config (name: damiandc-website, port: 3000, -H localhost)
proxy.js                — Next proxy/middleware: routes lab.damiandc.com → /lab, 404s /lab on
                          the main host (see Server Info → Lab subdomain)
```

---

## Server Info
- **Deploy:** SSH into VPS → run `~/deploy.sh` (lives on server, NOT in repo)
- **PM2 process name:** `damiandc-website`
- **deploy.sh does:** `git pull origin main → rm -rf .next → npm install → npm run build → pm2 restart damiandc-website`
- **sharp note:** `sharp` is in `dependencies` — `npm install` (not `--production`) must run, which `deploy.sh` already does correctly

### nginx + TLS (do not re-break)
- **One server block** proxies `damiandc.com` + `www.damiandc.com` + `lab.damiandc.com` → `http://[::1]:3000` (IPv6 loopback — the app listens only there, see *Loopback binding* below). `proxy.js` handles per-host routing, so nginx just forwards to a single upstream.
- **`proxy_set_header Host $host;`** must be in `location /` — the lab subdomain routing reads the `Host` header. Without it, `lab.damiandc.com` falls through to the portfolio.
- **One SAN cert** (`--cert-name damiandc.com`) covers all three names. **Never** run `certbot --nginx -d lab.damiandc.com` alone: certbot rewrites the shared block's `ssl_certificate` to a lab-only cert and the main domain then serves a mismatched cert ("unsafe"). Reissue combined:
  ```bash
  sudo certbot --nginx --cert-name damiandc.com -d damiandc.com -d www.damiandc.com -d lab.damiandc.com
  ```
- **HTTP/2** is on via `http2 on;` inside each `listen 443 ssl` block (nginx ≥ 1.25.1 — this box runs 1.28.x; the old `listen … http2` form is deprecated). Verify with `openssl s_client -connect <host>:443 -alpn h2` → `ALPN protocol: h2` (note: server-side `curl` may report HTTP/1.1 if that curl build lacks h2 — trust the ALPN check).
- **Editing nginx config:** edit files in `sites-available/` **directly**, not via the `sites-enabled/` symlink — `sed -i` on a symlink replaces it with a regular file and desyncs the two dirs. Keep `.bak` backups **out** of `sites-enabled/` (it's `include`-globbed, so a stray backup loads as a duplicate server block → "conflicting server name" + fragile routing). Session backups live in `/root/nginx-backups/` on the VPS.
- **Loopback binding (do not change to 127.0.0.1):** `ecosystem.config.js` runs `next start -H localhost` so only nginx can reach the app. It must be `localhost`, **not** `127.0.0.1`: Next normalizes `127.0.0.1` → `localhost` in the proxy's `request.nextUrl` but builds the server's own origin from the literal `-H` value, so every `proxy.js` rewrite looks cross-origin, gets fetched as an external URL (`http://localhost:3000/lab` — nothing listening), and **`lab.damiandc.com` 404s** while the main site looks fine. This shipped unnoticed 2026-09-29 → fixed 2026-10-06. `-H localhost` resolves to `::1` only on this box, hence the `[::1]:3000` upstream. Changing PM2 `args` needs `pm2 delete damiandc-website && pm2 start ecosystem.config.js && pm2 save` — `pm2 restart` (what `deploy.sh` runs) keeps the old args. Quick check after any change: `curl -s -o /dev/null -w '%{http_code}' https://lab.damiandc.com/` → 200.
- **`dos.damiandc.com`** is a separate app (its own server block, `:3100`, own cert) — unrelated to the portfolio; leave it out of any `damiandc.com` cert/config commands.

### Lab subdomain (`proxy.js`)
- `proxy.js` at the repo root maps the `lab.damiandc.com` host onto the `(lab)` route group: `/` → rewrite `/lab`; clean slug `/xray-hero` → rewrite `/lab/xray-hero` (canonical — **internal links are clean `/<slug>` hrefs from `lib/lab.js` `labHref()`**, so the visible URL never carries `/lab`); `/lab/*` served as-is (back-compat for old shared links only). On the main host, `/lab` and `/lab/*` rewrite to a non-route → styled 404, so the lab lives **only** on the subdomain (no redirect; nothing was shared). Dev: `lab.localhost:3000` mirrors the subdomain.
- `app/(lab)/layout.jsx` `metadataBase` points at `https://lab.damiandc.com`. The lab stays `noindex` and out of the sitemap — the subdomain move doesn't change its unlisted status.

---

## Sections (in order)
`§ 01 About` · `§ 02 Beyond the Code` · `§ 03 Stack` · `§ 04 Selected Work` · `§ 05 Timeline` · `§ 06 Résumé` · `§ 07 Lens` · `§ 08 Contact`

> Note: Hero has no `§` label. Section numbering starts at About.

---

## Content Reference

### Hero
- Name: **DAMIAN / DE CRUZ.** — `text-[17vw] md:text-[13.5vw]`, `tracking-tightest leading-[0.82]`
- Kicker (above h1): `"Creative Technologist · Freelance Web Designer"` — font-mono, fades in at delay 0.2
- Tagline: *"learning, shipping, breaking things."*
- Top-left: coordinates (N 6.9271° / E 79.8612°) · Top-right: (001) Index/Landing — both fade on scroll via `metaOpacity`
- Services button: desktop only, top-right corner below the (001) label — `hidden md:inline-flex`, fades in at delay 1.9s
- Mobile Services link: in the nav hamburger overlay (no separate hero button — removed as redundant)
- Section padding: `pt-44 md:pt-52`

### Nav (homepage — `Nav.jsx`)
- Links: About · Work · Timeline · Résumé · Contact (from `NAV_LINKS` in `lib/site.js`)
- Logo: `DDC / Portfolio '26` → `#top` (→ `/` if ever rendered off-home)
- "Available · 2026" — `<Availability />` component with pulse dot, NOT a link
- `<ThemeToggle />` — sun/moon, next to availability on desktop
- Mobile: hamburger (3 lines → X), full-screen overlay with italic large links + a **Services →** cross-link button + Availability

### ServicesNav (`/services` — `ServicesNav.jsx`)
- Logo: `DDC / Services '26` → `#top`
- Links: Pricing · Process · Work · FAQ (→ `#what-i-do`, `#process`, `#recent`, `#faq`) — local `SERVICES_LINKS` array in the component, smooth-scrolled by SmoothScroll/Lenis
- Right: `<ThemeToggle />` + `<Availability />` (`hidden md:inline-flex`). The Portfolio CTA is NOT here — it lives in the services hero corner (`Services.jsx`), mirroring the homepage hero
- Mobile: hamburger → full-screen overlay with italic large links + a **Portfolio →** cross-link button + Availability (same a11y pattern as Nav)
- `PortfolioButton` helper carries `mix-blend-normal isolate` (legacy from when it lived in the multiply-blended header; harmless in the overlay)

### Projects
| # | Title | Status | Notes |
|---|---|---|---|
| 01 | This Portfolio | Live | href: #top — "You're here ↑" |
| 02 | Personal Dashboard | Live | https://enderguardian25.github.io/personal-dashboard/ |
| 03 | Spades Solutions | Live | Client project — https://enderguardian25.github.io/spades-solutions/index.html |
| 04 | Aloys Travels | Live | Client project — https://aloys-travels.pages.dev/ |
| 05 | Danella De Cruz | Live | Client project — portfolio & booking site for a Colombo cover artist — https://danelladc.com |
| 06 | Kahatagaha Graphite | Live | Concept pitch — two home-page concepts for a crystalline graphite producer — https://enderguardian25.github.io/kgll-website/ |
| 07 | Coursework Archive | Soon | dim + `cursor-default`, no hover |

> Order rule: live projects sit above `soon` ones — Coursework Archive is the only `soon` card left, so it sits last.
> `soon` cards (07) render on an animated `GlitchField` canvas backdrop at `opacity-75` — see *Upcoming-Projects Glitch Field* under "What's in main".

Blurb: *"Six projects out in the world. One more in motion."*

Note (2026-08-26): Ranmal Flora (formerly `03`) removed from Projects and Services `work[]` — client site was taken down.

### Timeline (newest → oldest)
- 2026 — This Portfolio *(accent color)*
- 2026 — Personal Dashboard
- 2025–2026 — Completed first year (IIT · University of Westminster)
- Sep 2025 — Began BSc (Hons) Computer Science (IIT · University of Westminster)
- 2022–2024 — Edexcel A-Levels (St. Joseph's College, Colombo 10)
- 2024 — First lines of code
- 2020 — Video games as a hobby
- 2018 — Where it began (Scratch, Micro:bit & Arduino)

### Leadership Roles (in order)
1. Head Prefect — St. Joseph's College, Colombo 10 (2024–25)
2. District Interact Representative — Rotary (2024–25)
3. Asst. District Interact Secretary (2023–24)
4. Senior Prefect — St. Joseph's College, Colombo 10 (2022–23)
5. Club President — SJC Interact (2022–23)

### Lens (§ 07)
- Private IG mirror — curated phone photography hosted on the site itself (IG account `@nothing._.ddc` stays private)
- Photo entries live in the `photos` array at the top of `components/Lens.jsx` — `{ n, src, caption, location }`. Set `src: null` for a placeholder card.
- All shots tagged as "shot on Nothing Phone (3a) Pro" in the section blurb.
- CTA: outbound to https://www.instagram.com/nothing._.ddc/ — "Private account — request access for the full feed."
- Card hover: tile lifts (`whileHover y:-4`); image itself does NOT zoom (user preference).

#### Adding new photos
1. Drop raw phone JPEG into `assets/photography-originals/` (gitignored).
2. Run `npm run optimize-photos` (uses sharp).
3. Output `.jpg` lands in `public/photography/` (resized to max 1600px wide).
4. Add a new entry to the `photos` array in `components/Lens.jsx` pointing at `/photography/<filename>.jpg`.
5. URL-encode any spaces or parens in filenames (e.g. `IMG_x (1).jpg` → `IMG_x%20(1).jpg`).

### Contact (§ 08)
- Email: `hello@damiandc.com` (from `EMAIL` in `lib/site.js`)
- WhatsApp: `+94 77 712 0272` (from `WHATSAPP` in `lib/site.js`)
- LinkedIn: @damian-de-cruz
- GitHub: @EnderGuardian25
- Instagram: @damian._.dc
- Discord: enderguardian_22 (user ID: 1123626535786659910)
- Socials driven by `SOCIALS` array in `lib/site.js`
- Left column accent: vertical "hello." (`writingMode: vertical-rl`, `rotate(180deg)`, `fontSize: 7rem`)

### Footer
- `v:03 / Always evolving` — `text-right` at **all** screen sizes
- Copyright: `© {YEAR} — Damian De Cruz` (year from `YEAR` in `lib/site.js`)

---

## Social Poster

A 1:1 (2160×2160 at 2×) services poster lives at `posts/DDC-Services-Poster.png` on this machine — gitignored, local only.

> **Full pipeline:** see [`docs/POSTER-PIPELINE.md`](docs/POSTER-PIPELINE.md) — durable reference for building/regenerating any social post (temp Next.js route → headless Chrome screenshot, light-theme guards, teardown).
> **Key lesson:** never hand-build in SVG (librsvg renders fonts wrong). Always render the real page in a browser.

---

## Critical Design Rules — DO NOT RE-BREAK
1. **Italic name clipping** — `overflow-hidden` on LINE-LEVEL divs (`pb-[0.04em]`), never on word spans
2. **OG image** — static `public/og.jpg` only. No dynamic `/opengraph-image` route — causes 502 on nginx+PM2
3. **"Available · 2026"** — `<Availability />` component, never `<a>`, on both desktop and mobile
4. **Mobile hamburger X** — y offset exactly `6` (not 7); lines use `gap-[5px]`
5. **Footer** — `text-right` at all sizes, not just mobile
6. **No stats strip** in Leadership (removed by user)
7. **No scroll parallax** on project titles (removed by user)
8. **Theme transition flicker** — global `color` transition removed from `*`; only `background-color` + `border-color` on `*`, and `color` on `body` only
9. **Soon cards** — `motion.div` (not `motion.a`), `opacity-75 cursor-default select-none` (was `opacity-60` — raised for AA contrast), no `data-hover`; each sits on a `<GlitchField>` bg. Their title `<h3>` must NOT carry `transition-colors` (only live cards need it, for the hover-to-electric effect) — otherwise the title colour visibly lags on theme switch while the rest of the card snaps
10. **Services not in `NAV_LINKS`** — it's a route, not an anchor; adding it breaks the smooth-scroll feel and clutters the nav; surface via in-page links instead
11. **Dark mode Services button** — `dark:bg-ink dark:text-ivory` (NOT `dark:bg-ivory` — ivory is navy in dark mode, ink is white)
12. **Lenis anchors** — `SmoothScroll.jsx` uses ONE delegated `click` listener on `document` (`e.target.closest('a[href^="#"]')`), NOT a `querySelectorAll` snapshot. Keep it delegated — a snapshot misses links rendered after mount (ServicesNav, mobile overlays), causing native jumps that make `whileInView` animations misfire
13. **(Removed in V3 Phase 1 — `Marquee.jsx` is gone; don't reintroduce a marquee, it read as AI-template.)** Was: **Marquee is JS-driven** — `Marquee.jsx` runs its own rAF loop for grab-to-drag + momentum. Do NOT revert it to a CSS `@keyframes marquee` / `.marquee-track` animation (that removes the drag interaction). The transform is set inline every frame; don't add a competing CSS `animation` or `transition: transform` to the track
14. **GlitchField is a `<canvas>`** — never render its glyphs as DOM text. DOM text would (a) be read aloud as gibberish by screen readers and (b) fail the colour-contrast audit at the intended faint opacity. Keep it `aria-hidden`, canvas-drawn, and keep the `IntersectionObserver` + `visibilitychange` gating so the two fields don't animate off-screen
15. **No parallax/drift on TEXT, no magnetic buttons** — user removed heading parallax twice ("letters lag when scrolling up") and the magnetic CTA pull ("reduces the professional effect"; `Magnetic.jsx` deleted). `Parallax.jsx` is only for non-text accents (Lens photos, `hello.` watermark). Card titles also must not slide on hover (removed) — colour change + card sweep only. Button hovers = colour fill + arrow nudge, nothing positional
16. **SplitLines mask allowance is `pb-[0.14em] -mb-[0.14em]`** — shrinking it clips italic descenders (the *growing* g). Its screen-reader text is an `sr-only` span, NOT `aria-label` (invalid on `<p>`, fails Lighthouse `aria-prohibited-attr`)
17. **Soon-card entrances animate to `opacity: 0.75`** — framer writes inline opacity; animating to 1 would override the `opacity-75` class and un-dim them
18. **Motion constants come from `lib/motion.js`** — `EASE`, `VIEWPORT`, `SPRING`, `INTRO_OFFSET`, `shouldPlayIntro()`. Hero, IntroStamp and (V3) HeroPortrait must share the same memoized `shouldPlayIntro()` decision; don't give any of them its own check
19. **IntroStamp plays every reload** (user preference — not session-gated; reconfirmed for V3 on 2026-10-27, with the portrait wave starting as it lifts). Keep it `pointer-events-none` + `aria-hidden` + reduced-motion-skipped so it can never trap clicks or tank a11y
20. **Above-fold content must paint in the SSR HTML** (perf pass 2026-07-18) — never wrap top-of-page content in `Reveal`/framer `initial={{opacity:0}}`; use `EagerReveal` (see *Performance Pass* section). Don't refactor EagerReveal into a conditional tag swap (remount re-registers LCP late), don't give the LCP paragraphs (`replay={false}`) their entrance back (V3: the hero lede stays static — Damian chose LCP over the spec's blur fade), and keep IntroStamp SSR-rendered with its three CSS gates (reduced-motion, `html:not(.js)`, 5s failsafe) in globals.css

---

## Running Locally
```powershell
cd D:\personal-portfolio
git checkout main
npm.cmd run dev
# http://localhost:3000 (or 3001 if 3000 is in use)
```
> Use `npm.cmd` not `npm` — PowerShell execution policy blocks the .ps1 shim

> **Tests (V3):** `npm test` runs Vitest over the pure `lib/` modules (`tests/unit/`). `npm run e2e` runs Playwright (`e2e/`, desktop 1440×900 + mobile 390×844) against `next dev` on :3000 — it reuses a running dev server or starts one. First-visit loader tests retry: on a cold dev build the 2.5 s slow-load gate can legitimately skip the wave.

> **Never run `npm run build` while `next dev` is running** — they share the `.next` folder; production manifests will clobber dev manifests, causing CSS 404s. If this happens: stop dev server → `rm -rf .next` → restart dev server.

---

## Deploying
```bash
# main is merged and pushed. To deploy:
# 1. SSH into Hetzner VPS, then:
~/deploy.sh

# 2. Verify
# https://damiandc.com — dark mode toggle, favicon, sitemap, OG image, /services page
# https://damiandc.com/sitemap.xml
# https://damiandc.com/robots.txt
# https://lab.damiandc.com — lab index loads, a demo opens
# https://damiandc.com/lab — returns the styled 404 (lab lives only on the subdomain)

# 3. Post-deploy GSC tasks
# - Submit sitemap.xml in Google Search Console
# - Request indexing of https://damiandc.com and https://damiandc.com/services
```

---

## Pending / Next Ideas
- [x] ~~Finish visually reviewing the wave-2 lab demos~~ — DONE 2026-07-11: all 50 demos eyeballed across both rounds, 12 files fixed in round 2
- [x] ~~Commit + deploy the 2026-07-18 performance pass~~ — DONE 2026-07-18: `0758068` + `2a9ac17` pushed and deployed (this deploy also shipped lab wave 3 `e2ded2d` + liquid-type `3baa9fd` from 07-13). Live clean-headless scores in the *Performance Pass* section; verify on Google PSI when convenient
- [ ] **/services not indexed by Google** — technical signals verified clean 2026-07-18 (in sitemap, canonical OK, no noindex/X-Robots-Tag, robots.txt allows). Sitemap submitted + indexing requested in GSC 2026-07-18 — give it days–weeks; re-check URL Inspection for the verdict string. Residual factors: young low-authority domain, weak internal linking (`/services` deliberately not in nav), `www.` serves 200 without redirecting to apex (canonical covers it, but a 301 would consolidate)
- [ ] Lab deferred refactors (from the wave-3 review; touch 30+ pre-existing demos): `--lab-accent` token to replace ~47 hardcoded `#3b82f6`, and a shared rAF-loop / scroll-progress helper in `components/lab/hooks.js` (the dt-clamp + exp-smoothing scaffolding is forked across ~14 demos, the internal-scroller block across ~11)
- [x] ~~`next build` regression check before deploy~~ — DONE 2026-07-18: built green repeatedly during the perf pass (80 static pages) and deployed
- [x] ~~Submit sitemap + request indexing of `/` and `/services` in GSC~~ — DONE 2026-07-18
- [ ] Verify live: dark mode, `/services`, OG image (sitemap/robots verified 2026-07-18)
- [ ] Verify GA4 data flowing in Google Analytics dashboard (~24–48 hrs after deploy; note gtag now loads `lazyOnload`)
- [ ] Personal Dashboard — add live link when ready
- [x] ~~Danella De Cruz — update project card with live link when site is deployed~~ — DONE 2026-08-03: card is `live`, href `https://danelladc.com`
- [x] ~~Spades Solutions — update project card with live link when site is deployed~~ — DONE (card already live)
- [x] ~~Aloys Travels — update project card with live link when site is deployed~~ — DONE (card already live)
- [ ] Coursework Archive — reveal when ready
- [ ] Add a testimonial / client outcome to `/services` (biggest remaining trust gap)
- [ ] Homepage: add WhatsApp CTA above the fold on mobile (Services button is desktop-only)
- [x] ~~Lighthouse audit after deploy~~ — DONE 2026-07-18 (see *Performance Pass*); optional follow-up: confirm on Google PSI
- [ ] D: drive (KINGSTON NVMe) — check Event Viewer → System for disk/nvme/Ntfs errors; consider reseating M.2 drive (intermittent PCIe bus dropouts caused file corruption in a prior session)

---

## Headless Chrome in this sandbox

This dev sandbox has no browser system libs and no `sudo`. Playwright's bundled Chromium fails to launch here — `ldd` on the Chromium binary shows missing `.so`s (`libnss3`, `libatk`, `libcups`, `libx11`, `libcairo`, `libpango`, etc). This is required for the **UI self-verification** step above (screenshotting the local dev server). Fix below needs no root anywhere; do it once per sandbox, then reuse.

**1. Download the missing `.deb`s** (`apt-get download` doesn't need root):
```bash
SCRATCH=/tmp/claude-1000/<session-scratchpad-path>   # this session's scratchpad dir
mkdir -p "$SCRATCH/libs" && cd "$SCRATCH/libs"
apt-get download libnss3 libnssutil3 libsmime3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libcups2t64 libxcb1 libasound2t64 libgbm1 libx11-6 libxext6 libcairo2 \
  libpango-1.0-0 libpangocairo-1.0-0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libatspi2.0-0
```

**2. Extract into a local rootfs** (`dpkg -x` also doesn't need root):
```bash
mkdir -p "$SCRATCH/rootfs"
for f in "$SCRATCH"/libs/*.deb; do dpkg -x "$f" "$SCRATCH/rootfs"; done
```

**3. Fonts.** Use the full Chromium binary — **not** `chrome-headless-shell` (that had font/rendering issues). Point `LD_LIBRARY_PATH` at the extracted libs, and point fontconfig at the rootfs's font config plus a writable fake `$HOME` (fontconfig needs to build a cache), with DejaVu TTFs copied in:
```bash
mkdir -p "$SCRATCH/fchome/.local/share/fonts" "$SCRATCH/fchome/.cache/fontconfig"
cp "$SCRATCH/rootfs"/usr/share/fonts/truetype/dejavu/*.ttf "$SCRATCH/fchome/.local/share/fonts/"
```

**4. Playwright launch** — point `executablePath` at the installed Chromium (check the revision under `~/.cache/ms-playwright/`, e.g. `chromium-1234`):
```js
const browser = await chromium.launch({
  executablePath: '/home/damian/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});
```

**5. Run with the env pointed at the rootfs:**
```bash
LIBPATH="$SCRATCH/rootfs/usr/lib/x86_64-linux-gnu:$SCRATCH/rootfs/usr/lib/x86_64-linux-gnu/gbm"
LD_LIBRARY_PATH="$LIBPATH" \
FONTCONFIG_FILE="$SCRATCH/rootfs/etc/fonts/fonts.conf" \
FONTCONFIG_PATH="$SCRATCH/rootfs/etc/fonts" \
HOME="$SCRATCH/fchome" XDG_CACHE_HOME="$SCRATCH/fchome/.cache" XDG_DATA_HOME="$SCRATCH/fchome/.local/share" \
node shot.js
```

Once `$SCRATCH/rootfs` and `$SCRATCH/fchome` are built, reuse them for later screenshots in the same sandbox — no need to redo steps 1–2.
