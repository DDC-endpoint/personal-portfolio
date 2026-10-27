# V3 Phase 5 Implementation Plan: the page transition

> **Status: planned (2026-10-27), waiting for Damian's approval.** Built on `v3-phase-5`, merged into `v3` locally on his approval at the visual gate. After it merges: the performance pass, then `v3` → `main`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native inline execution, as Phases 1–4) to implement this plan task-by-task, test-first, then one fresh reviewer at the end. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** moving between the site's pages plays one glyph transition instead of a full page load. The outgoing page is covered by a band of electric-blue characters sweeping down the screen. The new page swaps in underneath. The same sweep then decodes it in. Arriving on Home this way never replays the curtain or the portrait wave, and the hero is already in place.

**Architecture:**
- **Client-side navigation behind a persistent overlay.** Home, `/services`, `/privacy` and the 404 page share `app/(site)/layout.jsx`, which persists across navigations. The overlay (a full-screen canvas, the "veil") and its controller mount there once.
- **Links stay plain `<a href>`.** One delegated click listener (like `SmoothScroll`'s anchor handler) catches same-origin clicks to the site's pages. No-JS visitors, modified clicks (new tab), `target="_blank"` and downloads keep the browser's normal behaviour.
- **One pure, unit-tested module** holds the timings, the sweep maths and the "should this click be intercepted" rules: `lib/pageTransition.js`.
- **One flag says "this page was reached by a transition"** (`lib/motion.js`). IntroStamp, Hero and HeroPortrait read it, as they already share `shouldPlayIntro()`.
- **The canvas code is split out of the first load** (dynamic import on idle), so the transition costs Lighthouse nothing.

**Tech Stack:** Next.js 16.4 (`useRouter`, `usePathname`), React 19.3, Tailwind 4.3, framer-motion 14.6, Lenis, Vitest, Playwright.

**Spec:**
- [`design.md`](design.md) → "Global motion system" → "Page transition".
- [`decisions.md`](decisions.md) → "Phase 4 planning" (why this is its own phase) and "Phase 5 planning" (Damian's answers below).
- Prototype: [`spike/page-transition.html`](spike/page-transition.html), set to his choices (serve with `node docs/v3/spike/serve.cjs`, open `http://localhost:3200/page-transition.html`).

## Decisions made while planning (Damian, 2026-10-27)

- **Top-down sweep.** He compared three origins in the prototype (from the click, from the centre, a top-down sweep) and chose the sweep: a band of characters runs down the screen and covers the page, then runs down again to reveal the new one.
- **About 1.3 s, not 0.6 s.** He asked for twice the prototype's timing: cover 0.52 s, hold 0.12 s, reveal 0.64 s. This replaces design.md's "about 0.6 s".
- **Every page.** All links between Home, `/services` and `/privacy`, and the 404 page's link home. (The design said Home ↔ `/services`; they share one layout, so the rest come free.)
- **Back and Forward decode in only.** The browser has already switched pages when we hear about it, so the new page starts covered and the sweep reveals it, at the scroll position the visitor left.
- **The hero is already in place on arrival.** Arriving on Home by a transition: no curtain, no portrait wave (the finished portrait), and no float-in for the hero text. The sweep is the only entrance.
- **Reloads keep the curtain** (unchanged from the design).

## Builder's calls for Damian to confirm with this plan

- **"See the full portfolio" on `/services` goes to `/#work`** (the Projects section), not the top of Home. It says "full portfolio", and the transition lands there directly. The "This portfolio" row in Recent work and the Portfolio button keep going to the top of Home.
- **Same-page links behave as in-page links.** `/#work` clicked on Home smooth-scrolls (Lenis) instead of transitioning. A link to the page you're already on (for example "Home" in Home's footer) smooth-scrolls to the top.
- **While the page is covered, the characters keep flickering slowly.** On a fast connection nobody sees it (the next page is prefetched). On a slow one the covered screen stays alive instead of freezing.
- **If the next page hasn't arrived after 4 s, the browser loads it the normal way** (`location.assign`). Nobody is ever stuck under the veil.
- **On arrival, keyboard focus moves to the new page's `<main>`,** so Tab starts at the top of the new page. Next's route announcer already reads the new page's title to screen readers.
- **The reveal waits up to 0.4 s for Home's portrait to be drawn,** so the sweep never uncovers an empty portrait stage. If it isn't ready by then, the reveal goes ahead.
- **Reduced motion and forced colours:** navigation is still client-side and instant, with no veil. No JS: plain links, full page loads.
- **The other pages are prefetched once the browser is idle** after the first load, so the swap under the veil is near-instant.
- **Analytics:** GA4 counts client-side page changes through its "enhanced measurement" setting ("Page changes based on browser history events", on by default). We don't send our own `page_view`, which would double-count. **Damian checks that setting** in GA4 (Admin → Data streams → the web stream → Enhanced measurement → Page views → advanced settings).
- **`cacheComponents` stays off.** With it on, Next keeps old pages alive in hidden `<Activity>` trees, and the curtain, portrait and scroll-linked effects would need rework.

## Global Constraints

- **Palette:** tokens only. The veil's background is `--c-ivory` and its characters `--c-electric`, read from CSS at the start of every run, so light and dark both work.
- **Characters:** the site's decode noise (`NOISE` in `lib/decode.js`) at the wave front, and a light ramp (`.·:;-=+*#%@`) for the settled cover. JetBrains Mono 700: 13 px cells from `md`, 11 px below.
- **Nothing may trap the visitor.** The veil never blocks for more than the 4 s fallback. A second click while it runs is ignored. The veil is `aria-hidden`.
- **No regressions:** every existing unit and e2e test stays green. The curtain, portrait wave and hero float-in still play on every load and reload. Lighthouse on `/` and `/services` is no worse than `v3` before this phase (median of 5, the scratchpad-worktree route in README → "Testing").
- **Copy:** none changes, apart from the one link target above.

## Task 0: branch

- [ ] `git switch v3 && git switch -c v3-phase-5`. Check the dev server is up (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`).

## Task 1: `lib/pageTransition.js` (pure)

**Files:** create `lib/pageTransition.js`, `tests/unit/pageTransition.test.js`.

Exports:
- `TIMING = { cover: 0.52, hold: 0.12, reveal: 0.64, front: 0.18, jitter: 0.1 }` (seconds) and `FALLBACK_MS = 4000`.
- `PAGES = ["/", "/services", "/privacy"]`.
- `intercept({ button, metaKey, ctrlKey, shiftKey, altKey, defaultPrevented }, anchor, here)` → `{ kind: "transition" | "scroll", path, hash } | null`. `anchor` is `{ href, target, download, origin }`; `here` is `{ origin, pathname }`. Returns null for: non-left clicks, any modifier, an already-handled event, `target` other than `_self`, `download`, another origin, a path not in `PAGES` (the 404 page's own path is never a target), and bare `#…` links (SmoothScroll owns those). Same path → `scroll`; another page → `transition`.
- `sweepAt(x, y, cols, rows)` → 0..1: when the sweep reaches a cell (row-led, a slight column lean, as in the prototype).
- `cellAt(phase, t, at, { front })` → `"page" | "front" | "covered"` with the progress through the front; "cover" fills behind the front, "reveal" clears behind it.

- [ ] **Tests first:** every `intercept` rule above (one case each); `sweepAt` is 0 on the top row, rises down the screen and stays ≤ 0.9; `cellAt` hands off page → front → covered on cover, and covered → front → page on reveal; the timings add up to 1.28 s. Run them, see them fail.
- [ ] Implement; tests pass. Commit.

## Task 2: "reached by a transition" (Home's curtain, portrait and hero)

**Files:** `lib/motion.js`, `components/IntroStamp.jsx`, `components/Hero.jsx`, `components/HeroPortrait.jsx`, `components/EagerReveal.jsx` (if it carries its own entrance), tests in `tests/unit/motion.test.js` (new or extended) and `e2e/transition.spec.js` (new).

- `markSoftNavigation()` / `isSoftNavigation()` in `lib/motion.js`. Once set, `shouldPlayIntro()` returns false for the rest of the session (a reload starts fresh, so the curtain still plays).
- **IntroStamp:** starts inactive when `isSoftNavigation()` (`useState(() => !isSoftNavigation())`; on a first load the flag is false, so the server HTML still matches).
- **Hero:** on a soft arrival every entrance starts at its final state (`initial={false}` on the motion elements, and EagerReveal shown).
- **HeroPortrait:** a soft arrival draws the finished portrait (`data-state="static"`), never the wave.

- [ ] **Tests first (unit):** `shouldPlayIntro()` is true on a fresh load, false after `markSoftNavigation()`; `resetIntroDecision()` clears both.
- [ ] **Tests first (e2e, written now, passing after Task 4):** from `/services`, click "Portfolio" → on Home there is no `.intro-stamp`, `[data-portrait]` is `static` (never `wave`), and the hero name's line is at `translateY(0)` with opacity 1 when the reveal starts. A reload of `/` still shows the curtain and the wave (the existing loader specs).
- [ ] Implement. Commit.

## Task 3: the veil (canvas overlay)

**Files:** create `components/transition/Veil.js` (the drawing engine, no React) and `components/transition/PageTransitions.jsx` (client component: controller + canvas element); mount `<PageTransitions />` in `app/(site)/layout.jsx` inside `MotionProvider`.

- The canvas is `fixed inset-0`, `z-[70]` (above the nav at 50 and the curtain at 65), `aria-hidden`, `pointer-events-none` at rest and `pointer-events-auto` while running, so clicks can't land on the page underneath.
- `data-veil` on the canvas carries the state: `idle → covering → covered → revealing → idle`.
- `Veil.js` exports `createVeil(canvas)` → `{ cover(), coverNow(), reveal(), destroy() }`, each returning a promise. It sizes the grid from the viewport (DPR ≤ 2), reads `--c-ivory` and `--c-electric` at the start of each run, and draws with `sweepAt`/`cellAt` from Task 1. While `covered`, cells flicker slowly (about one in 200 per frame). The rAF loop runs only while the state isn't `idle`.
- `PageTransitions` imports `Veil.js` with a dynamic `import()` when the browser is idle after load (`requestIdleCallback`, 2 s timeout), or at the first intercepted click if that comes sooner.

- [ ] **Tests first (e2e):** the canvas is in the server HTML with `data-veil="idle"`, `aria-hidden`, and no pointer events; it never leaves `idle` on a plain load or reload; with JS off it's hidden.
- [ ] Implement. Commit.

## Task 4: the controller (clicks, swap, arrival)

**Files:** `components/transition/PageTransitions.jsx`, `components/SmoothScroll.jsx`.

On an intercepted `transition` click:
1. `preventDefault()`. Ignore it if a transition is already running.
2. `markSoftNavigation()`, then `await veil.cover()`.
3. `router.push(path + hash, { scroll: false })`, and start the 4 s fallback.
4. Wait for `usePathname()` to report the new path, then two animation frames for the page to paint. On Home, also wait up to 0.4 s for `[data-portrait]` to leave `loading`.
5. Hold for whatever remains of `TIMING.hold`.
6. Scroll instantly: to the hash target (minus the 80 px nav offset, as SmoothScroll does) or to the top.
7. Focus `<main>` (`tabIndex=-1` added on the fly, `preventScroll`).
8. `await veil.reveal()`.

On a `scroll` click (same page), hand over to SmoothScroll: it now also handles `/#id` and `/` links whose path is the current page, with the same Lenis `scrollTo`.

Prefetch: once idle after load, `router.prefetch()` each page in `PAGES` other than the current one.

- [ ] **Tests first (e2e, `e2e/transition.spec.js`):**
  - Home → "Services" (desktop nav and the hero button; phone hero button and the mobile menu): the veil runs `covering → covered → revealing → idle`; the URL is `/services`; it's the same document (a `window.__marker` set before the click survives); the page starts at the top; `<main>` has focus.
  - `/services` → "Portfolio": lands on Home at the top, per Task 2.
  - `/services` → "See the full portfolio": lands on Home with `#work` under the nav.
  - Footer "Privacy" from Home and from `/services`; the 404 page's link home.
  - A Ctrl-click (and a middle-click) on "Services" isn't intercepted (`defaultPrevented` is false, the veil stays `idle`). External links and `target="_blank"` links are untouched.
  - A second click while the veil runs does nothing (one history entry is added).
  - Timing: from click to `idle` takes between 1.2 s and 2.5 s on the dev server.
  - Fallback: with the next page's request blocked (`page.route` aborts it), the browser loads it normally after about 4 s.
  - Home's "Services" link on Home's footer (same page) smooth-scrolls and the veil stays `idle`.
- [ ] Implement. Commit.

## Task 5: Back and Forward

**Files:** `components/transition/PageTransitions.jsx`.

- A `popstate` listener: if the destination is another page in `PAGES`, call `veil.coverNow()` (fully covered at once) and `markSoftNavigation()`. When `usePathname()` reports the arrival, wait two frames, then `veil.reveal()`.
- Scroll: the visitor returns to where they were. Rely on Next's own back/forward scroll restoration. If the test shows it doesn't restore under the veil, keep a small map of scroll positions per history entry (keyed by `history.state`'s Next key and the URL) and restore before the reveal.

- [ ] **Tests first (e2e):** Home, scroll to `#timeline`, click "Services", then `page.goBack()` → the veil goes straight to `covered` (never `covering`), then reveals; the URL is `/`; the scroll position is within 80 px of where it was; no curtain, no wave. `page.goForward()` → `/services` at the top.
- [ ] Implement. Commit.

## Task 6: link target, reduced motion, forced colours, mobile menu

**Files:** `components/Services.jsx` (the "See the full portfolio" `href`), `components/transition/PageTransitions.jsx`, `components/Nav.jsx` / `components/ServicesNav.jsx` (only if their menus need closing before the swap).

- [ ] **Tests first (e2e):**
  - "See the full portfolio" links to `/#work`.
  - With reduced motion: clicking "Services" navigates client-side (the marker survives), the veil stays `idle`, and the page is at the top.
  - With `forcedColors: "active"`: same as reduced motion.
  - Phone: open the menu, tap "Services" → the menu is gone on arrival, `body` scrolls (no leftover `overflow: hidden`), and `main` isn't `inert`.
- [ ] Implement. Commit.

## Task 7: performance and full verification

- [ ] `npm test` and `npm run e2e` all green. Run the new transition spec 3 times in a row to check it's stable.
- [ ] **Screenshots** (the veil mid-cover, covered and mid-reveal; light, dark and phone), checked by eye.
- [ ] **Lighthouse:** `/` and `/services`, mobile and desktop, median of 5, `v3` against `v3-phase-5` in the same batch (scratchpad worktrees). The transition code mustn't appear in the first-load JavaScript (check the build's chunk list) and scores must not drop.
- [ ] **Manual:** a slow-network run (Chrome DevTools "Slow 4G") to see the flicker while covered and the fallback. Safari or Firefox if available.

## Task 8: docs, review, gate

- [ ] Update `docs/v3/README.md` (status, "What Phase 5 built", next step: the performance pass), `decisions.md` ("Phase 5 build and review"), this plan's status line, and `design.md` → "Page transition" (top-down sweep, about 1.3 s, every page, Back decodes in only).
- [ ] One fresh reviewer over the whole `v3-phase-5` diff (correctness, accessibility, the no-trap rules, performance). Fix every finding, minor ones included.
- [ ] **Visual gate:** show Damian the screenshots and open the dev pages. On his approval: `git switch v3 && git merge --no-ff v3-phase-5`, delete the branch, update the docs. No push.

## Files

- **New:** `lib/pageTransition.js`, `components/transition/Veil.js`, `components/transition/PageTransitions.jsx`, `tests/unit/pageTransition.test.js`, `e2e/transition.spec.js` (and `tests/unit/motion.test.js` if it doesn't exist).
- **Changed:** `app/(site)/layout.jsx`, `lib/motion.js`, `components/IntroStamp.jsx`, `components/Hero.jsx`, `components/HeroPortrait.jsx`, possibly `components/EagerReveal.jsx`, `components/SmoothScroll.jsx`, `components/Services.jsx`, possibly `components/Nav.jsx` and `components/ServicesNav.jsx`; docs.
- **Untouched:** the lab (its own host and layout), `proxy.js`, structured data, every page's content.

## Risks

- **Back/forward scroll restoration under client navigation** is the least certain part; Task 5 has a fallback.
- **Effects that start on mount** (the terminal typing, the circuit, scroll-linked reveals) now start under the veil instead of after a page load. Anything in view on arrival will already be moving when the sweep uncovers it, which matches "the hero is already in place". Check `/services`' hero and Home's first screen in the screenshots.
- **Timing-dependent tests:** assert on `data-veil` states and `data-state`, never on fixed sleeps, so the spec doesn't join the known flaky loader group.
