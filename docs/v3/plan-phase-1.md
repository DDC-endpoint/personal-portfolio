# V3 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the V3 motion primitives (text decode, section-label decode, link scramble), the electric-blue ASCII hero portrait with its first-visit loader (replacing `IntroStamp`), the cursor lens, and remove the Marquee.

**Architecture:** All maths lives in pure, unit-tested modules (`lib/decode.js`, `lib/portrait.js`, `lib/heroWave.js`, plus the loader gate in `lib/motion.js`). React components are thin shells over them: they mutate DOM text and draw to a canvas through refs, never through per-frame React state. Server HTML always carries the real text. Every effect is a client-side replay over it, so LCP stays where the 2026-07-18 perf pass put it.

**Tech Stack:** Next.js 16.4 (App Router), React 19.3, Tailwind 4.3, framer-motion 14.6, Canvas 2D, Vitest (unit), Playwright (e2e + screenshots).

**Spec:** [`design.md`](design.md) (global motion system, Hero, Delivery) and [`hero-portrait.md`](hero-portrait.md) (every portrait number). Reference prototype: [`spike/portrait-spike.html`](spike/portrait-spike.html). Port its behaviour, not its structure.

## Decisions made while planning (Damian, 2026-10-26)

- **Lede stays static.** The hero lede is the LCP element, so it does not get the 1.3 s blur fade from `hero-portrait.md`. It stays painted from the first frame. The kicker and name still decode with the wave.
- **Scope of the label decode and link scramble: Home only.** `/services` gets them in Phase 4.
- **The hero lede copy changes now** to the approved "second year" text in `copy.md`. The rest of the copy refresh stays in Phase 4.
- **Tooling:** Vitest for unit tests and Playwright for e2e and screenshots, both as devDependencies.

## Global Constraints

- Never commit raw photo originals, the CV, infrastructure details or secrets. The headshot original stays outside the repo. Only the processed, EXIF-free `public/hero/portrait.webp` is committed.
- Never run `npm run build` while `next dev` is running; they share `.next`.
- Next 16 has breaking changes: read the relevant page under `node_modules/next/dist/docs/01-app/` before writing framework code.
- Palette, fonts and art direction don't change. Use the tokens `--c-electric` (`37 99 235` light, `59 130 246` dark) and `--c-ivory` (`246 246 241` light, `11 31 58` dark).
- Noise set, everywhere: `ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&@*+=<>/\` (A–Z without I and O, digits, symbols).
- Reduced motion gives the static final state: no loader, idle, scramble or lens. Forced colours keep the native cursor.
- Real text is in the server HTML from the first paint. Decode effects replay over it.
- Slow-load rule (from the perf pass): if the effect would start more than 2500 ms after navigation start (`performance.now() > 2500`), skip it and show the final state.
- Breakpoints: desktop is Tailwind `md` (≥768 px). The spec's 760 px mobile rule maps to `md` to match the rest of the site and the cursor's 768 px cut-off. The ≤1100 px stage rule is `max-[1100px]:`.
- Work on branch `v3-phase-1`, cut from `v3`. The PR targets `v3`, never `main`. `v3` is local only: ask Damian before pushing it.
- Before each commit, scan the staged diff for the categories in `CLAUDE.md`.

## Review Focus

1. **Slow first visit.** If the portrait image or fonts are ready more than 2.5 s after navigation, the wave is skipped and the finished portrait and real text show. Tested in Task 9.
2. **Portrait image fails to load.** The hero text stays real and readable, no page error is thrown, and the cell-count label stays empty. Tested in Task 7.
3. **Theme toggle while the portrait is on screen.** The glyphs recolour to the new theme and the canvas is never left blank. Tested in Task 7.
4. **Resize or rotation.** The grid relays out (new `cols × rows` in the label) with no stretched glyphs. Tested in Task 7.
5. **Scrambles must not move layout or names.** A scrambling link keeps its width, and its accessible name stays the real label. Tested in Task 4.

---

### Task 1: Test tooling

**Files:**
- Modify: `package.json` (scripts + devDependencies), `.gitignore`
- Create: `vitest.config.mjs`, `playwright.config.mjs`, `tests/unit/smoke.test.js`, `e2e/home.spec.js`

**Interfaces:**
- Produces: `npm test` (Vitest, `tests/unit/**/*.test.js`, node environment, `@` alias to repo root) and `npm run e2e` (Playwright, `e2e/`, projects `desktop` 1440×900 and `mobile` 390×844 with `isMobile` and `hasTouch`, base URL `http://localhost:3000`, `webServer: { command: "npm run dev", reuseExistingServer: true }`).
- Produces: the helper `e2e/helpers.js` → `trackErrors(page): string[]`, which collects `pageerror` messages and `console` messages of type `error`.

- [ ] **Step 1:** Create branch `git switch -c v3-phase-1` from `v3`. Run `npm i -D vitest @playwright/test`, then `npx playwright install chromium`.
- [ ] **Step 2:** Add the scripts `"test": "vitest run"` and `"e2e": "playwright test"`. Add `test-results/` and `playwright-report/` to `.gitignore`.
- [ ] **Step 3: Write the smoke tests.**

```js
// tests/unit/smoke.test.js
import { EASE } from "@/lib/motion";
test("alias resolves", () => expect(EASE).toEqual([0.22, 1, 0.36, 1]));
```

```js
// e2e/home.spec.js
test("home renders with no errors", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Damian");
  expect(errors).toEqual([]);
});
```

- [ ] **Step 4:** Run `npm test` and `npm run e2e`. Expected: both PASS (3 tests in all: 1 unit, 1 e2e × 2 projects).
- [ ] **Step 5: Commit** with `chore(v3): add Vitest and Playwright`.

### Task 2: Remove the Marquee

**Files:**
- Delete: `components/Marquee.jsx`
- Modify: `app/(site)/page.jsx`, `app/(site)/globals.css` (the orphan `/* Marquee — … */` comment at about line 167, and "marquee" in the reduced-motion banner comment), and `README.md` line 10 (drop "an interactive grab-to-drag marquee").
- Modify (comments only): `components/lab/demos/RippleSwap.jsx:14`, `components/lab/demos/VelocityMarquee.jsx:5`, `components/lab/hooks.js:57`. They cite `Marquee.jsx` as a pattern; reword them to "the former homepage Marquee". The lab itself doesn't change.
- Test: `e2e/home.spec.js`

- [ ] **Step 1: Write the failing test.** `test("marquee is gone")`: on `/`, there is no element whose text contains `✦`, and the element after `#top` in `main` is `#about`.
- [ ] **Step 2:** Run `npm run e2e -- -g marquee`. Expected: FAIL.
- [ ] **Step 3:** Remove the import and `<Marquee />`, delete the file, and update the comments.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS. Also run `grep -rn "from.*Marquee\"" components app`. Expected: no output.
- [ ] **Step 5: Commit** with `feat(v3): remove the Marquee`.

### Task 3: Decode maths — `lib/decode.js`

**Files:**
- Create: `lib/decode.js`, `tests/unit/decode.test.js`

**Interfaces:**
- Produces:
  - `NOISE: string`, the noise set from Global Constraints.
  - `TICK_MS = 45`, `LABEL_MS = 600`, `LINK_MS = 400`, `LETTER_SCRAMBLE_MS = 220`, `FAINT_OPACITY = 0.12`.
  - `noiseChar(rand = Math.random): string`.
  - `isDecodable(ch: string): boolean`: true for any non-whitespace character. NBSP counts as whitespace.
  - `scrambleText(text: string, progress: number, rand = Math.random): string`: the first `floor(text.length × progress)` characters are final, and each later decodable character is a noise character. Whitespace always stays as it is. For `progress >= 1` it returns `text`.
  - `splitWords(text: string): string[]`: alternating word and whitespace tokens (`text.split(/(\s+)/).filter(Boolean)`).
  - `letterDelay(dist: number, viewportWidth: number, rand = Math.random): number` = `350 + dist / viewportWidth × 1100 + rand() × 150` (ms).
  - `letterPhase(elapsed: number, delay: number): "faint" | "scramble" | "final"`: `"faint"` before `delay − 220`, `"scramble"` from `delay − 220` until `delay`, then `"final"`.

- [ ] **Step 1: Write the failing tests.**

```js
const zero = () => 0;
test("noise set excludes I and O", () => { expect(NOISE).not.toMatch(/[IO]/); expect(NOISE).toContain("\\"); });
test("scramble keeps whitespace and length", () => {
  const out = scrambleText("§ 01 — About", 0, zero);
  expect(out).toHaveLength(12);
  expect([...out].filter((c, i) => /\s/.test("§ 01 — About"[i]))).toEqual([" ", " ", " "]);
  expect(out[0]).toBe(NOISE[0]);
});
test("scramble resolves left to right", () => {
  expect(scrambleText("ABCD", 0.5, zero)).toBe("AB" + NOISE[0] + NOISE[0]);
  expect(scrambleText("ABCD", 1)).toBe("ABCD");
});
test("nbsp is not decodable", () => expect(isDecodable(" ")).toBe(false));
test("splitWords", () => expect(splitWords("Creative Technologist · Web")).toEqual(["Creative", " ", "Technologist", " ", "·", " ", "Web"]));
test("letterDelay", () => { expect(letterDelay(0, 1440, zero)).toBe(350); expect(letterDelay(720, 1440, () => 1)).toBe(1050); });
test("letterPhase", () => {
  expect(letterPhase(0, 500)).toBe("faint");
  expect(letterPhase(300, 500)).toBe("scramble");
  expect(letterPhase(500, 500)).toBe("final");
});
```

- [ ] **Step 2:** Run `npm test -- decode`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the exports above.
- [ ] **Step 4:** Run `npm test -- decode`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(v3): decode maths`.

### Task 4: Label decode and link scramble on Home

**Files:**
- Create: `components/Scramble.jsx`, `e2e/scramble.spec.js`
- Modify: the 8 Home section labels: `About.jsx:12` (an `h2`), `Leadership.jsx:38`, `Skills.jsx:29`, `Projects.jsx:209`, `Timeline.jsx:126`, `Resume.jsx:11`, `Lens.jsx:100`, `Contact.jsx:19`.
- Modify: link text in `Nav.jsx` (desktop `NAV_LINKS` only; the mobile overlay links are serif and keep their style), `About.jsx` ("Services & pricing") and `Resume.jsx` ("Request CV"). The hero SERVICES buttons get it in Task 8.

**Interfaces:**
- Consumes: `scrambleText`, `TICK_MS`, `LABEL_MS`, `LINK_MS` from Task 3.
- Produces (all from `components/Scramble.jsx`, `"use client"`):
  - `useScramble(ref, text: string, durationMs: number): () => void` returns `play()`. `play` restarts the run if one is going. Each tick (every 45 ms, driven by rAF) writes `scrambleText(text, elapsed / durationMs)` to `ref.current.textContent`, and the run ends by writing `text`. While running it sets `aria-busy="true"` on `ref.current` and removes it at the end. It is a no-op under `prefers-reduced-motion: reduce`. It cancels on unmount.
  - `DecodeLabel({ as = "div", className, children: string })` renders `<Tag ref className>{children}</Tag>` and calls `play()` once when the element first intersects (`IntersectionObserver`, `rootMargin: "0px 0px -80px 0px"`), with `LABEL_MS`.
  - `ScrambleText({ text: string })` renders `<span ref>{text}</span>` and calls `play()` with `LINK_MS` on `pointerenter` and `focus` of `ref.current.closest("a, button")`.
- The text stays inside a single node, and the font is mono, so the width can't change. Never wrap the arrow `→` (it is a separate span already).

- [ ] **Step 1: Write the failing e2e tests** (`desktop` project only).
  - `test("section label decodes on entry")`: scroll `#about` into view, poll until the label element has `aria-busy="true"`, then `toHaveText("§ 01 — About")` within 1500 ms, and `aria-busy` is gone.
  - `test("nav link scrambles without moving")`: record the bounding box width `w` of the nav link "Work". Hover it. Poll until its text is not `Work`. Its width is still `w` (±0.5 px). Within 1000 ms the text is `Work` again, and `getByRole("link", { name: "Work" })` resolves throughout.
  - `test("reduced motion never scrambles")`: `page.emulateMedia({ reducedMotion: "reduce" })`, hover "Work", sample the text every 50 ms for 600 ms. It is always `Work`.
- [ ] **Step 2:** Run `npm run e2e -- e2e/scramble.spec.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `components/Scramble.jsx` and wire up the 8 labels and 3 links. `About.jsx`'s label stays an `h2`: `<DecodeLabel as="h2" className="section-label mb-3">`.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(v3): label decode and link scramble on Home`.

### Task 5: Portrait maths — `lib/portrait.js`

**Files:**
- Create: `lib/portrait.js`, `tests/unit/portrait.test.js`

**Interfaces:**
- Produces (all pure, numbers are from `hero-portrait.md`):
  - Constants: `RAMP = " .·:;-=+*#%@"`, `CELL = 4`, `LOADER_S = 2.4`, `FACE = { u: 0.5, v: 0.38 }`, `LENS_R = 120`, `LENS_SOLID = 0.62`, `FOLLOW = 0.18`, `STRENGTH_EASE = 0.12`.
  - `cellSize(cell = CELL): { font, cw, ch }` with `font = cell × 1.5`, `cw = font × 0.6`, `ch = font × 0.92`.
  - `smoothstep(a, b, x): number`.
  - `fadeAt(u, v): number`, the bottom and shoulder fade formula.
  - `glyphIndex(d): number` = `max(1, round(d^1.35 × 11))`.
  - `buildField(rgba: Uint8ClampedArray, cols: number, rows: number, ss = 3): { tone, edge, alpha: Float32Array, inside: number[] }`. Input is image data of size `(cols × ss) × (rows × ss)`. It implements sampling, the Sobel-style edges (alpha × 0.45), the 3×3 tone smoothing (`0.55 own + 0.45 neighbour mean`), head/body equalisation split at `rows × 0.5`, `tone = 0.5 rank + 0.5 smoothed`, and edges normalised to the max × 2.4, clamped to 1. If the max edge is 0, all edges are 0. `inside` holds the cells with alpha > 0.3. Port the maths from `spike/portrait-spike.html` → `layout()`.
  - `density(field, i, dark: boolean): number` returns 0 when `alpha < 0.3`. Otherwise it is `min(1, edge × 0.18 + ink^1.2 × 0.95 + 0.05)`, with `ink = dark ? tone : 1 − tone`.
  - `shadeRGB(d, electric: number[3], bg: number[3]): number[3]` (rounded) mixes from `electric + (bg − electric) × 0.5` to `electric` by `smoothstep(0, 0.7, d)`.
  - `glyphAlpha(d, fade)` = `min(1, 0.55 + 0.45 d) × fade`.
  - `revealTime(x, y, cols, rows, aspect, jitter): number` (s) = `0.3 + hypot(x − 0.5 cols, (y − 0.38 rows) × aspect) / hypot(cols, rows × aspect) × 2.6 + jitter × 0.15`, where `aspect = ch / cw`.
  - `cellPhase(t, tr): "skeleton" | "front" | "final"`: skeleton before `tr − 0.25`, front until `tr`, then final.
  - `scanBand(tIdle, rows): number | null`: with `c = tIdle mod 6`, it is `c / 2.4 × (rows + 16) − 8` while `c < 2.4`, otherwise `null`.
  - `bandWeight(y, band)` = `exp(−(y − band)² / 8)`.
  - `flickerCount(cols, rows)` = `max(1, cols × rows × 0.00015)`.

- [ ] **Step 1: Write the failing tests.** The values are precomputed.

```js
test("cell 4 geometry", () => { const s = cellSize(); expect(s.font).toBe(6); expect(s.cw).toBeCloseTo(3.6); expect(s.ch).toBeCloseTo(5.52); });
test("fade", () => {
  expect(fadeAt(0.5, 0.3)).toBe(1); expect(fadeAt(0.5, 0.92)).toBe(0);
  expect(fadeAt(0.5, 0.7)).toBeCloseTo(0.5357, 4); expect(fadeAt(0.9, 0.8)).toBeCloseTo(0.0234, 4);
});
test("ramp", () => { expect(glyphIndex(1)).toBe(11); expect(glyphIndex(0.5)).toBe(4); expect(glyphIndex(0.1)).toBe(1); });
test("shade", () => {
  expect(shadeRGB(0, [37, 99, 235], [246, 246, 241])).toEqual([142, 173, 238]);
  expect(shadeRGB(1, [37, 99, 235], [246, 246, 241])).toEqual([37, 99, 235]);
});
test("reveal timing", () => {
  const a = 5.52 / 3.6;
  expect(revealTime(80, 49.4, 160, 130, a, 0)).toBeCloseTo(0.3, 6);
  expect(revealTime(0, 0, 160, 130, a, 0)).toBeCloseTo(1.4207, 4);
  expect(revealTime(160, 130, 160, 130, a, 1)).toBeCloseTo(1.9475, 4);
  expect(cellPhase(1.0, 1.3)).toBe("skeleton"); expect(cellPhase(1.1, 1.3)).toBe("front"); expect(cellPhase(1.3, 1.3)).toBe("final");
});
test("scan band", () => { expect(scanBand(0, 100)).toBe(-8); expect(scanBand(1.2, 100)).toBe(50); expect(scanBand(3, 100)).toBeNull(); });
test("field: transparent cells are outside, flat image has no NaN", () => {
  // 2×2 cells, ss=3 → 6×6 px; left column opaque mid-grey, right column transparent
  const px = new Uint8ClampedArray(6 * 6 * 4);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) px.set([128, 128, 128, 255], (y * 6 + x) * 4);
  const f = buildField(px, 2, 2);
  expect(f.inside).toEqual([0, 2]);
  expect([...f.tone, ...f.edge].every(Number.isFinite)).toBe(true);
});
test("density is 0 outside the figure", () => expect(density({ alpha: [0.1], tone: [0], edge: [1] }, 0, false)).toBe(0));
```

- [ ] **Step 2:** Run `npm test -- portrait`. Expected: FAIL.
- [ ] **Step 3:** Implement the exports above.
- [ ] **Step 4:** Run `npm test -- portrait`. Expected: PASS.
- [ ] **Step 5: Commit** with `feat(v3): portrait maths`.

### Task 6: Portrait asset

**Files:**
- Create: `scripts/process-portrait.mjs`, `public/hero/portrait.webp`
- Modify: `package.json` (`"process-portrait": "node scripts/process-portrait.mjs"`)

**Interfaces:**
- Produces: `/hero/portrait.webp`, 800×1000 with alpha, EXIF-free.

- [ ] **Step 1:** Port `docs/v3/spike/process-headshot.cjs` to `scripts/process-portrait.mjs` (ESM, same pipeline and constants). Usage: `node scripts/process-portrait.mjs <source.png>`. It writes `public/hero/portrait.webp` with `sharp(...).webp({ quality: 85, alphaQuality: 90 })` and no `withMetadata()`.
- [ ] **Step 2:** Ask Damian to confirm the path of "Professional Young Man's Studio Headshot.png" in his Downloads folder. Run the script with that path. Never copy the original into the repo.
- [ ] **Step 3: Verify.**
  - Run `node -e "require('sharp')('public/hero/portrait.webp').metadata().then(m=>console.log(m.width,m.height,m.hasAlpha,!!m.exif,!!m.icc,!!m.xmp))"`. Expected: `800 1000 true false false false`. The file is under 150 KB.
  - Read the image to check that the background is keyed and both shoulders are in frame.
- [ ] **Step 4: Commit** with `feat(v3): processed hero portrait (EXIF-free)`. Scan the staged diff first: only the script, `package.json` and the WebP.

### Task 7: `HeroPortrait`: static render, idle, theme, resize

**Files:**
- Create: `components/HeroPortrait.jsx`, `e2e/portrait.spec.js`
- Modify: `components/Hero.jsx` (temporarily mount `<HeroPortrait />` in a fixed-size test stage. Task 8 gives it the real layout.)

**Interfaces:**
- Consumes: everything from Task 5, and `NOISE` / `noiseChar` from Task 3.
- Produces: `HeroPortrait({ className })` (`"use client"`, default export). It renders:
  - A wrapper `<div data-portrait data-lens data-state={state} role="img" aria-label="ASCII portrait of Damian De Cruz" className="relative h-full w-full">`.
  - A `<canvas aria-hidden className="absolute inset-0 h-full w-full touch-none">` inside it.
  - A label `<div data-portrait-label className="section-label absolute left-0 -top-6">PORTRAIT · {cols} × {rows} CELLS</div>`, which stays empty until the first layout.
  - `state` is one of `"loading" | "static" | "error"` (Task 9 adds `"wave"` and `"skipped"`).
- Produces (for Tasks 9 and 10): internal functions in the same file, with the same names Tasks 9 and 10 extend: `layout()`, `buildRest()`, `drawFrame(now)`, and `faceViewportPoint(): { x, y }` (stage rect left + 0.5 w, top + 0.38 h).

Behaviour:
- **Font:** read the canvas font family from `getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono")` (next/font hashes the family name, so `'JetBrains Mono'` would silently fall back). Wait for `document.fonts.load(\`700 6px ${family}\`)`.
- **Image:** `new Image()` with `src="/hero/portrait.webp"`. On error, set `state="error"` and draw nothing.
- **Layout:**
  - DPR is capped at 2. `cols = floor(W / cw)` and `rows = floor(H / ch)`.
  - Draw the image at `cols × 3 × rows × 3` into an offscreen canvas, then run `getImageData` → `buildField`.
  - `buildRest()` pre-renders every cell with `density > 0.02` into an offscreen "rest" canvas, using `glyphIndex`, `shadeRGB` and `glyphAlpha(d, fadeAt(u, v))`.
  - Colours come from `--c-electric` and `--c-ivory`, which are space-separated RGB triplets.
- **Idle loop:** one rAF loop.
  - Blit the rest canvas.
  - Draw the scan band (`scanBand` / `bandWeight`, adding +0.3 density at up to 0.3 opacity).
  - Flicker: each frame, `flickerCount` random in-figure cells show a noise glyph for 90–180 ms.
- **Pausing:** the loop stops while the wrapper is off-screen (`IntersectionObserver`) or the tab is hidden (`visibilitychange`), and resumes after both clear.
- **Theme:** a `MutationObserver` on `<html>` `class` re-reads the colours, sets `dark = classList.contains("dark")`, and calls `buildRest()`.
- **Resize:** a `ResizeObserver` on the wrapper runs `layout()`, coalesced to one call per animation frame.
- **Reduced motion:** draw the rest canvas once, with no loop and no listeners beyond theme and resize.

- [ ] **Step 1: Write the failing e2e tests.**
  - `test("portrait draws and labels itself")`: `[data-portrait]` gets `data-state="static"`, and the label matches `/^PORTRAIT · \d+ × \d+ CELLS$/i`. The canvas has non-transparent pixels: evaluate `getImageData` over the full canvas and count `alpha > 0`, which must be more than 1000.
  - `test("image failure leaves hero intact")`: `page.route("**/hero/portrait.webp", r => r.abort())`. `data-state="error"`, the label is empty, the h1 still contains "Damian", and there are no `pageerror` events.
  - `test("theme toggle recolours")`: wait for static, then sample the centre-region pixel colour. Click the theme toggle and wait 300 ms. The sampled pixels have changed, still more than 1000 non-transparent pixels, and there are no errors.
  - `test("resize relays out")`: read the label, `setViewportSize({ width: 1024, height: 768 })`, and the label text changes.
- [ ] **Step 2:** Run `npm run e2e -- e2e/portrait.spec.js`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS. Screenshot the stage in light and dark mode, then Read both images. Compare them to `spike/portrait-spike.html` at cell 4 (run `node docs/v3/spike/serve.cjs`).
- [ ] **Step 5: Commit** with `feat(v3): ASCII hero portrait (static + idle)`.

### Task 8: Hero layout

**Files:**
- Modify: `components/Hero.jsx`
- Test: `e2e/hero.spec.js`

**Interfaces:**
- Consumes: `HeroPortrait` (Task 7) and `ScrambleText` (Task 4).
- Produces: the section structure that Task 9 decodes. The kicker and the three name parts must be separate elements, each with its own text: `Creative Technologist · Freelance Web Designer`, `Damian`, `de ` (italic, electric) and `Cruz.`.

Changes (values from `hero-portrait.md` → Layout):
- **Remove** the "Currently" block, its empty `col-span-3` sibling, the scroll indicator, and the `Word` rise component. The name is plain text for now; Task 9 adds the decode.
- **Split the drifting content into three siblings**, each `motion.div style={{ y, opacity }}` using the existing `y` and `opacity` motion values:
  1. Kicker and name.
  2. The portrait stage:
     - `mx-auto mt-8 w-[min(86vw,60vh)] aspect-[4/5]`
     - `md:absolute md:bottom-0 md:mt-0 md:right-[calc(40px+5vw)] md:w-[min(40vw,72vh,calc((100vh-190px)*0.8))]`
     - `max-[1100px]:md:right-10 max-[1100px]:md:w-[min(38vw,72vh,calc((100vh-190px)*0.8))]`
  3. The lede and the new mobile button.

  This gives the mobile order kicker → name → portrait → lede → button. On desktop the stage is absolute against the section.
- **Lede:** it stays a static `EagerReveal replay={false}` and gets the new copy from `copy.md`: "In my second year of *BSc (Hons) Computer Science* at the Informatics Institute of Technology, Colombo, the University of Westminster's campus in Sri Lanka. Building things on the internet at the seam of code, design and curiosity."
- **Mobile SERVICES button:** `md:hidden mt-6 flex w-full justify-center`, with the same electric styles as the desktop one. Both buttons wrap their label as `<ScrambleText text="Services" />`.
- **Blobs:** the sky blob changes from `dark:bg-sky/40` to `dark:bg-sky/15`, and the mist blob gets `dark:bg-[#122848]`.

- [ ] **Step 1: Write the failing e2e tests.**
  - `test("hero copy and removals")`: there is no text "Currently" and no text "scroll" in `#top`. The lede contains "In my second year of". The server HTML (`(await request.get("/")).text()`) contains "In my second year of" and "Creative Technologist".
  - `test("mobile order")` (`mobile` project): the top y of the kicker < name < `[data-portrait]` < lede < the visible "Services" link. The button's width is at least 90% of the viewport.
  - `test("desktop stage")` (`desktop` project): the bottom of `[data-portrait]` is within 2 px of the bottom of `#top`, it doesn't overlap the h1's bounding box, and the stage width is `min(0.4 × 1440, 0.72 × 900, (900 − 190) × 0.8)` = 568 px (±2).
- [ ] **Step 2:** Run `npm run e2e -- e2e/hero.spec.js`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS. Screenshot `/` at 1440×900, 1280×720, 1024×768 and 390×844, in light and dark, and Read each one. Check them against `spike/hero-live.html`: the SERVICES button sits beside the head without overlapping the face, and the label clears the nav.
- [ ] **Step 5: Commit** with `feat(v3): hero layout with portrait stage`.

### Task 9: First-visit loader, replacing `IntroStamp`

**Files:**
- Create: `lib/heroWave.js`, `components/DecodeText.jsx`, `tests/unit/heroWave.test.js`, `tests/unit/loaderGate.test.js`, `e2e/loader.spec.js`
- Modify:
  - `lib/motion.js`: replace `INTRO_OFFSET` and `shouldPlayIntro` with the loader gate.
  - `components/HeroPortrait.jsx`: add the wave.
  - `components/Hero.jsx`: use `DecodeText` for the kicker and name.
  - `app/(site)/page.jsx`: drop `IntroStamp`.
  - `app/(site)/globals.css`: delete the `.intro-stamp` block at lines 133–146.
  - `app/(site)/layout.jsx:49`: update the comment that mentions the IntroStamp curtain.
- Delete: `components/IntroStamp.jsx`

**Interfaces:**
- Produces in `lib/motion.js`:
  - `LOADER_KEY = "ddc:loader-played"`.
  - `shouldPlayLoader(): boolean`. It returns false under SSR (not memoised) and false under reduced motion. Otherwise it is true only when `sessionStorage[LOADER_KEY]` is absent, and it sets the key on that call. If storage throws, it returns true. The result is memoised per page load.
  - `resetLoaderDecision()`, for tests only.
- Produces in `lib/heroWave.js`:
  - `createWave(): { start(t0: number, origin: {x, y}): void, subscribe(cb: ({t0, origin}) => void): () => void }`. `subscribe` calls `cb` at once if the wave has already started. `start` is idempotent: the first call wins.
  - `heroWave`, a module singleton.
- Produces in `components/DecodeText.jsx`: `DecodeText({ text: string, className })` renders `<span className>` holding `splitWords(text)` tokens. Each word is `<span style="white-space:nowrap">` with one `<span>` per character holding the real character. Whitespace tokens are text nodes. It subscribes to `heroWave`. On start it:
  1. Sets `aria-busy="true"`.
  2. Computes each letter's delay with `letterDelay(distance from origin to the letter's rect top-left, innerWidth)`.
  3. Runs one rAF loop, updating letters every `TICK_MS`. A `faint` letter shows a noise character at opacity 0.12, a `scramble` letter shows a fresh noise character at opacity 1, and a `final` letter shows the real character with its opacity cleared.
  4. Removes `aria-busy` once every letter is final.

  It never re-renders through React state.
- Consumes in `HeroPortrait`: `shouldPlayLoader`, `heroWave`, `revealTime`, `cellPhase` and `LOADER_S`. When the image and font are ready:
  - If `shouldPlayLoader()` is true and `performance.now() <= 2500`: set `state="wave"`, give each cell a random jitter, call `heroWave.start(performance.now(), faceViewportPoint())`, and draw the wave for `LOADER_S`. A skeleton cell is a block 40% of the cell in size, at opacity `0.10 + 0.05 sin(…)` × fade. A front cell is a noise glyph at 0.9 × fade. A final cell is the rest glyph. After the wave, set `state="static"` and enter idle.
  - If the loader should play but it's too late: set `state="skipped"` and go straight to idle. `heroWave` is never started, so the text stays real.
  - Otherwise: `state="static"`.
- `Hero.jsx` keeps the corner metadata and the desktop SERVICES button fades at fixed delays of 1.15 s and 1.3 s (the old `at()` with `t0` is removed).

- [ ] **Step 1: Write the failing unit tests.**
  - `loaderGate.test.js` stubs `globalThis.window` with `matchMedia` and an in-memory `sessionStorage`, and calls `resetLoaderDecision()` before each test:
    - First call → true, and the key is set.
    - Reset, then call again with the key set → false.
    - Reduced motion → false, and the key is not set.
    - `sessionStorage.getItem` throws → true.
    - Two calls in one load return the same value.
  - `heroWave.test.js`:
    - A subscriber added before `start` gets `{t0: 5, origin}` once.
    - A subscriber added after `start` is called immediately.
    - A second `start` is ignored.
    - `unsubscribe` stops future calls.
- [ ] **Step 2: Write the failing e2e tests.**
  - `test("first visit plays the wave")`: in a fresh context, `[data-portrait]` reaches `data-state="wave"`, and the kicker gets `aria-busy="true"`. Within 4000 ms the kicker has `toHaveText("Creative Technologist · Freelance Web Designer")`, `aria-busy` is gone, and the state is `"static"`.
  - `test("reload in the same session is static")`: after the above, `page.reload()`. The state goes straight to `"static"` and never reaches `"wave"`: record every `data-state` with a `MutationObserver` injected via `addInitScript`.
  - `test("slow image skips the wave")`: delay `**/hero/portrait.webp` by 3000 ms in a fresh context. The state ends `"skipped"`, and the kicker never gets `aria-busy`.
  - `test("reduced motion: no wave")`: with `reducedMotion: "reduce"` in a fresh context, the state is `"static"`.
  - `test("no IntroStamp")`: `.intro-stamp` count is 0, and the server HTML doesn't contain `intro-stamp`.
- [ ] **Step 3:** Run `npm test` and `npm run e2e -- e2e/loader.spec.js`. Expected: FAIL.
- [ ] **Step 4:** Implement it. `grep -rn "shouldPlayIntro\|INTRO_OFFSET\|IntroStamp" app components lib` must return nothing.
- [ ] **Step 5:** Run `npm test && npm run e2e`. Expected: PASS. Record the first visit with `page.screenshot` at 0.3, 0.9, 1.6 and 2.6 s after the wave starts, then Read the frames: the wave spreads from the face, and text letters land as it reaches them.
- [ ] **Step 6: Commit** with `feat(v3): first-visit hero loader replaces IntroStamp`.

### Task 10: Cursor lens

**Files:**
- Create: `lib/cursor.js`, `e2e/lens.spec.js`
- Modify: `components/Cursor.jsx`, `components/HeroPortrait.jsx`, `app/(site)/globals.css` (next to `.cursor-ring`)

**Interfaces:**
- Produces in `lib/cursor.js`:
  - `ring = { x: 0, y: 0 }`, a mutable object that `Cursor`'s tick writes each frame.
  - `customCursorShown(): boolean`, true when `html.js-cursor` is present and `matchMedia("(min-width: 769px)")` matches (the custom cursor is hidden by CSS at 768 px and below).
- `Cursor.jsx`:
  - Writes `ring.x` and `ring.y` in `tick`.
  - In `onOver`, `e.target.closest("[data-lens]")` sets the ring to 240 px wide and tall at opacity 1 and adds the class `is-lens`. Leaving `[data-lens]` removes the class, and the existing 36 px / 60 px rules apply.
  - The ring's existing `.25s` width transition is the grow.
- CSS: `.cursor-ring.is-lens { border-color: rgb(var(--c-electric) / .5); mix-blend-mode: normal; }`.
- `HeroPortrait` lens state is `{ x, y, s, on }`:
  - **Mouse with the custom cursor shown:** the target is the `ring` position converted to canvas coordinates, and the canvas draws no ring of its own.
  - **Touch, or no custom cursor:** the lens eases toward the pointer with `FOLLOW`, and the canvas strokes its own 1 px ring in electric at opacity 0.5 × s, radius `LENS_R × 0.98`.
  - `s` eases toward `on ? 1 : 0` by `STRENGTH_EASE` each frame.
  - **Draw** while `s > 0.01`:
    1. Clear the glyphs under a radial mask (solid to `LENS_SOLID`, transparent at `LENS_R`).
    2. Draw the full-colour image masked by the fade field and the same radial mask, from an offscreen canvas.
    3. Draw the readout `x {n} · y {n}` in 9 px mono, `--c-ink-faint`, at opacity 0.8 × s, at `(x + R × 0.72, y + R × 0.78)`.
  - **Events** on the canvas: `pointerenter` and `pointerdown` set `on`; `pointermove` updates the target; `pointerleave` and `pointercancel` clear it, as does `pointerup` for any pointer that isn't a mouse. The canvas has `touch-action: none` only.
  - **Reduced motion:** no listeners, no lens.

- [ ] **Step 1: Write the failing e2e tests.**
  - `test("ring grows into the lens")` (`desktop` project): hover the centre of `[data-portrait]`. `.cursor-ring` has the class `is-lens`, and its computed width reaches `240px` within 600 ms. Move to `#about` and the class is gone.
  - `test("lens reveals colour")`: hover the face point and wait 500 ms. Sample a 10×10 block at the pointer through `getImageData`: at least one pixel has `r > g` (skin tone, which the blue glyphs never produce).
  - `test("touch drag moves the lens")` (`mobile` project): dispatch `pointerdown`, then `pointermove` at two points, then `pointerup` on the canvas. Colour is present during the drag and gone 600 ms after `pointerup`.
  - `test("reduced motion has no lens")`: under reduced motion, hovering the portrait never adds `is-lens` to `.cursor-ring` (the ring divs still render, unstyled by `js-cursor`) and no colour pixels appear.
- [ ] **Step 2:** Run `npm run e2e -- e2e/lens.spec.js`. Expected: FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run `npm run e2e`. Expected: PASS. Screenshot the lens over the face in light and dark, then Read both: there's a thin electric ring, a soft edge, a readout at the lower right, and no scrambled edge.
- [ ] **Step 5: Commit** with `feat(v3): cursor ring becomes the portrait lens`.

### Task 11: Phase verification, docs and PR

**Files:**
- Modify: `docs/v3/README.md` (status table, next step = Phase 2), `HANDOFF.md`, `CLAUDE.md` if any rule changed.
  - In `HANDOFF.md`, update Key Files (IntroStamp and Marquee gone; add HeroPortrait, DecodeText, Scramble, lib/decode, lib/portrait, lib/heroWave, lib/cursor), mark the "Interactive Marquee" section and design rule 13 as removed in V3, and add `npm test` / `npm run e2e` to Running Locally.

- [ ] **Step 1:** Run `npm test && npm run e2e`. Expected: all PASS, and no console errors.
- [ ] **Step 2: Keyboard pass.** Tab through the nav links, the hero SERVICES button, "Services & pricing" and "Request CV". Each one scrambles on focus and keeps a visible focus ring.
- [ ] **Step 3: Screenshots.** Take 1440×900 and 390×844 in light, dark and reduced motion (6 shots of `/`, plus `#about`), and Read each one.
- [ ] **Step 4: Lighthouse.**
  1. Stop `next dev`.
  2. On `main`, run `npm run build && npm start`. Run `npx lighthouse http://localhost:3000 --only-categories=performance --throttling-method=devtools --output=json` 3× for mobile and 3× with `--preset=desktop`. Note the median performance score and LCP.
  3. Repeat on `v3-phase-1`.
  4. Expected: performance and LCP no worse than `main`.

  Don't use the default Lantern mode on localhost: it chains JS into simulated LCP and is unreliable (perf pass, 2026-07-18). The final word is PageSpeed Insights on the live site after `v3` merges.
- [ ] **Step 5: Commit** with `docs(v3): phase 1 done`.
- [ ] **Step 6:** Ask Damian before pushing. `v3` has never been pushed. With his OK: `git push -u origin v3`, `git push -u origin v3-phase-1`, then `gh pr create --base v3 --head v3-phase-1` with a body that summarises Tasks 1–10 and the Lighthouse table.
