# V3 — site upgrade

This folder is the living record of the V3 redesign of damiandc.com. Everything decided is written here, so the work survives a lost session. **Starting cold? Read this file first, then [`design.md`](design.md).**

## Where we are (end of session, 2026-10-27)

| Track | State |
|---|---|
| Dependencies | **Done.** PR #3 (`upgrade/deps`) is merged to `main`. |
| Design, copy, decisions | **Approved by Damian (2026-10-26)**, with all 10 builder's calls confirmed. Later revisions are logged in [`decisions.md`](decisions.md) → "Phase 1 review (2026-10-27)". |
| **Phase 1**: motion primitives, hero portrait + loader wave, cursor lens, Marquee removal | **Done and merged into `v3` locally (2026-10-27).** It was built per [`plan-phase-1.md`](plan-phase-1.md), plus Damian's follow-ups (see "What Phase 1 built"). Tests are green, and Lighthouse is at parity with `main`. |
| Phase 2: Projects (diagonal skeleton showcase) | **Next.** No plan yet. |
| Phase 3: Timeline, Lens (gallery) and Contact | Not started. |
| Phase 4: copy refresh, Leadership rows, Skills terminal, `/services`, page transition | Not started. |

### The next step: Phase 2 (Projects)

1. **Read the spec.**
   - [`design.md`](design.md) → "5. Projects".
   - [`decisions.md`](decisions.md) → "Projects (wow #2)" and "Builder review answers".
   - [`copy.md`](copy.md) → "§ 04 Selected Work".
   - Builder's calls 3, 5 and 6 in [`decisions.md`](decisions.md) → "Status and next step".
2. **Ask Damian about anything open** before planning. He prefers this: multiple-choice questions, up to four at a time. Likely topics:
   - The live URLs to screenshot for each project.
   - Whether the Phase 1 `DecodeLabel` / `ScrambleText` primitives cover the card decode, or a canvas/skeleton decode is needed.
   - GSAP ScrollTrigger vs framer-motion for the pinned strip (the builder's call is open).
3. **Write the plan** with `superpowers:writing-plans` and save it as `docs/v3/plan-phase-2.md`. Damian wants everything V3 in this folder.
4. **Build it** on a `v3-phase-2` branch off `v3`, then merge it back into `v3` locally when Damian approves. For Phase 1 he chose native inline execution (`superpowers:executing-plans`), with one fresh reviewer for the whole branch at the end.
5. **`v3` is still local only.** Its upstream is deliberately unset. Push (`git push -u origin v3`) only when Damian asks.

## Before `v3` merges to `main`

- **Ships a live-site bug fix (2026-10-27).** On damiandc.com today, visitors with reduced motion get a React hydration error (#418), and React rebuilds the page, which resets them to light mode. It's fixed on `v3` (`lib/useReducedMotion.js`), not on `main`, by Damian's choice, so the live site keeps the bug until `v3` merges. Mention it in the `v3` → `main` PR and check it on the live site after the redeploy: turn on reduced motion, choose dark mode, and reload `/` and `/services`.
- **Run the Lighthouse comparison against `main`** (see "Testing"). The final check is PageSpeed Insights on the live site after the redeploy.

## How V3 ships

1. `v3` is the integration branch, cut from `main` at `8cad99b`, just after PR #3.
2. Each phase gets its own branch off `v3` and merges **into `v3`**, never into `main`. Phase 1 was merged locally at Damian's request; ask him whether later phases should be local merges or PRs.
3. After every merge, test `v3`: `npm test`, `npm run e2e`, screenshots (golden path, mobile, dark, reduced motion), and a Lighthouse run on production builds.
4. When all four phases are in, `v3` merges to `main`, which triggers the site redeploy.

## What Phase 1 built (on `v3`)

**The hero:**
- The 13.5vw name, plus an electric-blue ASCII portrait in a 4:5 stage that is bottom-anchored on desktop and sits between the name and the lede on mobile.
- The "Currently" line and the scroll hint are removed.
- A full-width SERVICES button on mobile, and dimmer dark-mode blobs.
- The "second year" lede, which stays static for LCP.

**The loader (Damian revised it on 2026-10-27):**
- The live site's `IntroStamp` decrypt curtain stays on Home and plays on every load or reload.
- As it lifts (`INTRO_OFFSET`, 1 s), the portrait's 2.4 s wave builds from the face, and the hero text floats in as on the live site.
- The wave is skipped, and the finished portrait shown, under reduced motion or forced colours, in a background tab, on a landing below the hero, or when the image is ready later than 2.5 s.
- Its state is exposed as `data-state` on `[data-portrait]`: `loading → wave → static`, `skipped` or `error`.

**Idle:** a scan band every 6 s plus sparse flicker. The loop pauses off-screen and in hidden tabs.

**Cursor lens:**
- Over the portrait canvas, the cursor ring grows to 240 px, the dot fades out, and the canvas shows the full-colour photo with an `x · y` readout.
- On touch, dragging moves a canvas-drawn lens.

**Decode language:**
- The 8 § section labels on Home decode as they scroll into view.
- Mono buttons (the hero SERVICES buttons, "Request CV") scramble on hover and focus.
- Links that already have the underline draw (the nav, "Services & pricing") don't scramble (Damian).
- `/services` gets these in Phase 4.

**Other:**
- The Marquee is removed.
- The reduced-motion hydration fix (see above).

**Code map:**
- **Pure maths, unit-tested:**
  - `lib/portrait.js`: every number from [`hero-portrait.md`](hero-portrait.md).
  - `lib/decode.js`: the noise set and `scrambleText`.
  - `lib/motion.js`: `shouldPlayIntro`, `INTRO_OFFSET`.
- **Shared state and hooks:**
  - `lib/cursor.js`: the ring position, shared with the lens.
  - `lib/useReducedMotion.js`: hydration-safe; use it for any markup that changes with reduced motion.
- **Components:**
  - `components/HeroPortrait.jsx`: canvas, wave, idle, lens.
  - `components/Scramble.jsx`: `DecodeLabel`, `ScrambleText`.
  - `components/Hero.jsx`, `components/IntroStamp.jsx`, `components/Cursor.jsx`.
- **Asset:** `public/hero/portrait.webp`, made by `npm run process-portrait "<headshot.png>"`.

**Rules that came out of Phase 1** (don't undo them):
- **Sampling:** the portrait samples its image with `createImageBitmap`, off the main thread. A full-size `drawImage` + `getImageData` was a ~65 ms task on a throttled phone.
- **One intro decision:** HeroPortrait, Hero and IntroStamp share one memoized `shouldPlayIntro()` decision.
- **Accessible names:** scrambling text keeps its real accessible name. ScrambleText always carries an sr-only copy; DecodeLabel shows its sr-only copy only while decoding. An empty `aria-hidden=""` is ignored by screen readers, so always set `"true"`.
- **Lens target:** `data-lens` sits on the portrait canvas only.

## Testing

- **Unit:** `npm test` runs Vitest over `tests/unit/` (the pure `lib/` modules).
- **Browser:** `npm run e2e` runs Playwright over `e2e/`, on `desktop` (1440×900) and `mobile` (390×844).
  - It runs against `next dev` on :3000, reusing a running server or starting one. `e2e/warmup.js` loads `/` once first.
  - A cold dev build can be slower than the loader's 2.5 s cut-off. Rendering tests therefore accept a finished portrait in either state (`FINISHED = /^(static|skipped)$/`), and only the timing-dependent loader tests retry.
- **Screenshots:** take them with a Playwright script in the session scratchpad, then Read the images. Cover desktop 1440×900, mobile 390×844, dark mode and reduced motion. Chromium builds are in `%LOCALAPPDATA%\ms-playwright`.
- **Lighthouse** (localhost Lantern numbers are unreliable):
  1. Stop `next dev`.
  2. On each branch (`main`, then `v3`), run `npm run build && npm start`.
  3. Run `npx lighthouse http://localhost:3000 --only-categories=performance --throttling-method=devtools` three times for mobile and three times with `--preset=desktop`. Compare medians.
  4. Set `CHROME_PATH` to `%LOCALAPPDATA%\ms-playwright\chromium-1248\chrome-win64\chrome.exe`.

  Phase 1 result, against `main`'s 79–81: desktop 100 on both, mobile 79–81 on both with LCP about 2.1 s.

## Repo state at hand-off

- **Branch:** `v3`, local only, no upstream. `v3-phase-1` is merged and deleted. The working tree is clean.
- **`AGENTS.md`** is generated by `next dev` on every run. It is gitignored (Damian's call); don't commit it.
- **Photos for Phase 3:**
  - The 6 new gallery originals are in `assets/photography-originals/`, which is gitignored. They still contain EXIF and GPS data.
  - Run them through `npm run optimize-photos` and verify there's no EXIF before committing.
  - The 4 existing gallery photos are already in `public/photography/`.
- **Hero headshot:** the original ("Professional Young Man's Studio Headshot.png") is in Damian's Downloads folder and must never be committed. The processed `public/hero/portrait.webp` is committed; Damian approved publishing it, and it has no EXIF.

## Files

- [`design.md`](design.md): **the consolidated design.** It's the source of truth for building, and it links to the files below.
- [`hero-portrait.md`](hero-portrait.md): the locked hero portrait spec, with every parameter (layout, image pipeline, rendering, colour, fade, loader, idle, lens, touch, dark mode).
- [`copy.md`](copy.md): the approved copy for Home and `/services`, current vs new.
- [`decisions.md`](decisions.md): every decision with who made it and why, the rejected options (don't reintroduce them), and the status.
- [`plan-phase-1.md`](plan-phase-1.md): the Phase 1 plan. It's **done**; read its status note for where the build departed from it.
- [`research-reels.md`](research-reels.md): notes on the six Instagram reels and the ASCII reference video that shaped V3.
- [`spike/`](spike/): throwaway prototypes and helper scripts. These are reference only, not production code; see [`spike/README.md`](spike/README.md).
  - `portrait-spike.html`: the portrait on its own, with controls.
  - `hero-live.html`: the portrait inside a replica of the live hero.
  - `gallery-mockup.html`: the locked gallery, the reference for Phase 3.
  - `process-headshot.cjs`, `make-gallery-copies.cjs`, `serve.cjs`: helper scripts.

## How Damian likes to work

- **Questions:**
  - Ask many, as multiple choice, up to four at a time, with a recommended option first. He often answers "Other" with a short note, so read those carefully.
  - When he asks for something ambiguous, ask before building.
- **Show, don't describe.**
  - Visual questions get a live prototype in the browser.
  - Before showing anything, verify it yourself with headless screenshots.
- **References are narrow.** A shared reference targets one element only; don't restyle anything else from it.
- **Keep the site's existing style:** light-blue palette, Instrument Serif, JetBrains Mono, Manrope. He rejects anything that "feels AI coded".
- **Execution:**
  - Plans go in `docs/v3/`.
  - He chose native inline execution: tests first for every change, then one fresh reviewer for the whole branch.
  - Report your rulings and any deferred minor issues to him.
- **Record everything:**
  - Decisions go into `docs/v3/` straight away.
  - Commit locally with clear messages.
  - Don't push or open PRs unless asked.
- **Public repo hygiene (CLAUDE.md):** no photo originals, CV, infrastructure details or secrets. Scan the staged diff before every commit.

## Tooling notes for this machine

- **Shell:** the Bash tool is Git Bash on Windows.
  - Long heredocs containing quotes or backslashes sometimes fail to parse. Write a Python or JS script to the session scratchpad and run it instead.
  - Many files have CRLF line endings. Preserve them when editing programmatically.
- **Dev server:** never run `npm run build` while `next dev` is running. Stop it first; the Lighthouse procedure above does this.

## Running the prototypes

From the repo root:

```bash
node docs/v3/spike/process-headshot.cjs "<path to the studio headshot PNG>" docs/v3/spike   # → spike/cutout.png
node docs/v3/spike/make-gallery-copies.cjs                                              # → spike/gal/f01–f10.jpg
node docs/v3/spike/serve.cjs                                                            # http://localhost:3200
```

Then open `/portrait-spike.html`, `/hero-live.html` or `/gallery-mockup.html`. All generated images are gitignored.

## Ground rules (from CLAUDE.md, still in force)

- **Public repo:** never commit raw photo originals, the CV, infrastructure details or secrets.
- **Builds:** never run `npm run build` while `next dev` is running.
- **Verify UI changes** with real screenshots before calling them done: desktop, mobile and reduced motion.
- **Next.js 16** has breaking changes. Read `node_modules/next/dist/docs/` before writing framework code.
- **Lab subdomain:** the lab lives at lab.damiandc.com. `damiandc.com/lab` returns a 404 by design; don't "fix" it.
