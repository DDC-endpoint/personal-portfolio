# V3 design

The consolidated design for the V3 upgrade of damiandc.com. A builder should be able to plan from this document plus the three it links to:

- [`hero-portrait.md`](hero-portrait.md): the locked hero portrait spec, with exact parameters.
- [`copy.md`](copy.md): the approved copy for every section of Home and `/services`.
- [`decisions.md`](decisions.md): the decision log, with who decided what and why, plus rejected options.

Where this document and `decisions.md` disagree, this document wins. Where this document and `hero-portrait.md` disagree on the portrait, `hero-portrait.md` wins.

## Intent

Damian's portfolio already has a settled look: ivory and navy with an electric-blue accent (`#2563EB`), Instrument Serif display type, JetBrains Mono labels, Manrope body text, and bold motion. V3 keeps that look and upgrades everything that moves: the loader, transitions, animations and content grids. It also refreshes the copy.

**The first ten seconds:** a visitor should be mesmerised by the hero and think "I wonder what more this site has to offer", then scroll and keep finding proof of how clean and well made a site can be. In practice that means five "wow" sections spaced through the page, with quiet, precise sections between them.

**The visual thread:** a decode language borrowed from ASCII art. Characters scramble and resolve into content, and skeletons resolve into the real thing. It is a seasoning, used in the wow sections, section labels, mono buttons and page transitions. It is not applied to every element.

## Goals

1. A hero that hooks: an electric-blue ASCII portrait of Damian that builds itself on load, idles subtly, and becomes a full-colour photo under a cursor lens.
2. Five wow moments: Hero, Projects, Timeline, Lens (gallery) and Contact.
3. Quiet sections (About, Leadership, Skills, Résumé) upgraded with a consistent motion vocabulary.
4. `/services` brought into the same system.
5. Approved copy, including the facts that have changed: second year, new and upcoming projects, the Aloys Travels domain.
6. No regression in load performance or accessibility.

## Non-goals

- No change to the palette, fonts or overall art direction.
- No change to the lab subdomain (`lab.damiandc.com`). `damiandc.com/lab` stays a 404 by design.
- No new pages, CMS or backend.
- No change to prices, turnarounds or the deposit policy on `/services`. Only their wording changes.

## Anti-goals (failure even if it "works")

- **Anything that reads as AI-template.** The Marquee was removed for exactly this reason. Avoid generic gradients, marquees and stock "bento" filler. The Lens gallery's mixed grid is deliberate: every tile is a real photo, framed like the live site.
- **Decode effects everywhere.** If every heading scrambles, none of them are special.
- **Motion that gets in the way of reading or clicking**, or that runs while you're trying to read.
- **A slower first paint.** The 2026-07-18 perf pass established that mobile LCP is bounded by font loading. Real text must be in the server HTML from the first paint, and effects replay over it.
- **Publishing private data.** The original headshot and other photo originals stay out of git. See "Constraints".

## Constraints

- **Stack:** Next.js 16.4 (App Router, Turbopack), React 19.3, Tailwind 4.3, framer-motion 14.6, GSAP 3.15, Lenis 1.3, OGL. Next 16 has breaking changes, so read `node_modules/next/dist/docs/` before writing framework code.
- **Existing pieces to build on or replace:**
  - `IntroStamp` (SSR curtain loader): kept, on every load of Home. The portrait's wave starts as it lifts (Damian, 2026-10-27).
  - `EagerReveal` (SSR-visible text with replayed entrance): reuse its approach.
  - `SplitLines`, `Reveal`, `Parallax`.
  - `SmoothScroll` (Lenis).
  - `Cursor` (36 px ring + dot, easing 0.18).
  - `GlitchField`.
  - `lib/motion.js` (`EASE`, `INTRO_OFFSET`, `shouldPlayIntro`, `SPRING`).
  - `lib/site.js` (`EMAIL`, `WHATSAPP_LINK`, `SOCIALS`, `AVAILABILITY`).
- **Public repo (`CLAUDE.md`):**
  - Never commit raw photo originals, the CV, infrastructure details or secrets.
  - Gallery photos go through `npm run optimize-photos`, which strips EXIF.
  - The processed hero cutout is approved for publishing. Verify it has no EXIF.
- **Accessibility:**
  - `prefers-reduced-motion` gets the static final state everywhere (see below).
  - Forced-colours mode keeps the native cursor, as today.
  - Every interactive card is a real link or button and is keyboard reachable.
- **Process:**
  - Ship in four phases onto a `v3` integration branch; see "Delivery".
  - Verify every visual change with real screenshots: desktop 1440×900, mobile 390×844, and reduced motion.
  - Never run `npm run build` while `next dev` is running.

## Global motion system

- **Decode primitive:** text or a canvas region resolves from noise characters to its final state. Noise set: `A–Z` (no I/O), `0–9`, `#$%&@*+=<>/\`. Text decode works letter by letter, with letters grouped per word so lines break only between words. Shared by the hero loader, section labels, link hover, timeline years and project skeletons.
- **Section labels** (`§ 0N — …`) decode in when they enter view. **Serif section titles** keep the existing line-by-line rise (`SplitLines`).
- **Link hover:** mono buttons (e.g. `SERVICES →`, `Request CV`) briefly scramble and resolve. Links that already have the underline draw (the nav links, "Services & pricing", serif text links) keep only the underline and don't scramble (Damian, 2026-10-27).
- **Cursor lens:** when the ring grows into the lens, the centre dot disappears (Damian, 2026-10-27).
- **Page transition: the curtain (every page; Phase 6, Damian 2026-10-28, see [`plan-phase-6.md`](plan-phase-6.md)):**
  - Five full-height panels (three below `md`), ivory and mist (navy and navy-2 in dark mode), rise centre-out to cover the page (0.7 s, 0.12 s apart), hold 0.22 s while the next page swaps in at full cover, then carry on upwards (0.85 s), power4 in-out. A page change takes about 2.25 s.
  - Their edges curve with their speed, a 1 px electric line glints along them with speed, and a soft shadow sits on the seams from the first frame, with a moving one that grows smoothly.
  - The destination's name rides the middle panel in small vertical mono with an electric dot.
  - It covers every link between Home, `/portfolio`, `/services`, `/privacy` and the 404 page, including section links like `/#contact`. Back and Forward start covered and lift.
  - Client-side navigation with a persistent overlay, the 4 s fallback to a normal load, focus to `<main>` on arrival.
  - Reduced motion and forced colours: no curtain; page changes are client-side and instant.
  - (History: Phase 5's top-down glyph sweep, chosen from `spike/page-transition.html`, was replaced by the curtain, chosen from `spike/loader-curtain.html`.)
- **First load and reload: the morph loader (Phase 6).** Every page's server HTML starts with the curtain covering and the loader on its middle panel: a morphing blob with the count inside (Instrument Serif italic), "DAMIAN DE CRUZ" decoding under it in regular-weight mono, and the coordinates. The count follows real readiness (fonts, and on Home the portrait): it can't pass 96 before the page is ready and 1.2 s have gone, and finishes by 2.5 s. At 100 the blob settles into a circle and one ring pulses out; the curtain lifts and the loader rides the middle panel away. Later loads in the same tab session show only the name resolving (about 0.4 s). A link clicked meanwhile opens under the same cover.
- **Entrances after the lift (Phase 6):** every arrival's above-the-fold entrance (Home's hero and portrait wave, `/services`' and `/portfolio`'s heroes, the privacy heading) starts as the panels clear, on first loads, reloads and page changes alike.
- **Cursor:** the existing ring and dot. Over the hero portrait the ring grows into the lens (see Hero).
- **Marquee:** removed from the page.
- **Nav (Phase 6):** one nav on every page: the logo "DDC / Damian De Cruz", then Home · Portfolio · Services · Privacy with the current page marked. The scroll progress bar keeps its form; the footer lists the same four pages.
- **Reduced motion:** static final state everywhere: no loader, idle animation, pinning, scrambling or growth.
  - The portrait shows as finished ASCII, with no lens.
  - Projects becomes a plain list of decoded screenshots.
  - Photos show in colour.
  - The timeline is fully stitched.
  - The contact card is full width.
  - Everything stays readable and clickable.

## Home, section by section

Section order: Hero → About → Leadership → Skills → Projects → Timeline → Résumé → Lens → Contact → Footer. This is today's order with the Marquee removed.

### 1. Hero (wow)

Full spec in [`hero-portrait.md`](hero-portrait.md). In short:

- **Layout:**
  - Today's hero stays: nav, corner metadata, kicker, name at 13.5vw, lede, and the sky-blue blobs. The SERVICES button is gone (Phase 6): the nav carries the pages.
  - The "Currently" line and the scroll indicator are removed.
  - The portrait is bottom-anchored, slightly left of the right edge, with its height capped so its label clears the nav.
  - It drifts and fades with the hero on scroll.
  - Dark mode dims the orb behind it.
  - Mobile order: kicker → name → portrait → lede.
  - Exact values are in `hero-portrait.md` → Layout.
- **Rendering:** a canvas ASCII portrait made from the processed studio headshot. Glyph ramp ` .·:;-=+*#%@`, cell 4, mono electric blue. Shading uses tints of electric blue rather than opacity. The bottom and shoulders fade out.
- **Loader (Phase 6):** the morph loader on the curtain (see "Global motion system") plays on every load or reload. As the curtain clears, on every arrival on Home, a 2.4 s wave builds the portrait from the face outward, from skeleton blocks through a noise front to the final glyphs, and the name rises (no letter decode). Hero text must be server-rendered.
- **Idle:** a scan band sweeps down every 6 s, plus sparse character flicker.
- **Lens:** the cursor ring grows into a lens about 120 px in radius that shows the full-colour photo. It has a thin ring and an `x · y` readout. Touch: drag on the portrait to move the lens.

### 2. About (quiet)

- The section label decodes and the title rises.
- Copy per `copy.md`, which now says second year.
- No layout change.

### 3. Leadership: "Beyond the Code" (quiet)

- The section label decodes and the title rises.
- **Roles list:** each row's top rule draws left to right, then its text rises, staggered row by row.
- Copy per `copy.md`. The roles data is unchanged.

### 4. Skills: "Stack" (quiet, new form)

- Replace the four-column grid with a **navy terminal panel**: a window with a mono prompt `damian@colombo ~ $ ls tools/`.
- On entering view, the four groups (`code/`, `design/`, `tooling/`, `curious-about/`) type out column by column in ivory and electric, ending on a blinking cursor prompt. Exact contents are in `copy.md`.
- The skills data is unchanged.
- Reduced motion: shown fully typed.

### 5. Projects: "Selected Work" (wow; Phase 6: the carousel)

- **Five sites, strongest first (Damian):** Aloys Travels, Danella De Cruz, Kahatagaha Graphite, Spades Solutions, Personal Dashboard, then the end card ("Your project next"). Every project, including This Portfolio and the upcoming ones, is on `/portfolio`.
- **Intro:** "Five favourites from a growing shelf. The rest, and what's on the way, is on the portfolio page." with an "All work →" link to `/portfolio` (underline draw, no scramble).
- **Pinned carousel (variant B, `spike/home-curation.html`):**
  - The section pins while about 3 viewport-heights of scroll glide the strip along a ~12° path through the screen centre. Cards are 40vw (the shot capped at 48.8vh), half a screen apart, so one card is centred with its neighbours' centres on the screen edges; the end card finishes dead centre.
  - The strip eases after the scroll (about 110 ms) and stays where the visitor stops.
  - Depth of field: a card is fully sharp within ±0.4 of a step of the centre, then ramps to scale 0.9, opacity 0.68, blur 3.2 px and saturate 0.65 at one step, a little more past it. Phones: dim and shrink only.
- **Card:** a minimal browser window with the site's hand-traced skeleton and a mono label `NN — Title — Year`.
- **The centred card is the active one** (on every device): it decodes from its skeleton into the screenshot and shows its tags and blurb, and dissolves back after it leaves the centre. Tab brings the next card to the centre. The pointer doesn't pick the card. Click or Enter opens the live site in a new tab.
- **End card:** an empty window whose address bar types out `your-site.com`, with "Your project next" and "Start a project →" to Contact.
- **Mobile:** no pinning; the cards stack with an alternating sideways offset, and the card nearest the centre is active.
- **Reduced motion and no JS:** a plain list of screenshots.
- **Screenshots:** captured from each live site at 1440×900 and optimised to WebP; full-page captures (720 wide) for `/portfolio`'s preview.

### `/portfolio` (Phase 6)

Every project, newest first, in a 3-column grid (2 from `md`, 1 on phones) of browser-frame cards, with filter chips (All, Client, Concept, Personal, In progress), a Grid | List morph, a row-by-row entrance with the address bar typing, a breathing live dot, an upcoming build loop and a scroll-through preview of each site's full page. Full spec: [`plan-phase-6.md`](plan-phase-6.md) → "`/portfolio`".

### 6. Timeline: "How I got here" (wow)

> *Superseded on 2026-10-27: the running stitch became a circuit with a pinned year counter. See `decisions.md` → "Timeline circuit". Order, content and the light-up stand.*

- **Order:** oldest first, so the needle travels forward through time. The entries, including the new "Sep 2026 · Began second year", are in `copy.md`.
- **Running stitch:**
  - An electric-blue dashed line, like real stitches, led by a small needle head, draws down the timeline as you scroll.
  - Each milestone gets a tiny cross-stitch × when the needle passes it.
  - The thread follows scroll in both directions: it unstitches when you scroll back up.
- **Milestone light-up:** as the needle reaches a milestone, its year decodes from scrambled digits and its title and description go from faint to full ink. Milestones below the needle stay faint.
- **Mobile:** the thread runs down the left edge, as the current mobile rule does.

### 7. Résumé (quiet)

- Unchanged apart from the shared label and hover upgrades. The "Request CV" button stays a mailto link, and no CV file is served.

### 8. Lens: "Off-duty, through glass" (wow)

- **Layout (Damian, revised twice):** a **compact mixed-size grid**. Smaller than the first editorial spread (Damian found it "massive"), with more rhythm than equal tiles. Reference: `spike/gallery-mockup.html`.
  - **Desktop:**
    - A 6-column grid spanning the **full content width** (page margins only), under the section heading, with a 16 px gap (Damian: less empty space on the left).
    - Rows are sized so each single tile is 3:4.
    - Two **2×2 hero tiles** plus eight single tiles, and a 2×1 **text tile** that closes the grid.
  - **Placement and captions (frame numbers follow reading order):**

    | Frame | Cell(s) | File | Caption |
    |---|---|---|---|
    | 01 | rows 1–2, cols 1–2 (hero) | IMG_20260503_071804386 | Sigiriya, from Pidurangala · May 2026 |
    | 02 | row 1, col 3 | IMG_20260415_173730095 | Small tenant · Apr 2026 |
    | 03 | row 1, col 4 | IMG_20250511_192659821 | Architecture at nightfall · May 2025 |
    | 04 | rows 1–2, cols 5–6 (hero) | IMG_20260912_173751573 | Storm light · Sep 2026 |
    | 05 | row 2, col 3 | IMG_20260117_104051821 | Pink in the green · Jan 2026 |
    | 06 | row 2, col 4 | IMG_20250905_165813446 | Thalpe, low tide · Sep 2025 |
    | 07 | row 3, col 1 | IMG_20260117_182647746 | A dahlia after dark, Nuwara Eliya · Jan 2026 |
    | 08 | row 3, col 2 | IMG_20260113_070907135 | Above the mist, Sigiriya · Jan 2026 |
    | 09 | row 3, col 3 | IMG_20251010_181954209 | Colombo skyline, blue hour · Oct 2025 |
    | 10 | row 3, col 4 | IMG_20260120_081200993 | Getting lost up Ella Rock · Jan 2026 |
    | — | row 3, cols 5–6 | text tile | "10 *frames*" · "2025 – 2026 · Sri Lanka" · "Private account. Request access for the full feed." · @nothing._.ddc ↗ |

  - **Captions:** a mono overlay on a navy gradient at the bottom of each tile: `FRAME NN` + caption on the left, month on the right.
    - On desktop with hover they are hidden at rest and slide up on hover. That keeps the grid clean and stops them clashing with the camera frame baked into Frame 01, which stays as is (Damian).
    - On phones they move **below the photo, into the mat** (small mono, ink-faint), so nothing overlaps an image, including Frame 01's camera frame (Damian).
  - **Frame (Damian):** each tile has a hairline `rule` border with an ivory mat around the photo (8 px; 10 px on hero tiles), echoing the live site's cards. Captions stay as the hover overlay inside the photo. The text tile gets the same border.
  - **Hover (Damian):**
    - No zoom and no lift.
    - A **highlighter** line traces the frame: an electric-blue 1.5 px stroke draws clockwise from the top-left around the border in about 0.6 s (`cubic-bezier(.65,0,.35,1)`), and draws back when the pointer leaves. Keyboard focus triggers it too. On touch, a tap runs a quick 0.35 s trace and then opens the full-screen viewer (Damian).
    - In the prototype it's an SVG `rect` with `pathLength=1`, animating `stroke-dashoffset` from 1 to 0.
  - **Mobile:** two columns. Hero tiles and the text tile span both columns, and each tile's height follows its photo plus the caption underneath.
  - The 4 existing photos are in `public/photography/`. The 6 new originals are in `assets/photography-originals/` (gitignored) and must go through `npm run optimize-photos` before commit.
- **Develop:**
  - Each photo starts as a halftone of round electric-blue dots sized by tone, and resolves into full colour as it scrolls into view.
  - This replays every time: scrolling away returns it to halftone.
- **Viewer:** clicking opens a full-screen viewer that expands from the photo's spot. Arrow keys or swipe move between photos; Esc or a click closes it.
- The Instagram link and the "Private account" note live in the grid's text tile; there's no separate footer row under the grid any more.

### 9. Contact (wow)

- **Growing card:**
  - A small electric-blue tile grows into a full-width card with ivory text.
  - The growth is scroll-scrubbed: it expands as you scroll down and shrinks back as you scroll up.
- **Inside the card:**
  - The headline "Got something in *mind*?" and the body copy from `copy.md`.
  - Email and WhatsApp buttons.
  - The pulsing `Available · 2026` badge.
  - Social links: LinkedIn, GitHub, Instagram, Discord.
  - A live `Colombo · hh:mm` clock.
- Reduced motion: shown full width from the start.

### 10. Footer

- Copy per `copy.md`, including the version label `v:04 / Always evolving`.

## `/services`

- Shared motion basics apply: label decode, link scramble, the curtain and the cursor. It uses the site's one nav (Phase 6), and "See the full portfolio" goes to `/portfolio`.
- **§ 02 How it works:** the 2×2 grid of steps becomes a single column, so the running-stitch thread from the Timeline can be reused unchanged (builder's call).
- **§ 03 Recent work:**
  - Cards become small skeleton browser windows that decode on hover, the same component as Projects.
  - The cards are This Portfolio, Spades Solutions, Aloys Travels (new URL) and Danella De Cruz (new).
- **§ 05 Start a project:** gets the growing electric card.
- All copy per `copy.md`. Prices and policies are unchanged.

## Delivery

1. `v3` is the integration branch, already created from `main` at `8cad99b`. It holds these docs.
2. One branch and PR per phase, merged **into `v3`**:
   - **Phase 1:** motion system primitives (decode, label decode, link scramble), the hero portrait plus its loader wave (with the IntroStamp curtain kept), the cursor-lens, and Marquee removal.
   - **Phase 2:** Projects.
   - **Phase 3:** Timeline, Lens and Contact. For the Lens, run the 6 new originals in `assets/photography-originals/` through `npm run optimize-photos`, check for no EXIF/GPS, and add them with the captions and placement from the Lens table.
   - **Phase 4:** copy refresh across Home, the remaining quiet-section upgrades (Leadership rows, Skills terminal) and `/services`.
   - **Phase 5:** the page transition. It was split out of Phase 4 on 2026-10-27 at Damian's request, because it moves both pages to client-side navigation.
   - **Phase 6:** the four-page nav, `/portfolio`, the Home carousel, the morph loader and the curtain, and the 404 board ([`plan-phase-6.md`](plan-phase-6.md)).
3. Test `v3` after every merge: golden path, mobile, reduced motion and a Lighthouse mobile run.
4. When all phases are in, merge `v3` to `main`, which triggers the redeploy.

## Verification for every phase

- Screenshots at 1440×900, 390×844 and with reduced motion, reviewed visually.
- No console errors.
- Keyboard pass over every new interactive element.
- Lighthouse mobile performance and LCP no worse than `main` measured the same way. Measure with production builds; the localhost Lantern numbers are unreliable.

## Left to the builder

- Implementation choices: canvas vs WebGL for the portrait and halftones; GSAP ScrollTrigger vs framer-motion for pinning and scrubbing; component structure; how the skeletons are authored (hand-written SVG/JSX per site is expected).
- Exact easing curves and durations not specified here, within the existing `lib/motion.js` vocabulary.
- How the gallery grid absorbs photos beyond these 10 later. Adding photos must not need a redesign; extra rows of single tiles are fine.
- Any performance tactics: pausing canvases off-screen, lowering cell density on low-end devices, lazy-loading screenshots.
