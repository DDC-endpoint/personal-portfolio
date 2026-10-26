# V3 Phase 3 Implementation Plan: Timeline, Lens and Contact

> **Status: written 2026-10-27, waiting for Damian's review. Nothing is built yet.** Start at Task 1 on branch `v3-phase-3` once he approves. If he changes anything, update this plan and [`decisions.md`](decisions.md) first.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild three Home sections with the approved V3 motion and copy:
- **Timeline:** a scroll-driven running stitch, with milestones that light up.
- **Lens:** a compact gallery whose photos develop from halftone, plus a full-screen viewer.
- **Contact:** an electric card that grows with scroll.

**Architecture:** the same split as Phases 1 and 2.
- **Pure, unit-tested modules** hold the data and maths: `lib/timeline.js`, `lib/lens.js`, `lib/halftone.js`, `lib/contact.js`, plus a digit noise option in `lib/decode.js`.
- **Components are thin:**
  - Per-frame work goes through refs, motion values or canvases, never React state.
  - Server HTML always carries the real text and photos.
  - Effects are client-side replays over it.
  - Reduced motion and no-JS get the finished state from CSS.

**Tech Stack:** Next.js 16.4, React 19.3, Tailwind 4.3, framer-motion 14.6 (`useScroll`), Canvas 2D, sharp, Vitest, Playwright.

**Spec:**
- [`design.md`](design.md): "6. Timeline", "8. Lens", "9. Contact", "Global motion system".
- [`decisions.md`](decisions.md): "Timeline (wow #3)", "Lens — photo gallery (wow #4)", "Contact (wow #5)", "Phase 3 planning (2026-10-27)".
- [`copy.md`](copy.md): Timeline, § 07 Lens, § 08 Contact.
- Reference prototype: [`spike/gallery-mockup.html`](spike/gallery-mockup.html). Port its behaviour, not its structure.

## Decisions made while planning (Damian, 2026-10-27)

- **New copy now:** these three sections take the approved `copy.md` text.
- **Head Prefect entry:** a new "2024–2025 · Head Prefect" entry, right after A-Levels.
- **Contact card start:** the tile starts as a small square under the § 08 label and grows right and down.
- **Lens develop timing:** timed, about 1.2 s on entering view, replaying every time.

## Global Constraints

- **Section labels stay as they are:** `§ 05 — Timeline`, `§ 07 — Lens`, `§ 08 — Contact`, via `DecodeLabel`.
- **Palette:** use only the tokens `--c-electric`, `--c-ivory`, `--c-paper`, `--c-ink`, `--c-ink-soft`, `--c-ink-faint`, `--c-mist`, `--c-rule`.
- **"Ivory text" on the electric Contact card** is `text-ivory` in light mode and `dark:text-ink` in dark mode, because the ivory token turns navy in dark mode.
- **Public repo:**
  - The 6 new photos go through `npm run optimize-photos`. Verify that no output has EXIF/GPS before committing.
  - Never commit `assets/photography-originals/`.
  - Scan the staged diff before every commit.
- **Reduced motion:**
  - Timeline: fully stitched, everything lit.
  - Lens: photos in colour, no develop, viewer opens without the expand animation.
  - Contact: card full width from the start.
  - Use CSS `motion-safe:`/`motion-reduce:`, or `lib/useReducedMotion.js` when markup changes. Never use framer's hook for markup.
- **No-JS:**
  - The finished state shows; nothing starts hidden or clipped in server HTML.
  - Clip paths, dash offsets and dimming are written by effects, or gated on `js:`.
- **Hover rules:**
  - Hover effects work with a stationary pointer (Damian's rule).
  - Mono buttons scramble their letters only, never an arrow. An arrow sits outside `ScrambleText` (Damian, Phase 2).
- **Build safety:** never run `npm run build` while `next dev` runs. Lighthouse runs on production builds in scratchpad worktrees (see `README.md` → Testing).
- **Branch:** `v3-phase-3` (cut from `v3`), merged into `v3` locally when Damian approves. No push.

## Review Focus

1. **Viewer keyboard and focus.** It opens from a tile with Enter or click. Focus moves into the dialog and Tab stays inside it. Esc closes it, and focus returns to the tile it opened from. The page under it doesn't scroll (Lenis included). Tested in Task 5.
2. **Fast scroll through the Lens.** Tiles that leave view mid-develop reset to halftone without a stale frame. Canvases sleep when off screen, and no rAF runs once every tile has settled. Tested in Task 4.
3. **Timeline when scrolled back up.** The stitch unstitches, milestones below the needle go faint, and a year that already decoded decodes again the next time the needle passes. Nothing below the needle keeps its ink. Tested in Task 6.
4. **Contact card with keyboard focus before it has grown.** Tabbing to the email button while the card is still small must leave the button visible. Focus inside the card fully opens it. Tested in Task 7.
5. **Resize and theme toggle.** The Contact clip and the Timeline stitch recompute on resize. Halftone dots and the card colours follow a theme change. Tested in Tasks 4, 6 and 7.

---

### Task 1: Photos and Lens data

**Files:**
- Create: `lib/lens.js`, `tests/unit/lens.test.js`
- Add: 6 optimized JPEGs in `public/photography/`

**Interfaces:**
- Produces: `FRAMES: Frame[]`, where `Frame = { n: "01", src, caption, month, hero: boolean, area: { col: [start, end], row: [start, end] } }`. The order and values come from the `design.md` → Lens table:
  - `src` is `/photography/<file>.jpg`, URL-encoded.
  - `area` gives grid lines, e.g. Frame 01 is `{ col: [1, 3], row: [1, 3] }`.
- Produces: `LENS_NOTE = { count: "10", range: "2025 – 2026 · Sri Lanka", note: "Private account. Request access for the full feed.", handle: "@nothing._.ddc", href: "https://www.instagram.com/nothing._.ddc/", area: { col: [5, 7], row: [3, 4] } }`.
- Produces: `LENS_INTRO = "Shot on a Nothing Phone (3a) Pro: light, geometry and the occasional accident. The feed is private; this is the cut I share."`

- [ ] **Step 1:** Run `npm run optimize-photos`.
  - It rewrites all 10 files in `public/photography/`. Restore the 4 already committed ones with `git checkout -- public/photography`, so they don't churn.
  - Confirm with sharp `metadata()` that none of the 10 outputs has `exif` or `xmp`.
- [ ] **Step 2: Write the failing tests** (`lens.test.js`).
  - There are 10 frames, numbered `01`–`10` in table order. The captions and months match the table verbatim.
  - The `hero` flag is set only on Frames 01 and 04, and each hero area spans 2×2.
  - No two areas, including the note's, overlap on a 6×3 grid, and together they fill all 18 cells.
  - Every `src` exists on disk under `public/` (decode the URL first).
  - `LENS_NOTE` and `LENS_INTRO` equal the strings above.
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module missing).
- [ ] **Step 4:** Implement `lib/lens.js`. Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(v3): Lens photos and frame data` (the 6 new JPEGs plus the lib and its test).

### Task 2: Halftone and decode maths

**Files:**
- Create: `lib/halftone.js`, `tests/unit/halftone.test.js`
- Modify: `lib/decode.js`, `tests/unit/decode.test.js` (add `scrambleDigits`)

**Interfaces:**
- Produces: `HALFTONE = { CELL: 7, DEVELOP_MS: 1200 }`.
- Produces: `dotRadius(lum, cell) → (1 − lum)^0.8 · 0.55 · cell`. `lum` is 0–1; dark areas get big dots.
- Produces: `developMix(t) → { dots, photo, grow }`, for `t` from 0 to 1:
  - `dots = 1 − smoothstep(0.35, 1, t)`
  - `photo = smoothstep(0.25, 0.9, t)`
  - `grow = 1 + 0.6·t`
  - `t ≤ 0` gives `{ dots: 1, photo: 0, grow: 1 }`; `t ≥ 1` gives `{ dots: 0, photo: 1, grow: 1.6 }`.
- Produces: `scrambleDigits(text, progress, rand?) → string`. It is `scrambleText`'s left-to-right resolve, but only digits scramble, and only into digits. Every other character (`–`, `·`, letters, spaces) stays as written, so `2022–2024` keeps its dash.

- [ ] **Step 1: Write the failing tests.**
  - `dotRadius(1, 7) === 0`. `dotRadius(0, 7)` is about 3.85. The radius strictly decreases as `lum` rises.
  - `developMix` endpoints match the above, and `photo` is monotonic.
  - `scrambleDigits("2022–2024", 0, () => 0) === "0000–0000"`, and `scrambleDigits("Sep 2025", 0, () => 0) === "Sep 0000"`.
  - `scrambleDigits(x, 1)` returns `x`. At progress 0.5, the first half resolves first.
  - The `scrambleText` tests stay unchanged.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Reuse `smoothstep` from `lib/portrait.js`; don't copy it. Run `npm test`. Expected: PASS.
- [ ] **Step 4:** Commit: `feat(v3): halftone develop maths and digit scramble`.

### Task 3: Lens grid, frames, captions and the highlighter

**Files:**
- Modify: `components/Lens.jsx` (rewrite)
- Create: `components/lens/LensTile.jsx`, `e2e/lens-gallery.spec.js`

**Interfaces:**
- Consumes: `FRAMES`, `LENS_NOTE`, `LENS_INTRO`.
- Produces: `#lens` with a header (label, title "Off-duty, *through glass*.", `LENS_INTRO`).
  - The grid is `[data-lens-grid]`.
  - **Desktop (`md`+):** 6 columns with a 16 px gap. Each single tile is 3:4, via `grid-auto-rows: calc((100cqw − 5·16px) / 6 · 4/3)` on a `container-type: inline-size` wrapper. Explicit `grid-area`s come from `area`.
  - **Mobile:** 2 columns with a 10 px gap. Hero tiles and the note span both columns. Each row's height follows its content.
- Produces: `LensTile({ frame, index, onOpen })`.
  - **Markup:** a `<button data-frame={n} aria-label={`Frame ${n}: ${caption}, ${month}. Open viewer`}>` with a hairline `border-rule`, a `bg-ivory` mat (`p-2`; `p-2.5` on hero tiles), the photo in `[data-photo]` (`next/image`, `fill`, `object-cover`, `sizes` per tile size) and the canvas slot for Task 4.
  - **Caption:** `FRAME NN` plus the caption on the left, the month on the right, in mono 9 px (10 px on hero tiles).
    - `md`+ with hover: a navy gradient overlay at the bottom of the photo. It is `opacity-0 translate-y-2.5` at rest and slides up on hover or focus.
    - Phones: static, below the photo in the mat, `text-ink-faint`.
  - **Highlighter:** an `svg[data-highlight]` with `<rect pathLength="1">` and `stroke-electric`, 1.5 px, `vector-effect: non-scaling-stroke`, `stroke-dasharray: 1 1`.
    - `stroke-dashoffset` runs 1 → 0 on hover or `focus-visible`, and on `[data-tapped]`, over 0.6 s with `cubic-bezier(.65,0,.35,1)`. It draws back on leave.
    - Touch (`(hover: none)`): a tap sets `data-tapped` with a 0.35 s duration, then calls `onOpen(index)` after 350 ms.
    - Mouse or keyboard: `onOpen` fires at once.
  - **No zoom or lift on hover.** The `Parallax` and `whileHover` wrappers from the old Lens go.
- **Note tile:** `[data-lens-note]`, same border.
  - "10 *frames*" in serif with *frames* in electric, then `range` and `note` in mono, `text-ink-faint`.
  - Then the link `@nothing._.ddc ↗` (serif italic, `target="_blank" rel="noopener noreferrer"`). The arrow sits outside the text.

- [ ] **Step 1: Write the failing e2e tests** (`lens-gallery.spec.js`).
  - `ten frames in reading order with captions` (both projects): the `[data-frame]` values are `01`…`10`, and each accessible name contains its caption.
  - `desktop grid places the hero tiles 2×2` (desktop): Frame 01's box is about twice a single tile's width and height (±3 px plus the gap), and Frame 04 sits at the right edge of the grid.
  - `captions hide at rest and show on hover` (desktop): Frame 02's caption has opacity 0, then 1 after hovering and resting 600 ms with no movement.
  - `highlighter traces on hover and on keyboard focus` (desktop): `[data-highlight] rect` has computed `stroke-dashoffset` `1` at rest, then `0` after hover (wait 700 ms). Then Tab to Frame 03: `0`.
  - `phones put captions under the photo` (mobile): the caption's top is ≥ the photo's bottom.
  - `note tile links to Instagram`: the href is `LENS_NOTE.href` and the target is `_blank`.
- [ ] **Step 2:** Run `npx playwright test lens-gallery`. Expected: FAIL.
- [ ] **Step 3:** Implement `Lens.jsx` and `LensTile.jsx`.
- [ ] **Step 4:** Run `npx playwright test lens-gallery`. Expected: PASS. Screenshot desktop and mobile, light and dark, and Read the images.
- [ ] **Step 5:** Commit: `feat(v3): compact Lens grid with mat frames and highlighter`.

### Task 4: Halftone develop

**Files:**
- Create: `components/lens/useDevelop.js`
- Modify: `components/lens/LensTile.jsx`, `e2e/lens-gallery.spec.js`

**Interfaces:**
- Consumes: `HALFTONE`, `dotRadius`, `developMix`.
- Produces: `useDevelop({ rootRef, canvasRef, imgRef })`. It writes `data-develop` on the tile: `halftone | developing | developed | static`.
  - **Mount:** if `prefers-reduced-motion`, set `static` and stop. Otherwise set `halftone`. The `<img>` gets `opacity: 0` from JS, so no-JS still shows the photo.
  - **Sampling:** once the image has loaded, draw it once into an offscreen canvas of `ceil(W/CELL) × ceil(H/CELL)` (object-cover crop) and read the luminance per cell. The canvas is sized from its `ResizeObserver` entry (Phase 2 rule: never `getBoundingClientRect` on a canvas).
  - **Halftone frame:** a `--c-ivory` fill plus electric dots of `dotRadius · grow`, at `globalAlpha = dots`, with the photo at `opacity = photo` (`developMix`).
  - **Timing:** an `IntersectionObserver` (threshold 0.35) runs a 1200 ms develop when the tile enters view. Leaving view, or crossing back below the threshold, cancels any run and resets to `halftone` at once.
  - **rAF:** runs only while developing. Colours are read from the CSS variables at the start of each run.
  - **Image error:** the tile shows the mat. The state stays `halftone`, but the canvas is cleared, so no dots float on nothing. No error is thrown.

- [ ] **Step 1: Write the failing e2e tests.**
  - `photos develop on entering view and reset on leaving` (desktop): scroll Frame 05 into view. `data-develop` goes through `developing` and reaches `developed` within 3 s. Scroll to the top and it is `halftone`. Scroll back and it develops again.
  - `fast scroll leaves no tile stuck` (desktop, Review Focus 2): scroll through `#lens` in 8 quick jumps of 300 px, 30 ms apart, then to the top. Every tile is `halftone`. Wrap `requestAnimationFrame` to count calls: 0 counted during 500 ms of idle at the top.
  - `reduced motion shows colour` (both): every tile is `static`, and every `[data-photo] img` has opacity 1.
  - `no-JS shows the photos` (desktop, `javaScriptEnabled: false`): the first photo's `img` has computed opacity 1.
  - `theme toggle mid-develop keeps going` (desktop): toggle `.dark` during `developing`. It still reaches `developed`, with no page errors.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `useDevelop` and wire it into `LensTile`.
- [ ] **Step 4:** Run `npx playwright test lens-gallery`. Expected: PASS. Screenshot one tile mid-develop and Read it: round blue dots, light to the eye.
- [ ] **Step 5:** Commit: `feat(v3): Lens photos develop from halftone`.

### Task 5: Full-screen viewer

**Files:**
- Create: `components/lens/Viewer.jsx`, `e2e/lens-viewer.spec.js`
- Modify: `components/Lens.jsx`

**Interfaces:**
- Consumes: `FRAMES`, plus `onOpen(index)` from `LensTile`.
- Produces: `Viewer({ index, originRect, onClose, onStep })`, rendered while `index != null`.
  - It is a `div[role="dialog"][aria-modal="true"][aria-label="Photo viewer"][data-lenis-prevent]`, fixed and full-screen, on a `bg-ink/90` backdrop.
  - **Contents:** the photo, `object-contain` within 92vw × 82vh, `next/image` with `sizes="92vw"`. Below it: `FRAME NN — caption · month` in mono `text-ivory` (`dark:text-ink`). Prev and Next buttons (`aria-label` "Previous photo" / "Next photo") and Close (`aria-label` "Close viewer").
  - **Open:** a FLIP expand from `originRect` (the tile's photo rect) to the final rect. It is a `transform` translate-and-scale over 0.45 s with `EASE`, and the backdrop fades in. Under reduced motion it opens directly.
  - **Close:** the reverse animation back to the current frame's tile rect (re-measured), then `onClose`. Focus returns to that tile's button.
  - **Keys:** ArrowLeft and ArrowRight wrap around the 10 frames, and Esc closes.
  - **Swipe:** a horizontal pointer drag over 50 px steps. A click on the backdrop or the photo closes; the buttons don't.
  - **Focus:** it moves to Close on open. Tab and Shift+Tab cycle Prev → Next → Close.
  - **Scroll lock:** while open, `document.body.style.overflow = "hidden"` (the `Nav` pattern), restored on close.

- [ ] **Step 1: Write the failing e2e tests** (`lens-viewer.spec.js`).
  - `click opens the viewer on that photo` (desktop): click Frame 03. The dialog is visible and its caption contains "Architecture at nightfall".
  - `arrows step and wrap`: from Frame 10, ArrowRight shows Frame 01 and ArrowLeft shows 10.
  - `esc closes and returns focus` (Review Focus 1): open Frame 06 with keyboard (focus, then Enter), press Esc. The dialog is gone and Frame 06 is focused.
  - `tab stays inside the dialog`: press Tab 5 times; `document.activeElement` is inside `[role=dialog]` every time.
  - `page does not scroll while open`: `mouse.wheel(0, 600)` twice leaves `scrollY` unchanged.
  - `swipe steps` (mobile): a drag from x=300 to x=100 on the photo steps to the next frame. Tap Frame 02, wait 400 ms, and the dialog is open.
  - `backdrop click closes`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `Viewer.jsx` and wire the `index`/`originRect` state into `Lens.jsx`.
- [ ] **Step 4:** Run `npx playwright test lens-`. Expected: PASS. Screenshot the open viewer (desktop, mobile, dark) and Read the images.
- [ ] **Step 5:** Commit: `feat(v3): Lens full-screen viewer`.

### Task 6: Timeline running stitch

**Files:**
- Create: `lib/timeline.js`, `tests/unit/timeline.test.js`, `e2e/timeline.spec.js`
- Modify: `components/Timeline.jsx` (rewrite)

**Interfaces:**
- Produces: `ENTRIES`, oldest first: the 9 from `copy.md` plus Head Prefect. Each is `{ year, title, place, detail }`. The order:
  1. 2018 · Where it began
  2. 2020 · Video games as a hobby
  3. 2022–2024 · Edexcel A-Levels
  4. **2024–2025 · Head Prefect** — "St. Joseph's College, Colombo 10" — "Led the student body as Head Prefect in the year after my A-Levels."
  5. 2024 · First lines of code
  6. Sep 2025 · Began BSc (Hons) Computer Science
  7. 2025–2026 · Completed first year
  8. Sep 2026 · Began second year
  9. 2026 · Personal Dashboard
  10. 2026 · This portfolio

  The details are verbatim from `copy.md`, and ranges use an en dash.
- Produces: `litCount(progress, thresholds) → number`, the count of thresholds at or below `progress`.
- **Component:**
  - **Thread:** in `#timeline`, a gutter thread holds a faint base rule (`rule-v`, as today) and an SVG stitch: a vertical `line`, `stroke-electric`, 1.5 px, `stroke-dasharray: 7 5` (running stitch).
  - **Draw:** the stitch is revealed by a clip `rect` whose height is `drawn × H`. `drawn` is `useSpring(scrollYProgress, SPRING.draw)` with the existing offsets `["start 0.7", "end 0.55"]`.
  - **Needle head:** `[data-needle]` is a 2 × 12 px electric needle with an eye, positioned at the tip.
  - **Milestone markers:** each milestone gets an `[data-stitch]` ×, two 8 px strokes. It scales 0 → 1 when passed and back to 0 when unpassed.
  - **Light-up:** each `<li data-milestone data-lit>` goes from `text-ink-faint` (title and detail at 45% ink) to full ink when `i < litCount`. When an entry's lit state goes false → true, its year runs `scrambleDigits(year, p)` over 500 ms. Only its digits change; dashes and month names stay.
  - **Mobile:** the thread sits on the left edge (`left-4`), as today.
  - **No-JS and reduced motion:** fully stitched, needle hidden, every milestone lit. The faint state is applied only with `js:motion-safe:`.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:** `ENTRIES` has 10 items and its titles run in the order above. Head Prefect is at index 3 with the exact text. `litCount(0.5, [0.1, 0.4, 0.6]) === 2`, and `litCount(1, [...]) === 3`.
  - **E2e** (`timeline.spec.js`):
    - `entries run oldest first` (both): the `h3` texts equal the titles.
    - `stitch draws and milestones light as you scroll` (desktop): at the top of `#timeline`, `[data-milestone][data-lit="true"]` count is 0 or 1. Scroll to the list's end and all 10 are lit, with 10 visible `[data-stitch]`.
    - `scrolling back unstitches` (desktop, Review Focus 3): scroll to the end, then back to the section top. The lit count drops to ≤ 1. The needle's top is above the 3rd milestone. Scroll down to the 3rd milestone again and its year element shows a non-final value within 200 ms (it decodes again) and reads `2022–2024` within 1 s.
    - `reduced motion is fully stitched` (both): all 10 are lit and `[data-needle]` is hidden.
    - `no-JS shows full ink` (desktop): milestone titles have computed opacity 1 or ink colour (not faint).
    - `resize keeps milestones in step` (desktop, Review Focus 5): at mid-list, resize to 1280×720. After 400 ms, the lit count equals the count of milestone dots above the needle.
- [ ] **Step 2:** Run `npm test && npx playwright test timeline`. Expected: FAIL.
- [ ] **Step 3:** Implement `lib/timeline.js` and rewrite `Timeline.jsx`. Keep the batched threshold measure (fonts ready, debounced resize).
- [ ] **Step 4:** Run them again. Expected: PASS. Screenshot desktop mid-stitch, mobile, and reduced motion, then Read the images.
- [ ] **Step 5:** Commit: `feat(v3): Timeline running stitch, oldest first`.

### Task 7: Contact growing card

**Files:**
- Create: `lib/contact.js`, `tests/unit/contact.test.js`, `e2e/contact.spec.js`
- Modify: `components/Contact.jsx` (rewrite)

**Interfaces:**
- Produces: `CONTACT = { headline: ["Got something in ", "mind", "?"], body: "Need a website? I design and build them for businesses and creatives, and many go live within a couple of days. Internships, collaborations and good ideas are welcome too. Pick whichever channel suits you.", tile: 96 }`.
- Produces: `growInset(p, { W, H, tile }) → string`. It returns `inset(t r b l round R)` with `t = l = 0`, `r = (W − tile)·(1 − e)`, `b = (H − tile)·(1 − e)` and `R = 8`, where `e = easeInOut(p)`. It clamps `p` to [0, 1], and `p = 1` gives `"inset(0px 0px 0px 0px round 8px)"`.
- Produces: `colomboClock(date) → "Colombo · HH:MM"`, 24-hour, `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })`.
- **Component:**
  - `#contact` holds the § 08 label, then the card `[data-contact-card]` across the full content width: `bg-electric text-ivory dark:text-ink`, padded, `rounded-lg`.
  - **Contents:** the serif headline with *mind* in italics; the body; an email button (`mailto:` `EMAIL` with `?subject=Website%20enquiry`); a WhatsApp button (`WHATSAPP_LINK`, new tab); the pulsing `AVAILABILITY` badge; the four `SOCIALS` as mono links with an `↗` outside the scramble; and a `[data-clock]` with `colomboClock`.
  - **Clock:** server and first render show `Colombo · --:--`. An effect fills it in and updates it every 15 s.
  - Buttons are mono and scramble with `ScrambleText`; arrows sit outside it.
  - **Growth:** `useScroll({ target: card, offset: ["start 0.95", "start 0.25"] })` drives `growInset`, written to `card.style.clipPath` in an effect, never in server HTML. Its content fades in from `p > 0.6`, also written by the effect. `W` and `H` come from the card's `ResizeObserver` entry.
  - **Focus:** `focusin` inside the card sets the clip to fully open until `focusout` leaves the card (Review Focus 4).
  - **Reduced motion and no-JS:** no clip, full card.
  - The vertical "hello." and the big social grid from the old Contact are removed.

- [ ] **Step 1: Write the failing tests.**
  - **Unit:**
    - `growInset(0, { W: 1000, H: 500, tile: 96 })` is `"inset(0px 904px 404px 0px round 8px)"`.
    - `growInset(1, …)` is `"inset(0px 0px 0px 0px round 8px)"`, and values below 0 or above 1 are clamped.
    - `colomboClock(new Date("2026-10-27T00:00:00Z"))` is `"Colombo · 05:30"`.
  - **E2e** (`contact.spec.js`):
    - `card grows with scroll and shrinks back` (desktop): with the card's top at 90% of the viewport, the computed `clip-path`'s right inset is > 500 px. At the 20% scroll point it is `0px`. Scroll back and it grows above 500 px again.
    - `content and links` (both): the headline text is "Got something in mind?". The email href starts `mailto:hello@damiandc.com`. The WhatsApp href starts `https://wa.me/`. There are 4 social links. The badge reads `Available · 2026`.
    - `clock shows Colombo time` (both): it matches `/^Colombo · \d{2}:\d{2}$/` within 2 s.
    - `focus opens the card` (desktop, Review Focus 4): with the card still small, focus the email button. The `clip-path` becomes `inset(0px 0px 0px 0px round 8px)` and the button's box is within the card's visible area.
    - `reduced motion and no-JS are full width` (desktop): no `clip-path`, or `none`.
    - `buttons keep their width while scrambling`: hover the email button and sample its width 10 times; every sample is equal.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement `lib/contact.js` and `Contact.jsx`.
- [ ] **Step 4:** Run them again. Expected: PASS. Screenshot desktop at 3 growth points, mobile, dark and reduced motion, then Read the images.
- [ ] **Step 5:** Commit: `feat(v3): Contact growing electric card`.

### Task 8: Phase verification, docs and merge

- [ ] **Step 1:** `npm test && npm run e2e`. Expected: all pass. The known Phase 1 loader flake may pass on retry.
- [ ] **Step 2:** Screenshots of all three sections: desktop, mobile, dark and reduced motion. Read every one. Keyboard pass: Tab from § 05 through § 08, with the focus ring visible everywhere.
- [ ] **Step 3:** Lighthouse via scratchpad worktrees (`main` and `v3-phase-3`, 3 runs each for mobile and desktop). Expected: medians no worse than `main`.
- [ ] **Step 4:** One fresh reviewer over `git diff v3...v3-phase-3`, given this plan's Review Focus. Fix the Critical and Important findings test-first.
- [ ] **Step 5:** Docs:
  - `README.md`: status, "What Phase 3 built", next step Phase 4.
  - `decisions.md`: rulings.
  - This plan: a status note.
- [ ] **Step 6 (gate):** show Damian the screenshots and the dev page. On his approval, run `git switch v3 && git merge --no-ff v3-phase-3` and delete the branch. No push.
