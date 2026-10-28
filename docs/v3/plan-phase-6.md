# V3 Phase 6 Implementation Plan: pages, curation, the loader and the curtain

> **Status: awaiting Damian's sign-off (2026-10-28).** Every design decision below is his, made from four spikes; see `decisions.md` → "Phase 6 planning". The builder's calls at the end are proposals for him to confirm.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native inline execution, as Phases 1–5) to implement this plan task by task, test-first, then one fresh reviewer for the whole branch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the site becomes four pages (Home, Portfolio, Services, Privacy) behind one nav. Home's Selected Work becomes a curated carousel of five sites with depth of field. A new `/portfolio` page holds all the work. The first load becomes a morph loader on a curtain, and every page change becomes the same curtain. The 404 page gets the Isometric Board. The performance pass follows this phase.

**Spikes (serve with `node docs/v3/spike/serve.cjs`, then open `http://localhost:3200/…`):**
- `home-curation.html`: Home as built here (nav, hero, § 04 carousel).
- `portfolio-page.html`: `/portfolio` as built here.
- `loader-curtain.html`: the loader and the curtain ("Damian's" preset).
- `strip-carousel.html`: the strip variants compared (B chosen).
- They need `proj/` (screenshots, the portrait, `full/` captures): see `spike/README.md`.

**Tech stack:** Next.js 16.4, React 19.3, Tailwind 4.3, framer-motion 14.6, Lenis, Vitest, Playwright. No new dependencies: the curtain runs on `requestAnimationFrame`, so GSAP stays lab-only.

## What changes, by page

### Every page
- **One nav** (`components/Nav.jsx`): the logo "DDC / Damian De Cruz" (→ Home), centre links Home · Portfolio · Services · Privacy with the current page marked (electric text and a drawn underline, `aria-current="page"`), then the theme toggle and availability. The mobile menu lists the four pages in large italic, with no Services button. `ServicesNav.jsx` is deleted; `/services` uses `Nav`. The in-page anchors are dropped.
- **Footer links:** Home, Portfolio, Services, Privacy.
- **The curtain** replaces the glyph veil for every page change, and the **morph loader** replaces the IntroStamp on first loads and reloads (see "The loader and the curtain").
- **Entrances wait for the lift:** each page's above-the-fold entrance starts as the panels clear.

### Home
- **Hero:** both SERVICES buttons removed (desktop, and the full-width phone button). Nothing replaces them.
- **§ 04 Selected Work:**
  - Five cards in Damian's order: Aloys, Danella, Kahatagaha, Spades, Dashboard, then the end card.
  - **Intro copy:** "Five favourites from a growing shelf. The rest, and what's on the way, is on the portfolio page." with an "All work →" link to `/portfolio` beside it (the underline-draw link style: no scramble).
  - **Carousel (variant B):** pitch half the screen width, so the neighbours' centres sit on the screen edges. The strip moves along the 12° line through the screen centre: card *i*'s centre sits at the screen centre at progress *i*/5, and the end card finishes dead centre with Dashboard half out.
  - **Cards at 40vw** (shot height capped at 48.8vh).
  - **Scroll smoothing:** the displayed progress eases after the scroll progress (time constant about 110 ms).
  - **Depth of field (desktop):** fully sharp within ±0.4 of a step (±20vw), then a smoothstep ramp over 0.6 of a step to scale 0.9, opacity 0.68, blur 3.2 px and saturate 0.65; past one step, up to 1.6 px more blur and 0.16 less opacity.
  - **The centred card is the active one:** it decodes from its skeleton and shows its tags and blurb. Tab moves focus to the next card and brings it to the centre. The pointer no longer picks the active card in the strip.
  - **Phones:** the stack stays; the card nearest the centre is active; the others dim and shrink (no blur).
  - **Reduced motion and no JS:** the plain list, as today.

### `/portfolio` (new)
- **Compact hero (~45vh):** "06 live · 02 on the way" (computed from the data), "All *work.*" (a rising line), the lede "Client sites, concepts and my own tools, newest first.", the filter chips and the Grid | List switch.
- **The work:** all eight projects, newest first (Aloys, Danella, Spades, Kahatagaha, This Portfolio, Dashboard, then Interact District 3220 and ai-studio). A 3-column grid (2 from `md`, 1 on phones) of browser-frame cards with number, name, year, tags and the one-line blurb.
- **Filter chips:** All, Client, Concept, Personal, In progress, with counts. Filtered-out cards fade and shrink slightly; the rest glide to their new places.
- **Grid | List (View Morph):** every card glides between tile and row form. Screenshots scale; text translates only, so it never squashes. List rows show a thumbnail, number, name, the first tag, year and ↗.
- **Animations:**
  - **Row-by-row entrance:** each row rises as it enters, its cards about 110 ms apart (capped at 3). No decode: the cards arrive showing their screenshots.
  - **The address bar types** the domain as each card lands, with a caret that blinks twice and goes.
  - **Live pulse:** a green dot breathes in each live site's address bar; upcoming cards get a static grey dot.
  - **Upcoming build:** upcoming cards loop a skeleton laying itself out (nav, headings, three blocks; 5.2 s), with "loading… 2026 →".
  - **Scroll-through preview:** resting on a card (on phones, the card nearest the centre once scrolling settles, 450 ms) scrolls its full-page capture inside the frame. Down at 13.5 ms per pixel of travel (3.9 s minimum, 13.5 s maximum), a 1.35 s hold, 2.1 s back up; leaving early eases back.
  - Every loop (pulse, build) runs only on screen.
- **End:** the "Your project next." card, its address bar typing "your-site.com", "Start a project →" to `/#contact`.
- **Clicks:** live cards open in a new tab; This Portfolio goes to Home; upcoming cards aren't links.
- **Reduced motion:** everything in place: no rise, no typing animation (the domain shows), no pulse, a static skeleton, no preview, instant filter and view changes.
- **No JS:** the grid with every card shown; the chips and the switch are hidden (`js:` variant).
- **SEO:** title "Portfolio: Websites by Damian De Cruz | DDC Web Services" (builder's call, below), canonical `/portfolio`, a `CollectionPage` + `ItemList` of `CreativeWork` in JSON-LD, and in the sitemap.

### `/services`
- "See the full portfolio" goes to `/portfolio` (was `/#work`).
- Its nav is the shared nav (no Portfolio button, no section anchors).

### 404
- **The Isometric Board** above "Nothing here.", re-coloured to the site: faces in paper/ivory, `rule` hairlines, the electric edge light, the shadow in ink. Hover lifts tiles with the Gaussian falloff; idle, the slow diagonal wave drifts. On phones a tap lifts the tile under it. Reduced motion: the settled cluster. Its maths moves to `lib/isoBoard.js`, shared with the lab demo, which keeps its own look.

## The loader and the curtain

### The curtain (every page change)
- **Panels:** five full-height columns (three below `md`), alternating ivory/mist in light mode and navy/navy-2 in dark mode.
- **Order and timing:** centre-out (the middle panel first, then its neighbours, then the outer two, 0.12 s apart). In 0.7 s, hold 0.22 s, out 0.85 s, ease power4 in-out (the lab's timing). A page change takes about 2.7 s.
- **Liquid edges:** each panel's top and bottom edges curve with its speed, by up to 9% of the screen height, capped at 0.3 × the panel width. The leading edge leans ahead; the trailing edge hangs as it reveals the page.
- **Edge light:** a 1 px electric line along both edges; its opacity follows the speed (0 at rest, full at 3.5 screens per second).
- **Shadow, always:** a resting shadow on the seams (light 10% ink, dark 38% black, 14 px blur), plus a moving shadow on the trailing side that grows and fades with speed (up to 16% / 45%), never switched on by a threshold.
- **Label:** the destination's name in small vertical mono on the middle panel with an electric dot ("PORTFOLIO ●").
- **The swap** happens at full cover, during the hold.
- **Kept from Phase 5:** the delegated click listener and its rules (`intercept`), the 4 s fallback to a normal page load, a second click ignored, Back/Forward starting covered and lifting, scroll positions kept per URL, focus to `<main>`, idle prefetch (now including `/portfolio`), links to the current page smooth-scrolling, reduced motion and forced colours navigating instantly with no curtain, no JS using plain links.

### The morph loader (first loads and reloads)
- **In the server HTML,** so the first paint is the loader on the covering panels, never a blank page. CSS gates hide it for reduced motion and for no-JS, with a 5 s failsafe, as the IntroStamp has now.
- **Layout:** a morphing SVG blob at the centre (an electric stroke, a 7% fill, a ghost outline trailing the morph), the count inside it (Instrument Serif italic, fixed-width digits, a small "%"), "DAMIAN DE CRUZ" under it in regular JetBrains Mono (decoding from noise as the count climbs), and the coordinates under that.
- **The count follows real readiness:** it climbs unevenly, can't pass 96 until the page is ready (`document.fonts.ready`, and on Home the portrait drawn or skipped) and 1.2 s have gone, and finishes by 2.5 s whatever happens.
- **At 100%:** the blob settles into a circle (0.42 s), and one thin ring pulses out.
- **It leaves with the curtain:** the loader rides the middle panel, which lifts first. No tension: the panels hold still while it counts.
- **Full first, short after:** the full loader plays on a visitor's first load in a browser session. Reloads and later direct loads in the same session show only the name resolving on the panels (about 0.4 s) before the lift, about 1.5 s in all, at lab speed.

### Entrances after the lift
- **On every arrival on Home** (first load, reload or page change), the name rises and the portrait plays its wave. This reverses Phase 5's "already in place".
- **They start as the panels clear:** 0.45 of the way through the out phase after the last panel's delay.
- **Other pages:** their above-the-fold entrance (`/services`' hero, `/portfolio`'s title and chips, `/privacy`'s heading) waits for the same moment.

## Global constraints
- **Palette:** tokens only; light and dark both verified.
- **Copy:** only the copy above changes.
- **Accessibility:**
  - The curtain and loader are `aria-hidden`, and the loader's name is exposed once as the page's own content (the hero), not twice.
  - Chips are `aria-pressed` buttons in a labelled group; the view switch likewise.
  - Focus moves to `<main>` after a page change.
  - Lighthouse a11y stays 100.
- **Reduced motion and forced colours:** no curtain, no loader, no depth of field, no loops.
- **No regressions:** every surviving unit and e2e test stays green. Lighthouse on `/`, `/services` and `/portfolio` is no worse than `v3` before this phase (median of 5, README → "Testing"); the perf pass comes next.
- **Public repo hygiene:** full-page captures are EXIF-free (sharp strips metadata); scan the staged diff before every commit.

## Tasks

### Task 0: branch and spikes
- [x] `v3-portfolio` cut from `v3`; spikes in `docs/v3/spike/`, decisions in `decisions.md`.
- [ ] Commit the spikes and docs (`proj/` stays gitignored).

### Task 1: project data (`lib/projects.js`)
- `PROJECTS` in Damian's newest-first order, each with `cats` (`client` / `concept` / `personal`; upcoming ones also carry `upcoming`).
- `HOME_STRIP` = `["aloys-travels", "danella-de-cruz", "kahatagaha-graphite", "spades-solutions", "personal-dashboard"]`.
- `FILTERS` with labels; `countFor(filter)`; `liveCount`, `upcomingCount`.
- `full: "/projects/full/<slug>.webp"` on live cards.
- [ ] **Tests first** (`tests/unit/projects.test.js`, updated): the order; the home five and their order; the categories and counts (All 8, Client 4, Concept 1, Personal 3, In progress 2); live 6, upcoming 2; every live card has a shot and a full capture path; upcoming cards have neither. Then implement. Commit.

### Task 2: one nav, buttons out, links in
- **Files:**
  - `lib/site.js`: `NAV_LINKS` = the four pages.
  - `components/Nav.jsx`: `aria-current`, the logo, the mobile menu.
  - Delete `components/ServicesNav.jsx`; `app/(site)/services/page.jsx` uses `Nav`.
  - `components/Hero.jsx`: remove both SERVICES buttons.
  - `components/Footer.jsx`: add Portfolio.
  - `components/Services.jsx`: "See the full portfolio" → `/portfolio`.
- [ ] **Tests first (e2e, new `e2e/nav.spec.js`):** every page shows the same four links with the current one marked; the logo reads "DDC / Damian De Cruz" and goes Home; the hero has no SERVICES link; the mobile menu lists the four pages and no Services button; `/services` has no Portfolio button; the footer has four links; "See the full portfolio" points at `/portfolio`.
- [ ] Update the tests this retires: `transition.spec.js` (hero button, `/#work` nav link, the Portfolio button), `services.spec.js` (the mobile menu's Portfolio button), `hero.spec.js` / `scramble.spec.js` where they use the SERVICES button.
- [ ] Implement. Screenshot every page (desktop and phone, light and dark). Commit.

### Task 3: the carousel strip
- **`lib/strip.js`:**
  - `STRIP` gains `CARD_VW 0.40`, `SHOT_MAX_VH 0.488`, `PITCH_VW 0.5`, `DOF { zone: 0.4, ramp: 0.6 }`.
  - `stripLayout`: card size and pitch.
  - `stripOffset(f, L)`: card `f` centred on the 12° line through the screen centre.
  - `focusAt(p, count)` = `p × (count − 1)`.
  - `progressForCard(i, count)` = `i / (count − 1)`.
  - `depthAt(d, { blur })` → `{ scale, opacity, blur, saturate }`.
  - `smoothStep(shown, target, dt)` for the scroll smoothing.
- **`components/Projects.jsx`:**
  - the five `HOME_STRIP` cards;
  - the active card is the centred one (`d < 0.5`);
  - depth of field written per frame to each card's style (blur only on desktop);
  - Tab brings the focused card to the centre;
  - the new copy and the "All work →" link.
- [ ] **Tests first (unit, `strip.test.js` rewritten):** 40vw cards capped by height; the first card centred at progress 0; the end card centred at 1 with the previous card's centre on the left edge; the path at 12°; `depthAt` flat inside ±0.4, monotonic after it, at the stated values at 1 and 1.5 steps, and with no blur when `blur: false`; smoothing converges and never overshoots.
- [ ] **Tests (e2e, `projects.spec.js` reworked):** five cards then the end card, in order; the centred card decodes under any pointer position; a card 0.3 of a step off centre is still sharp (`filter: none`); neighbours are blurred on desktop and not on phones; the end card finishes centred; Tab brings each card to the centre; the "All work" link; no-JS and reduced-motion lists unchanged.
- [ ] Implement. Screenshots at the start, mid-glide and end; at 100% and 150% display scaling; dark. Commit.

### Task 4: full-page captures
- `scripts/capture-projects.mjs` gains `--full`. It scrolls each page through to trigger reveals, takes a full-page shot at 1440 wide, scales it to 720 wide, caps it at 4200 px and writes `public/projects/full/<slug>.webp` (sharp, no metadata). This Portfolio is captured from local dev with the loader and cursor hidden.
- [ ] Run it; check each image (no consent banners, reveals rendered) and that it carries no EXIF. Commit the images.

### Task 5: `/portfolio`
- **Files:**
  - `app/(site)/portfolio/page.jsx`: metadata, JSON-LD.
  - `components/portfolio/`: `PortfolioHero.jsx`, `WorkGrid.jsx`, `WorkCard.jsx` (reusing `BrowserFrame`), `UpcomingBuild.jsx`, `usePreview.js`, `useTyping.js`.
  - `lib/portfolio.js`: pure: `previewPlan(travel)`, the entrance stagger `delayFor(column)`, `filterProjects(filter)`.
  - `lib/structuredData.js`: `portfolioGraph()`.
  - `app/sitemap.js` and `lib/pageTransition.js` (`PAGES`) add `/portfolio`.
- **The morph** uses framer-motion `layout` (as the lab's View Morph): the frame with `layout`, the text with `layout="position"`, a capped per-card delay; `LayoutGroup` around the grid.
- **The preview** swaps the top shot for the full capture when a preview first starts, loading it lazily, so the page's first load carries only the top shots.
- [ ] **Tests first (unit, `tests/unit/portfolio.test.js`):** `previewPlan` (the minimum and maximum, 13.5 ms per pixel, hold 1.35 s, back 2.1 s, no preview under 8 px of travel); `delayFor` capped at 3 columns × 110 ms; `filterProjects` for each chip; `portfolioGraph()` lists the six live sites.
- [ ] **Tests (e2e, new `e2e/portfolio.spec.js`):**
  - eight cards in order; counts on the chips; each filter shows the right cards;
  - List switches every card to a row and Grid back; the switch and the chips are `aria-pressed`;
  - live cards open in a new tab and This Portfolio goes to Home;
  - the address bar types; the live dot shows only on live cards;
  - a resting pointer moves the preview image down, and leaving brings it back;
  - the loops pause off-screen;
  - reduced motion: everything in place and no preview;
  - no JS: all eight cards, no chips;
  - JSON-LD present; no console errors.
- [ ] Implement. Screenshots: desktop, phone, dark, list view, a filter, mid-preview. Commit.

### Task 6: the curtain
- **`lib/curtain.js` (pure):** `TIMING` (in 0.7, hold 0.22, out 0.85, stagger 0.12), `panelCount(width)`, `delayOf(i, count)` (centre-out), `ease` (power4 in-out), `bulge(speed, vh, panelW)`, `edgeLight(speed)`, `shadow(speed, theme)` → resting + moving parts, `totalChange()`.
- **`components/transition/Curtain.jsx`:** the panels (with `clip-path` edges and an edge-light SVG), the middle-panel label, the per-frame driver.
- **`PageTransitions.jsx`:** drives `Curtain` instead of the `Veil` (cover → swap at full cover → lift); everything else (interception, fallback, Back/Forward, focus, prefetch) stays.
- `Veil.js` and its glyph code are removed.
- [ ] **Tests first (unit, `tests/unit/curtain.test.js`):** the timings; 5 panels from `md`, 3 below; centre-out delays (middle 0, neighbours 0.12, outer 0.24; for 3 panels 0 and 0.12); `ease` symmetric and 0→1; `bulge` 0 at rest, signed, capped by both limits; `edgeLight` 0 at rest and 1 at 3.5 screens/s; `shadow` always has the resting part and its moving part rises smoothly from 0 (no threshold); a page change totals about 2.7 s.
- [ ] **Tests (e2e, `transition.spec.js` reworked):**
  - the panels cover centre-out and lift centre-out;
  - the label names the destination;
  - the page swaps only at full cover;
  - the resting shadow is there before any panel moves;
  - every page link, including `/portfolio` and the footer, transitions;
  - the fallback, Back/Forward, a second click and modified clicks behave as before;
  - focus lands on `<main>`;
  - reduced motion and forced colours: instant with no panels.
- [ ] Implement. Frame-by-frame screenshots of a change (desktop and phone, light and dark). Commit.

### Task 7: the morph loader
- **`lib/loader.js` (pure):** `blobPath(radii, t)`, `TARGETS`, `stepCount({ p, el, ready, speed, dt })` with the 96 / 1.2 s / 2.5 s rules, `decodeText(text, k, rand)`, `loadKind(session)` → `"full" | "short"`.
- **`components/MorphLoader.jsx`** replaces `IntroStamp.jsx`: server-rendered static frame (the blob, "0", a seeded scramble), the count and decode while loading, the settle and the ring, then hands over to the curtain's lift. A `sessionStorage` flag marks the session's first full load (storage errors mean "full").
- **`globals.css`:** the stamp's halo and glyph rules go; the reduced-motion / no-JS gates and the failsafe move to `.morph-loader`.
- [ ] **Tests first (unit, `tests/unit/loader.test.js`):** `stepCount` never passes 96 before ready and 1.2 s; reaches 100 by 2.5 s when never ready; is monotonic; `blobPath` has a constant command count and closes; `decodeText` at 0 keeps spaces and at 1 is the text; `loadKind` gives "full" first, then "short", and "full" when storage throws.
- [ ] **Tests (e2e, `loader.spec.js` reworked):**
  - the loader is in the server HTML on every page;
  - the count rises to 100 and the name resolves in regular weight;
  - the loader lifts with the middle panel;
  - a reload in the same session is short (no blob or count);
  - a new session is full;
  - a slow portrait holds the count at 96;
  - reduced motion and no JS show no loader;
  - the failsafe hides it if scripts never run;
  - a page link clicked during the loader opens once it's done, under the same cover.
- [ ] Implement. Screenshots of the first frame (before scripts), mid-count, the settle, the lift. Commit.

### Task 8: entrances after the lift
- **`lib/motion.js`:** `onReveal(cb)` / `whenRevealed()`, fired by the curtain 0.45 of the way through the out phase after the last panel's delay. `INTRO_OFFSET` and the soft-navigation skip go.
- **`Hero.jsx`, `HeroPortrait.jsx`, `EagerReveal.jsx`, `Services.jsx`, `PortfolioHero.jsx`, the privacy heading:** entrances start on `whenRevealed()`. The portrait's wave rules (skip in a hidden tab, below the hero, a late image) stay.
- [ ] **Tests first:** unit (`whenRevealed` resolves once per arrival and immediately when no curtain plays); e2e: on first load, reload and a page change to Home, the name is below its line before the lift and rises after it, and the portrait goes `loading → wave → static`; `/services` and `/portfolio` headings wait too; the hero entrance never shifts layout.
- [ ] Implement. Commit.

### Task 9: the 404 board
- `lib/isoBoard.js` (falloff, ambient wave, smoothing); `components/IsoBoard.jsx` (site colours); `app/(site)/not-found.jsx`; the lab demo imports the shared maths.
- [ ] **Tests first:** unit for the maths; e2e: the 404 shows the board and "Back to damiandc.com" (which transitions Home); hovering lifts a tile; reduced motion is the settled cluster; the lab demo still renders.
- [ ] Implement. Screenshots light and dark, desktop and phone. Commit.

### Task 10: clean-up and docs
- Remove the dead code and tests: `Veil.js`, `IntroStamp.jsx`, the glyph and halo CSS, `ServicesNav.jsx`, `stampRadius`, `bloomAt`, `sweepAt` and friends.
- Update README ("What Phase 6 built", the next step), `design.md` where it describes the loader, the transition, the nav and Projects, and the spike README.
- [ ] Commit.

### Task 11: verify, review, gate
- [ ] `npm test`, `npm run e2e` (restart `next dev` first if the session has been long).
- [ ] Screenshots: the golden path on all four pages and the 404; phone; dark; reduced motion; 100% and 150% display scaling.
- [ ] Lighthouse on `/`, `/services` and `/portfolio` against `v3` (median of 5, production builds, the scratchpad-worktree route).
- [ ] The impeccable detector over the changed UI files, once.
- [ ] One fresh reviewer for the whole branch; fix every finding test-first, minors included.
- [ ] Visual gate: open the dev pages for Damian.

## Builder's calls (for Damian to confirm)
1. **No GSAP on the site.** The curtain runs on `requestAnimationFrame` with the lab's power4 in-out curve, so the site bundle doesn't grow; GSAP stays in the lab.
2. **"Session" means the browser tab's session** (`sessionStorage`): a new tab or a closed browser gets the full loader again. Private windows or blocked storage always get the full loader.
3. **Back/Forward:** the page arrives covered and the curtain lifts (no cover phase), as in Phase 5.
4. **Every page's above-the-fold entrance waits for the lift,** not only Home's (`/services`' hero played under the old cover).
5. **The "All work →" link** uses the underline-draw style (no scramble), like "Services & pricing".
6. **`/portfolio`'s metadata:** title "Portfolio: Websites by Damian De Cruz | DDC Web Services", description "Every website I've designed and built: client sites, concepts and my own tools, from Colombo, Sri Lanka." Its share card reuses the home card until a portfolio card is made.
7. **The filter and the view aren't kept in the URL** (no `?filter=`); a visit always starts on All, Grid.
8. **Full-page captures load only when a preview first starts,** so `/portfolio`'s first load carries only the top shots.
9. **The Isometric Board's lab demo** keeps its own dark look; only the maths is shared.
10. **The portrait's existing skip rules stay** (a hidden tab, a landing below the hero, an image later than 2.5 s): in those cases the finished portrait shows after the lift instead of the wave.
