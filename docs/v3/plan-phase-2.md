# V3 Phase 2 Implementation Plan: Projects

> **Status: built on `v3-phase-2` (2026-10-27), waiting for Damian's screenshot approval and the local merge. Don't re-execute it.** The build departed from this plan in these ways, all logged in [`decisions.md`](decisions.md) → "Phase 2 build rulings":
> - **Screenshots stay uncommitted** until Damian approves them. The capture prep waits out Aloys' slideshow and hides the cursor and the dev badge.
> - **Review fixes:**
>   - Only keyboard focus scrolls the strip, and Tab makes focus beat a parked mouse.
>   - The pin is gated on `html.js`.
>   - Card links are described by their blurb.
>   - Canvases size from the ResizeObserver entry.
> - **Keyboard-pass fixes:** the end card scrolls into view on focus, and counts in nearest-to-centre.
> - **One e2e change:** the reduced-motion test checks "not sticky", not "track < 3 screens"; a stacked list is legitimately taller.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Projects list with the pinned diagonal strip of browser-window cards. Each card shows a skeleton of its site and decodes through noise characters into a real screenshot. Mobile gets an offset stack, and reduced motion gets a plain decoded list.

**Architecture:**
- **Pure modules, unit-tested:**
  - `lib/projects.js`: the data.
  - `lib/strip.js`: strip geometry and nearest-to-centre.
  - `lib/cardDecode.js`: per-cell decode phases.
- **Thin components over them:** React state holds only *which* card is active. Canvases and transforms are driven through refs and framer motion values, never per-frame state.
- **No JS for layout:** the pinned layout and the reduced-motion list are pure CSS (`md:` and `motion-safe:` variants), so server HTML is correct for everyone and nothing branches on hydration.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4.3, framer-motion 14.6 (`useScroll`, `useTransform`), Canvas 2D, sharp, Vitest, Playwright.

**Spec:**
- [`design.md`](design.md) → "5. Projects", "Global motion system", "Constraints".
- [`decisions.md`](decisions.md) → "Projects (wow #2)" and "Phase 2 planning (2026-10-27)".
- [`copy.md`](copy.md) → "§ 04 Selected Work".

## Decisions made while planning (Damian, 2026-10-27)

- **Pin engine:** sticky section plus framer `useScroll`, not GSAP.
- **Card decode:** glyph-grid canvas.
- **Screenshots:** Playwright captures at 1440×900 → WebP. Damian sees them before they are committed.
- **Merge:** local merge into `v3`.

**Builder's calls (report to Damian):**
- **Touch devices use nearest-to-centre activation in both layouts.** That covers tablets ≥ 768 px that get the pinned strip but have no hover.
- **The § 04 intro copy changes now** to the approved "two more on the way" line. The old line ("One more in motion") would contradict the two upcoming cards.

## Global Constraints

- **Card order:** 01 This Portfolio · 02 Personal Dashboard · 03 Aloys Travels · 04 Spades Solutions · 05 Danella De Cruz · 06 Kahatagaha Graphite · 07 Interact District 3220 (upcoming) · 08 ai-studio (upcoming) · end card. Coursework Archive is gone.
- **Strip geometry:**
  - Path angle 12°, lower-left to upper-right. Cards stay level.
  - Card width 45% of the viewport width.
  - The pin lasts 3 viewport-heights of scroll.
- **Card label:** `NN — Title — Year`, in mono under the card. Tags and blurb appear on hover, focus or activation.
- **Upcoming cards:**
  - Generic skeleton. Never decodes, never a link.
  - On hover the label line reads `loading… 2026 →`.
  - Address bars read `interactdistrict3220.org` and `ai-studio`.
- **End card:**
  - The address bar types `your-site.com`.
  - Line: *Your project next.*
  - Link: `Start a project →` to `#contact`.
- **Noise set:** `NOISE` from `lib/decode.js`. Don't define another one.
- **Palette and theming:** tokens `--c-electric`, `--c-ivory`, `--c-paper`, `--c-ink`, `--c-mist`, `--c-rule` only. Skeletons must recolour in dark mode with no JS.
- **Reduced motion:** no pin, no canvas and no typing. Every card shows its screenshot (upcoming cards show their skeleton), and the blurb and tags are always visible.
- **Hydration safety:** markup that differs with reduced motion uses CSS `motion-safe:` / `motion-reduce:` variants or `lib/useReducedMotion.js`, never framer's `useReducedMotion()`.
- **Public repo:**
  - Screenshots are of public live sites only.
  - Nothing of Interact District 3220's unreleased design is committed.
  - Scan the staged diff before every commit (`CLAUDE.md`).
- **Framework and server:** Next 16: read `node_modules/next/dist/docs/01-app/` before writing framework code. Never run `npm run build` while `next dev` runs.
- **Branch:** `v3-phase-2` (already cut from `v3`). It merges into `v3` locally when Damian approves. Don't push.

## Review Focus

1. **The strip scrolls under a resting pointer.** The card that arrives under a still mouse decodes, and the one that leaves it dissolves. Damian's stationary-hover rule says presence persists. Tested in Task 6.
2. **Tabbing to an off-screen card in the pinned strip.** The page scrolls so the focused card is in view, and the clipped viewport is never scrolled sideways by the browser's focus scrolling. Tested in Task 6.
3. **Short or ultra-wide viewports** (1280×720, 1440×700, 2560×1080). The leading card and its label are fully on screen at every point of the pin. Tested in Task 1.
4. **Screenshot slow or failed when a card is hovered.** The decode waits for the image. On failure the card stays a skeleton and still works as a link, with no page error. Tested in Task 5.
5. **Rapid in-out hover, and theme toggle mid-decode.** A decode reverses from wherever it is and ends at `skeleton`. Colours are read at the start of every run. Tested in Task 5.

---

### Task 1: Project data and strip geometry

**Files:**
- Create: `lib/projects.js`, `lib/strip.js`
- Test: `tests/unit/projects.test.js`, `tests/unit/strip.test.js`

**Interfaces:**
- Produces: `PROJECTS: Project[]`, where `Project = { n: "01", slug, title, year: "2026", blurb, tags: string[], href: string|null, domain, status: "live"|"upcoming", self: boolean, skeleton: string, shot: string|null }`.
  - `shot` is `/projects/${slug}.webp` for live cards and `null` for upcoming ones.
  - `self` is true only for This Portfolio, whose `href` is `"#top"` and which opens in the same tab.
  - `skeleton` is a key into `SKELETONS` (Task 4): `portfolio`, `dashboard`, `aloys`, `spades`, `danella`, `kahatagaha`, or `generic` for both upcoming cards.
- Produces: `END_CARD = { domain: "your-site.com", line: "Your project next.", cta: "Start a project →", href: "#contact" }`.
- Produces: `STRIP = { ANGLE_DEG: 12, CARD_VW: 0.45, CARD_MAX_VH: 0.55, GAP_VW: 0.06, EDGE_VW: 0.08, PIN_SCREENS: 3, SHOT_RATIO: 900 / 1440, CHROME_PX: 34, LABEL_PX: 96 }`.
- Produces: `stripLayout({ vw, vh, count }) → { cardW, shotH, cardH, pitch, rise, startX, startY, travelX, travelY }`.
  - `cardW = min(CARD_VW·vw, CARD_MAX_VH·vh / SHOT_RATIO)` and `shotH = cardW·SHOT_RATIO`.
  - `cardH = CHROME_PX + shotH + LABEL_PX`, `pitch = cardW + GAP_VW·vw`, `rise = pitch·tan(12°)`.
  - `startX = EDGE_VW·vw` and `startY = (vh − (cardH + rise)) / 2 + rise`.
  - `travelX = (count−1)·pitch − (vw − cardW − 2·EDGE_VW·vw)` and `travelY = travelX·tan(12°)`.
- Produces: `cardPosition(i, L) → { left: i·pitch, top: −i·rise }`, the card's position inside the strip.
- Produces: `stripOffset(p, L) → { x: startX − p·travelX, y: startY + p·travelY }`, the strip's translate.
- Produces: `progressForCard(i, L) → clamp(i·pitch / travelX, 0, 1)`.
- Produces: `nearestToCentre(centres: number[], extent: number) → index | −1`. It returns −1 when no centre lies within `extent/2` of `extent/2`.

- [ ] **Step 1: Write the failing tests.**
  - `projects.test.js`:
    - The titles equal the Global Constraints order, and `n` runs `"01"…"08"`.
    - Aloys has `href === "https://aloys-travels.com/"` and `domain === "aloys-travels.com"`.
    - Both upcoming cards have `href === null` and `shot === null`; ai-studio's blurb is `"In the works · 2026"` and its tags are empty.
    - Every live card except This Portfolio has an `https://` href. This Portfolio has `self: true`, `href: "#top"` and `domain: "damiandc.com"`.
    - No title is `"Coursework Archive"`.
    - The blurbs equal `copy.md` § 04 verbatim.
  - `strip.test.js`:
    - `cardW` is 648 at 1440×900 and 528 at 1440×600, where the vh cap binds.
    - At `p = 0`, card 0's screen left (`stripOffset(0).x + cardPosition(0).left`) is `0.08·vw`.
    - At `p = 1`, the last card's screen right is `vw − 0.08·vw` (`toBeCloseTo`, 3 digits).
    - `(y₁ − y₀)/(x₀ − x₁)` between `p = 0` and `p = 1` is `tan(12°)`.
    - `progressForCard(0) === 0` and `progressForCard(count−1) === 1`, and it is strictly increasing.
    - **Review Focus 3:** for each of 1440×900, 1280×720, 1440×700 and 2560×1080 with `count = 9`, at `progressForCard(i)` for every `i` the card's screen top is `≥ 0` and its bottom (`top + cardH`) is `≤ vh`.
    - `nearestToCentre([100, 420, 900], 844) === 1` and `nearestToCentre([-900, 1900], 844) === -1`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement both modules to the interfaces above. Copy the blurbs and domains from `copy.md`. Keep the existing tags from `components/Projects.jsx` for the six live cards. Interact District 3220's tags are `["Client Work"]`.
  - Domains for the GitHub Pages sites: `enderguardian25.github.io/personal-dashboard`, `…/spades-solutions` and `…/kgll-website`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): project data and diagonal strip geometry`.

### Task 2: Card decode maths

**Files:**
- Create: `lib/cardDecode.js`
- Test: `tests/unit/cardDecode.test.js`

**Interfaces:**
- Produces:
  - `DECODE = { CELL_PX: 14, BAND: 0.18, DECODE_MS: 700, DISSOLVE_MS: 450, DISSOLVE_DELAY_MS: 600 }`.
  - `hash01(col, row, seed) → [0, 1)`, deterministic.
  - `cellThreshold(col, row, cols, seed) → 0.75·col/max(cols−1, 1) + 0.25·hash01(col, row, seed)`. The front sweeps left to right with jitter.
  - `cellPhase(progress, threshold) → "skeleton" | "noise" | "shot"`:
    - `progress ≤ 0` gives `"skeleton"`.
    - Otherwise let `u = progress·(1 + BAND)`. Then `u < threshold` gives `"skeleton"`, `u < threshold + BAND` gives `"noise"`, and anything else gives `"shot"`.
  - `stepProgress(progress, target: 0|1, dtMs) → number`. It moves toward the target at `1/DECODE_MS` per ms going up and `1/DISSOLVE_MS` going down, clamped to [0, 1].
- Dissolving is the same sweep run with progress falling: cells go back through noise to skeleton.

- [ ] **Step 1: Write the failing tests.**
  - At progress 0, every cell of a 40×25 grid is `"skeleton"`. At progress 1, every cell is `"shot"`.
  - At progress 0.5, column 0 is never `"skeleton"` and the last column is never `"shot"`.
  - `hash01` is identical across calls and lies in [0, 1).
  - `stepProgress(0, 1, 350)` is `0.5` and `stepProgress(1, 0, 450)` is `0`.
  - Mid-run reversal: `stepProgress(0.4, 0, 90)` is `0.2`.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement `lib/cardDecode.js`. Import `NOISE` / `noiseChar` from `lib/decode.js` where needed; don't copy them.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): card decode cell maths`.

### Task 3: Screenshots

**Files:**
- Create: `scripts/capture-projects.mjs`, `public/projects/*.webp` (6 files)
- Modify: `package.json` (add the script `"capture-projects": "node scripts/capture-projects.mjs"`)

**Interfaces:**
- Consumes: `PROJECTS` (live cards: `slug`, `href`, `self`).
- Produces: `public/projects/{portfolio,personal-dashboard,aloys-travels,spades-solutions,danella-de-cruz,kahatagaha-graphite}.webp`, each 1440×900, with no metadata. The slugs in `PROJECTS` must match these names.

- [ ] **Step 1:** Write the script.
  - Usage: `node scripts/capture-projects.mjs [slug…]`; with no slugs it captures all live cards.
  - Capture with Playwright Chromium at viewport 1440×900, `colorScheme: "light"`, top of the page only.
  - Load each page with `goto(…, { waitUntil: "networkidle" })` and then wait 4 s.
  - **Per-site prep:**
    - `aloys-travels`: click `button:has-text("Reject")`, then wait 500 ms.
    - `portfolio`: URL `http://localhost:3000/`. Wait for `[data-portrait]` to reach `data-state` `static` or `skipped`, then 500 ms. It needs `next dev` running.
  - Pipe the PNG buffer through `sharp(buf).webp({ quality: 78 })`. sharp strips metadata by default.
- [ ] **Step 2:** Start `npm run dev`, then run `npm run capture-projects`. Expected: 6 files, each under 250 KB.
- [ ] **Step 3:** Read all 6 images.
  - No cookie banner.
  - Nothing half-loaded.
  - The portfolio shot shows the finished V3 hero.
- [ ] **Step 4 (gate):** Show the 6 images to Damian and wait for his OK before committing. Re-capture any he rejects.
- [ ] **Step 5:** Run `git add scripts/capture-projects.mjs package.json public/projects`, then confirm with `exiftool public/projects/*` or `sharp().metadata()` that there is no EXIF. Commit: `feat(v3): project screenshots and capture script`.

### Task 4: Skeletons and the mini portrait

**Files:**
- Create: `scripts/mini-portrait.mjs`, `lib/miniPortrait.js` (generated, committed), `components/projects/skeletons.jsx`
- Modify: `package.json` (add the script `"mini-portrait": "node scripts/mini-portrait.mjs"`)
- Test: `tests/unit/miniPortrait.test.js`

**Interfaces:**
- Produces: `MINI_PORTRAIT: string[]`, 21 rows of 28 characters drawn only from `RAMP` (`lib/portrait.js`).
- Produces: `SKELETONS: Record<key, () => JSX>` for `portfolio`, `dashboard`, `aloys`, `spades`, `danella`, `kahatagaha`, `generic` and `empty`.
  - Each one returns `<svg viewBox="0 0 1440 900" data-skeleton={key} aria-hidden="true" preserveAspectRatio="xMidYMid slice">`.

- [ ] **Step 1: Write the failing test.**
  - `MINI_PORTRAIT` has 21 rows, each of length 28.
  - Every character is in `RAMP`.
  - At least 25% of the characters are not spaces.
  - The middle rows hold denser glyphs than the corners.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Write `scripts/mini-portrait.mjs`.
  - Read `public/hero/portrait.webp` with sharp into raw RGBA at `28·3 × 21·3`.
  - Run it through `buildField(rgba, 28, 21, 3)`, then `density(field, i, false)` and `glyphIndex`, all from `lib/portrait.js`. Node 24's ESM detection loads that file.
  - Write `lib/miniPortrait.js` with a "generated by scripts/mini-portrait.mjs — don't edit" header.
- [ ] **Step 4:** Run `npm run mini-portrait && npm test`. Expected: PASS.
- [ ] **Step 5:** Write the skeletons.
  - Trace each live site's layout by hand from its `public/projects/*.webp`.
  - **Shared primitives:**
    - `Bar` (rounded text bar): `fill-ink/12`.
    - `Block` (image or panel): `fill-electric/10` with `stroke-electric/35`.
    - `Solid` (buttons, accents): `fill-electric/35`.
    - A full-size background rect: `fill-paper`.
  - Only these token classes may set colour, so dark mode recolours with no JS.
  - **Recognisable features per site:**
    - `dashboard`: title and two boxed pills top-right, a rule, three tab buttons, a wide left panel with a solid top edge and a block of text bars, and two stacked right panels.
    - `aloys`: a full-bleed photo `Block`, a square logo top-left, a nav row, a thin script line over three wide centred headline bars, two centred buttons (one solid, one outlined), and two round buttons bottom-right.
    - `spades`: logo, three centred nav items and a pill button. On the left, a kicker, three heavy headline bars, four lines and two pills. On the right, a large circle with a dotted inner ring around a spade path.
    - `danella`: a wordmark, five nav items and "Book" top-right. On the left, a kicker, two headline bars (the second indented and thinner), three lines and two pills. A soft radial blob on the right.
    - `kahatagaha`: a kicker, one headline bar and three lines, then two side-by-side cards, each an image `Block` with a 4-segment strip under it, three lines and three tag pills.
    - `portfolio`: the V3 hero, with the nav, two huge name bars, the lede lines and the SERVICES button. `MINI_PORTRAIT` sits bottom-right as `<text>` rows in JetBrains Mono, `fill-electric`.
    - `generic`: nav, a centred headline, a 3-card row and a footer band. Neutral, so nothing of a client design shows.
    - `empty`: the background only.
- [ ] **Step 6:** Commit: `feat(v3): site skeletons and mini ASCII portrait`.

### Task 5: Browser frame, card and decode canvas

**Files:**
- Create: `components/projects/BrowserFrame.jsx`, `components/projects/useCardDecode.js`, `components/projects/ProjectCard.jsx`
- Test: `e2e/projectCard.spec.js` (desktop project; it exercises the card through the Home page once Task 6 mounts it, so write it now and run it at the end of Task 6 Step 4)

**Interfaces:**
- Consumes: `PROJECTS`, `DECODE`, `cellThreshold`, `cellPhase`, `stepProgress`, `SKELETONS`, `noiseChar`.
- Produces: `BrowserFrame({ domain, children, addressRef? })`.
  - Three dots plus a mono address bar (ellipsis on overflow), `CHROME_PX` (34) tall, with the chrome `aria-hidden="true"`.
  - Children fill a 16:10 shot area.
- Produces: `useCardDecode({ active: boolean, canvasRef, imgRef, hasShot: boolean }) → { state }`.
  - It writes `data-decode` on the card root. The values are `skeleton | decoding | shot | dissolving`, `scrambling` (upcoming cards) and `static` (reduced motion).
  - **Activation:**
    - `active` true → `await img.decode()`. The run then goes to target 1.
    - `active` false → wait `DISSOLVE_DELAY_MS`, then target 0. Re-activating inside the delay cancels it.
  - **The rAF loop runs only while progress is moving**:
    - Each cell draws per `cellPhase`. A `shot` cell gets `drawImage` of its slice. A `noise` cell gets a `--c-mist` fill and an electric `noiseChar` glyph, re-rolled every `TICK_MS`. A `skeleton` cell is cleared.
    - At progress 1 it shows the `<img>` and clears the canvas. Dissolve hides the `<img>` first.
    - Colours are read from the CSS variables at the start of each run.
  - **`hasShot` false (upcoming):** the target goes to 1 and then straight back to 0. `shot` cells are cleared, so noise passes over and leaves the skeleton.
  - **Image error:** the state stays `skeleton` and no error is thrown.
  - **Reduced motion:** no-op, state `static`.
- Produces: `ProjectCard({ project, index, active, onFocusCard })`.
  - **Root:** `[data-card={index}]`.
  - **Live card:** an `<a>` with `target="_blank" rel="noopener noreferrer"` (same tab for `self`). Its `aria-label` is `` `${title}, ${year} (opens in a new tab)` ``; `self` uses `` `${title}, ${year} (back to top)` ``. `onFocus` calls `onFocusCard(index)`.
  - **Upcoming card:** a `<div>`, not focusable.
  - **Contents:** `BrowserFrame` around the skeleton, the `<img src={shot} width=1440 height=900 loading="lazy" alt="">`, and the canvas.
  - **Label:** `NN — Title — Year`.
  - **Reveal row:** tags and blurb, or `loading… 2026 →` plus the blurb on upcoming cards. It is always laid out and shown with `opacity` when the card is active, decoded or reduced motion, so nothing shifts.
  - **Reduced-motion CSS:** `motion-reduce:` shows the `<img>` and hides the skeleton and canvas on live cards.

- [ ] **Step 1: Write the failing e2e tests.** Scroll each card into view with Task 6's focus helper (`page.locator('[data-card="2"]').focus()`), then hover its centre.
  - `hover decodes to shot and shows tags`: `data-decode` reaches `shot` within 2 s, and the reveal row has opacity 1.
  - `leave waits, then dissolves`: after the mouse moves off, the state is still `shot` at 300 ms and reaches `skeleton` within 2 s.
  - `quick in-out ends as skeleton` (Review Focus 5): hover for 150 ms, then leave. The state reaches `skeleton` within 2 s and never sticks at `decoding`.
  - `failed screenshot stays a skeleton link` (Review Focus 4): with `page.route("**/projects/aloys-travels.webp", r => r.abort())`, hover card 2. The state is `skeleton` after 2 s, the element is still an `a[href="https://aloys-travels.com/"]`, and `trackErrors` is empty.
  - `upcoming card never decodes`: on `[data-card="6"]`, hover. The state is `scrambling` and then `skeleton`, never `shot`. The text `loading… 2026 →` is visible, and the root is not an `a` and contains no `a`.
  - `theme toggle mid-decode` (Review Focus 5): hover card 3, click the theme toggle at 200 ms. The state reaches `shot`, with no errors.
- [ ] **Step 2:** Implement `BrowserFrame`, `useCardDecode` and `ProjectCard` to the interfaces. Size the canvas to the shot area × `devicePixelRatio` with a `ResizeObserver`. The glyph font is `700 ${CELL_PX - 2}px` from the `--font-mono` family the hero uses.
- [ ] **Step 3:** Commit: `feat(v3): project card with skeleton-to-screenshot decode`. The e2e tests go green in Task 6.

### Task 6: Projects section — strip, stack, end card

**Files:**
- Create: `components/projects/EndCard.jsx`, `e2e/projects.spec.js`
- Modify: `components/Projects.jsx` (full rewrite)

**Interfaces:**
- Consumes: `PROJECTS`, `END_CARD`, `STRIP`, `stripLayout`, `cardPosition`, `stripOffset`, `progressForCard`, `nearestToCentre`, `ProjectCard`, `BrowserFrame`, `SKELETONS.empty`, `DecodeLabel`, `SplitLines`, `Reveal`, `ScrambleText`, `useReducedMotion` (from `lib/useReducedMotion.js`).
- Produces: `#work`, which holds:
  - The header (the § label, the "A small but *growing* shelf." title, and the new intro line from `copy.md`).
  - The track `[data-strip-track]`, with classes `motion-safe:md:h-[400vh]`.
  - The viewport `[data-strip-viewport]`, with classes `motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:overflow-clip`. Use `overflow-clip`, not `hidden`, so focus can't scroll it sideways.
  - The strip `[data-strip]`.
- **Layout by mode:**
  - **Desktop, motion allowed:** after mount, a `matchMedia("(min-width: 768px)")` effect computes `stripLayout` on resize. Cards are absolutely positioned at `cardPosition`. A framer `useScroll({ target: track, offset: ["start start", "end end"] })` drives the strip's `x` and `y` through `stripOffset`.
  - **Below `md`, or reduced motion:** cards are a vertical flow. Below `md`, each card is 88vw wide, and odd cards get `ml-auto` (the alternating offset).
- **Activation:**
  - **Fine pointer** (`(hover: hover) and (pointer: fine)`): keep the last pointer position. On `pointermove` and on every scroll-progress change, hit-test with `elementFromPoint(...)?.closest("[data-card]")`. When the pointer leaves the document, set the active card to `null`.
  - **Touch:** the active card is `nearestToCentre` of the card centres. Use horizontal centres against `vw` in the strip and vertical centres against `vh` in the stack, recomputed on scroll.
  - **Keyboard:** `onFocusCard(i)` makes card `i` active. In strip mode it also calls `window.scrollTo({ top: trackTop + progressForCard(i, L) · (trackHeight − vh), behavior: "instant" })`. Blur clears the active card unless the pointer is on it.
  - **Reduced motion:** nothing is ever active.
- Produces: `EndCard()`.
  - It is a `BrowserFrame` around `SKELETONS.empty`, with "Your project next." in serif and a `ScrambleText` link `Start a project →` to `#contact`.
  - When 60% of it is in view, the address bar types `your-site.com` at 70 ms per character. Under reduced motion it is pre-filled.

- [ ] **Step 1: Write the failing e2e tests** (`projects.spec.js`).
  - **Desktop:**
    - `labels in order`: the label texts equal `01 — This Portfolio — 2026` … `08 — ai-studio — 2026`, and the end card comes last.
    - `section pins and strip follows 12°`: scroll to 25% and then 75% of the track. `[data-strip-viewport]` keeps `top` 0. Card 0's box moves with `dx < 0`, `dy > 0` and `|dy/dx|` within 0.02 of `tan(12°)`.
    - `live cards open in a new tab`: `[data-card="2"]` has `target="_blank"` and `rel` contains `noopener`.
    - `resting pointer decodes the card the strip brings to it` (Review Focus 1): park the mouse at 30% of the width and 55% of the height. Scroll with `mouse.wheel` until a different `[data-card]` lies under that point. That card reaches `shot` without a mouse move, and the previous card reaches `skeleton`.
    - `tab reaches off-screen cards` (Review Focus 2): focus card 0 and press Tab 5 times. The focused `[data-card="5"]` box lies inside the viewport. `[data-strip-viewport]` has `scrollLeft === 0`. Its state reaches `shot`.
    - `enter opens the site`: on focused card 3, `context.waitForEvent("page")` after Enter gives a URL that starts with `https://enderguardian25.github.io/spades-solutions`.
    - `end card types and links`: the address bar text becomes `your-site.com`, and the link's `href` is `#contact`.
    - `resize mid-pin keeps the leading card on screen`: pinned at 50%, set the viewport to 1280×720. The card at `progressForCard` lies fully inside the viewport.
    - `no console errors through the pin` (`trackErrors`).
  - **Mobile:**
    - `stacked, no pin, alternating offset`: `[data-strip-viewport]` has computed `position` other than `sticky`. Card 1's box `x` is greater than card 0's.
    - `card nearest centre decodes`: scroll card 2 to the centre. It reaches `shot`, and card 1 reaches `skeleton`.
  - **Both, with `page.emulateMedia({ reducedMotion: "reduce" })`:**
    - `reduced motion is a plain decoded list`: the track height is below `3 × vh`. Every live card's `img` is visible and its `[data-skeleton]` is hidden. Every `data-decode` is `static`. Hovering changes nothing.
- [ ] **Step 2:** Run `npm run e2e -- projects projectCard`. Expected: FAIL.
- [ ] **Step 3:** Rewrite `components/Projects.jsx` and write `EndCard.jsx` to the interfaces. `GlitchField` stays in the repo (IntroStamp uses it); only the Projects import goes.
- [ ] **Step 4:** Run `npm run e2e -- projects projectCard`. Expected: PASS on desktop and mobile. Then run the full `npm test && npm run e2e`. Expected: all PASS, Phase 1 suites included.
- [ ] **Step 5:** Commit: `feat(v3): pinned diagonal Projects strip with mobile stack`.

### Task 7: Phase verification, docs and merge

**Files:**
- Modify: `docs/v3/README.md`, `docs/v3/decisions.md`, `docs/v3/plan-phase-2.md` (status note)

- [ ] **Step 1: Screenshots.** Use a scratchpad Playwright script, then Read every image.
  - Desktop 1440×900 at pin progress 0, 0.5 and 1, plus one card decoded.
  - Mobile 390×844 with the stack and one card decoded.
  - Dark mode for both, so the skeletons recolour.
  - Reduced motion for both.
  - Fix anything that looks off before going on.
- [ ] **Step 2: Keyboard pass.** Tab from the § 03 section through every card, through the end-card link and into § 05. The focus ring is visible on each, and Enter opens each live site.
- [ ] **Step 3: Lighthouse.** Follow `README.md` → "Testing" on `main` and `v3-phase-2`, 3 runs each for mobile and desktop. Expected: medians are no worse than `main`, and LCP stays around 2.1 s on mobile. Screenshots are lazy and must not appear in the LCP chain.
- [ ] **Step 4: Fresh review.** One fresh reviewer goes over the whole branch (`git diff v3...v3-phase-2`) against this plan and the spec. Apply the fixes, then re-run `npm test && npm run e2e`.
- [ ] **Step 5: Docs.**
  - `README.md`: Phase 2 done, the next step is Phase 3, and a "What Phase 2 built" code map.
  - `decisions.md`: any rulings made while building.
  - This plan: a status note at the top.
- [ ] **Step 6 (gate):** Show Damian the screenshots and the live dev page. On his approval, run `git switch v3 && git merge --no-ff v3-phase-2`, then delete the branch. Don't push.
