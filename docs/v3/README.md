# V3 — site upgrade

This folder is the living record of the V3 redesign of damiandc.com. Everything decided is written here, so the work survives a lost session. **Starting cold? Read this file first, then [`design.md`](design.md).**

## Where we are (2026-10-27, Phase 3 built)

| Track | State |
|---|---|
| Dependencies | **Done.** PR #3 (`upgrade/deps`) is merged to `main`. |
| Design, copy, decisions | **Approved by Damian (2026-10-26)**, with all 10 builder's calls confirmed. Later revisions are logged in [`decisions.md`](decisions.md) → "Phase 1 review (2026-10-27)". |
| **Phase 1**: motion primitives, hero portrait + loader wave, cursor lens, Marquee removal | **Done and merged into `v3` locally (2026-10-27).** It was built per [`plan-phase-1.md`](plan-phase-1.md), plus Damian's follow-ups (see "What Phase 1 built"). Tests are green, and Lighthouse is at parity with `main`. |
| **Phase 2**: Projects (diagonal skeleton showcase) | **Done and merged into `v3` locally (2026-10-27).** It was built per [`plan-phase-2.md`](plan-phase-2.md), reviewed, and every review finding is fixed. Damian approved the screenshots. Tests are green, and Lighthouse is at parity with `main`. |
| **Phase 3**: Timeline, Lens (gallery) and Contact | **Built on `v3-phase-3`, waiting for Damian's visual approval (2026-10-27).** Damian approved [`plan-phase-3.md`](plan-phase-3.md) unchanged. It was built test-first, reviewed by a fresh reviewer, and every finding is fixed (see "What Phase 3 built"). Tests are green, and Lighthouse is at parity with `main`. Not merged yet. |
| Phase 4: copy refresh, Leadership rows, Skills terminal, `/services`, page transition | Not started. |

### The next step: Damian's visual gate on Phase 3, then merge

1. **Branch:** `v3-phase-3` holds the whole Phase 3 build; nothing is merged into `v3` yet.
2. **Gate:** Damian looks at the dev page (`http://localhost:3000/#timeline`, `#lens`, `#contact`) and the screenshots. Two questions are open for him:
   - **Dark-mode Contact card contrast.** In dark mode the card is the brightened electric (#3B82F6) under light text, about 3.4:1. That's fine for the headline but below AA (4.5:1) for the small mono labels and the body copy. Within the token set, navy text reaches only 4.49:1. A real fix needs his call: keep the light-mode electric (#2563EB) for the card in both themes (one exception to the tokens-only rule), or accept the current pairing.
   - **The halftone look.** The dots are auto-levelled per photo, and in dark mode they are sized by brightness so the print stays a positive (see `decisions.md` → "Phase 3 build rulings"). This is a taste check.

   Fixed from his first look (see `decisions.md` → "Phase 3 gate fixes"): the needle sat slightly off the thread, the custom cursor hid behind the open viewer, the Lens develop is now tied to scroll (it was timed, and buggy scrolling in and out), and the dot print now registers exactly with the photo.
3. **On his approval:** `git switch v3 && git merge --no-ff v3-phase-3`, delete the branch, and mark Phase 3 merged here.
4. **Then Phase 4** (copy refresh for the remaining sections, Leadership rows, Skills terminal, `/services`, page transition), followed by `v3` → `main`. See "Before `v3` merges to `main`".
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

## What Phase 2 built (on `v3`)

**§ 04 Selected Work:**
- **Desktop (≥ 768 px, motion allowed, JS on):** the section pins for 3 screens of scroll. A strip of browser-window cards (45vw, capped so the shot stays under 55vh) slides along a 12° path from lower-left to upper-right, then the end card arrives.
- **Cards:** each shows a hand-traced skeleton of its site. The active card decodes through a canvas of noise glyphs into its screenshot (700 ms), and dissolves back 600 ms after it stops being active (450 ms). Tags and blurb show while active. Live cards open in a new tab; This Portfolio links to `#top`.
- **Upcoming cards** (Interact District 3220, ai-studio) have a generic skeleton. Noise passes over them and leaves the skeleton, with a `loading… 2026 →` line. They are not links.
- **End card:** the address bar types `your-site.com` in view; "Start a project →" links to `#contact`. Only its letters scramble, never the arrow.
- **Below md:** a vertical stack with an alternating offset. The card nearest the centre decodes.
- **Reduced motion or no JS:** a plain list. Reduced motion shows every screenshot decoded, with tags and blurb.
- **The intro line** is now "Six projects out in the world, two more on the way. The shelf keeps growing, so check back."

**Which card is active:**
- **Fine pointer:** the card under the pointer, re-checked on every scroll frame, so a resting mouse works as the strip moves.
- **Touch:** the card nearest the centre of the screen.
- **Keyboard:** the focused card. Only a Tab press makes focus win over a parked mouse, and only keyboard focus scrolls the strip to the card. A click's mousedown also focuses the card, and scrolling then would move it out from under the pointer.

**Code map:**
- **Pure maths, unit-tested:**
  - `lib/projects.js`: the cards, copy and the end card.
  - `lib/strip.js`: the strip geometry.
  - `lib/cardDecode.js`: the decode cells and timings.
- **Generated:** `lib/miniPortrait.js`, the 28×21 ASCII portrait in the This Portfolio skeleton (`npm run mini-portrait`).
- **Components:**
  - `components/Projects.jsx`: the section, the layout and which card is active.
  - `components/projects/ProjectCard.jsx`, `BrowserFrame.jsx`, `EndCard.jsx`.
  - `components/projects/useCardDecode.js`: the canvas decode controller. It writes `data-decode` on the card: `skeleton | decoding | shot | dissolving | scrambling | static`.
  - `components/projects/skeletons.jsx`: one SVG per site. Colour comes only from token classes, so dark mode works with no JS.
- **Assets:** `public/projects/<slug>.webp`, 1440×900, made by `npm run capture-projects [slug…]`.
- **CSS:** a `js:` variant in `globals.css` (`html.js` is set pre-paint) gates the pin.

**Rules that came out of Phase 2** (don't undo them):
- **The pin needs JS.** It is gated on `js:motion-safe:md:`. Without the `js` gate, the cards sit clipped in the sticky viewport. The track height is `--pin-track`, set from `STRIP.PIN_SCREENS`, in `svh`.
- **Button arrows stay outside the scramble** ("Start a project", SERVICES), so a button never changes width.
- **The viewport is `overflow: clip`, not `hidden`,** so the browser's focus scrolling can't shift it sideways.
- **Canvases size from the ResizeObserver entry,** never `getBoundingClientRect` (a Phase 1 test counts canvas measurements).
- **Keyboard e2e tests wait for `hydrated(page)`** before pressing keys.

## What Phase 3 built (on `v3-phase-3`)

**§ 05 Timeline (oldest first):**
- Ten entries from `copy.md`, plus the new "2024–2025 · Head Prefect" entry after A-Levels.
- An electric running stitch (7 px on, 5 off), led by a small needle, sews down the list with scroll and unpicks on the way back.
- Each milestone the needle passes gets a cross-stitch ×, its year decodes from scrambled digits (dashes and month names stay), and its text goes from faint to full ink. Milestones below the needle are faint, and they decode again on the next pass.
- One sprung motion value drives it all through the `--d` custom property, so the per-frame work is CSS only. Thresholds re-measure whenever the list resizes.
- No JS or reduced motion: fully stitched, everything lit, no needle.

**§ 07 Lens:**
- The locked compact grid: six columns of 3:4 tiles, two 2×2 heroes and the note tile. Each tile has a hairline border, an ivory mat and the highlighter trace on hover or keyboard focus. Hover captions show on desktop; on phones the captions sit in the mat.
- **Develop:** every photo rests as a print of round electric dots sized by tone. The develop is tied straight to scroll, with no timer: it starts as the tile's top enters the bottom of the screen and is full colour once the tile's centre reaches the screen's centre. Scrolling back up runs it back to dots; above the screen a photo stays in colour. Stop scrolling and it holds where it is.
- **Viewer:** a modal dialog that expands from the tile, steps with the arrow keys or a swipe (wrapping), and closes with Esc or a tap back into the current frame's tile, with focus returning to it. It uses the `Nav` scroll lock.
- Six new photos, EXIF-free, for ten in all.

**§ 08 Contact:**
- A 96 px electric tile under the label grows right and down into the full card with scroll, and shrinks back. It's a `clip-path`, so nothing reflows. The growth ends at the bottom of the page if the card's top can't reach 25% of the screen, so it opens fully on tall screens.
- Focus inside the card holds it fully open.
- The card holds the "Got something in *mind*?" headline, the body copy, the email and WhatsApp buttons, the pulsing `Available · 2026` badge, the four socials and a live `Colombo · hh:mm` clock.

**Code map:**
- **Pure maths, unit-tested:**
  - `lib/lens.js`: frames, grid areas, the note tile.
  - `lib/halftone.js`: dot size, the dot grid, develop mix, auto-levels, dark-mode tone, `scrollDevelop` (scroll position to develop).
  - `lib/timeline.js`: entries, `litCount`.
  - `lib/contact.js`: copy, `growInset`, `growProgress`, `colomboClock`.
  - `lib/decode.js`: `scrambleDigits`.
- **Components:**
  - `components/Lens.jsx`, `components/lens/LensTile.jsx`, `useDevelop.js` (writes `data-develop`: `halftone | developing | developed | static`), `Viewer.jsx`.
  - `components/Timeline.jsx`, `components/Contact.jsx`.
- **CSS:** a `can-hover` variant (md+ with a real hover) and the focus ring on the Contact card, in `globals.css`.

**Rules that came out of Phase 3** (don't undo them):
- **The global `:focus-visible` rule is unlayered**, so it beats Tailwind utilities: `outline-none` does nothing. On the electric card the ring takes the card's text colour (`globals.css`).
- **Viewer taps close on `pointerup`, not `click`.** After a quick touch flick, Chrome can swallow the next tap's click.
- **Scroll-scrubbed effects near the page end must stay reachable:** cap the end at the maximum scroll (`growProgress`).
- **A canvas resize clears it:** repaint from the last sample at once and debounce any resample (`useDevelop`).
- **The halftone is sampled and drawn on the same cells (`dotGrid`).** Cells are stretched to span the tile exactly; a fixed 7 px grid runs past the tile and the print drifts off the photo toward the edges.
- **The hero portrait also calls `createImageBitmap` on resize.** Tests that count samples must filter by source.
- **The custom cursor is the top layer (`z-index: 110`).** The native cursor is hidden, so any overlay above it hides the pointer. A new overlay goes below 110 (the Lens viewer is 100).
- **Timeline marks share one axis.** The rule and the thread are centred on it with `-translate-x-1/2`, like the needle, dots and ×. A line pinned by its left edge sits half its width off-centre.

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

  Phase 2 result (medians of 3; both production builds ran in git worktrees in the session scratchpad, so Damian's `next dev` never stopped):

  | | Desktop | Mobile | Mobile LCP | Mobile TBT |
  |---|---|---|---|---|
  | `main` | 100 | 78 | 2159 ms | 715 ms |
  | `v3-phase-2` | 100 | 78 | 2061 ms | 754 ms |

  Phase 3 result (medians of 3, same worktree route):

  | | Desktop | Mobile | Mobile LCP | Mobile TBT |
  |---|---|---|---|---|
  | `main` | 100 | 80 | 2125 ms | 656 ms |
  | `v3-phase-3` | 100 | 79 | 2083 ms | 697 ms |

  The worktree route: `git worktree add --detach <dir> <branch>`, then `npm ci && npx next build && npx next start -p <port>` in each. Copy any uncommitted `public/` assets in first.

## Repo state at hand-off

- **Branches:**
  - `v3` is local only, with no upstream. `v3-phase-1` and `v3-phase-2` are merged and deleted.
  - `v3-phase-3` (current) is cut from `v3` and holds the whole Phase 3 build, not merged yet.
  - The working tree is clean.
- **Dev server:** Damian keeps `next dev` running on :3000. Never stop it for builds; use the scratchpad-worktree route in "Testing".
- **`AGENTS.md`** is generated by `next dev` on every run. It is gitignored (Damian's call); don't commit it.
- **Gallery photos:** all 10 are committed in `public/photography/`, EXIF-free. The originals stay in `assets/photography-originals/` (gitignored; they still carry EXIF and GPS). `npm run optimize-photos` rewrites every output, so restore unchanged ones with `git checkout -- public/photography`.
- **Hero headshot:** the original ("Professional Young Man's Studio Headshot.png") is in Damian's Downloads folder and must never be committed. The processed `public/hero/portrait.webp` is committed; Damian approved publishing it, and it has no EXIF.

## Files

- [`design.md`](design.md): **the consolidated design.** It's the source of truth for building, and it links to the files below.
- [`hero-portrait.md`](hero-portrait.md): the locked hero portrait spec, with every parameter (layout, image pipeline, rendering, colour, fade, loader, idle, lens, touch, dark mode).
- [`copy.md`](copy.md): the approved copy for Home and `/services`, current vs new.
- [`decisions.md`](decisions.md): every decision with who made it and why, the rejected options (don't reintroduce them), and the status.
- [`plan-phase-1.md`](plan-phase-1.md): the Phase 1 plan. It's **done**; read its status note for where the build departed from it.
- [`plan-phase-2.md`](plan-phase-2.md): the Phase 2 plan. It's **done**; read its status note for where the build departed from it.
- [`plan-phase-3.md`](plan-phase-3.md): the Phase 3 plan. It's **built** on `v3-phase-3` and waiting for Damian's visual approval; read its status note for where the build departed from it.
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
  - He wants review minors fixed too, not deferred (Phase 2). Fix them test-first along with the Critical and Important findings.
  - Mono buttons scramble their letters only. An arrow sits outside `ScrambleText`, so a button never changes width (Phase 2).
  - At a visual gate, open the dev page in his browser for him (`Start-Process "http://localhost:3000/#…"`).
- **Record everything:**
  - Decisions go into `docs/v3/` straight away.
  - Commit locally with clear messages.
  - Don't push or open PRs unless asked.
- **Public repo hygiene (CLAUDE.md):** no photo originals, CV, infrastructure details or secrets. Scan the staged diff before every commit.

## Tooling notes for this machine

- **Heredocs and stdin:** in the Bash tool, a long heredoc with quotes often fails to parse. Write Python or JS edit scripts to the scratchpad with the Write tool, then run them with `< /dev/null`. A command that reads stdin, like a bare `cat >`, hangs until it times out.
- **Line endings:** many files are CRLF. Edit scripts must detect them (`"\r\n" in s`) and keep them, or exact-match replacements fail.

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
