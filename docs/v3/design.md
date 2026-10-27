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
- **Page transition (Home ↔ `/services`):** glyph dissolve, about 0.6 s. The outgoing page breaks into blue characters and the incoming page decodes in through the same wave as the hero loader.
  - It also applies to in-page links between the two pages, such as `/#work`. Reloads get the curtain instead (Damian, 2026-10-27).
  - Arriving on Home this way never replays the 2.4 s portrait wave: the portrait is already drawn.
  - Builder's call: client-side navigation with a persistent transition overlay, rather than full reloads with a timed exit.
- **Cursor:** the existing ring and dot. Over the hero portrait the ring grows into the lens (see Hero).
- **Marquee:** removed from the page.
- **Nav, scroll progress bar and footer** keep their current form, apart from the label and hover upgrades.
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
  - Today's hero stays: nav, corner metadata, SERVICES button in its current spot, kicker, name at 13.5vw, lede, and the sky-blue blobs.
  - The "Currently" line and the scroll indicator are removed.
  - The portrait is bottom-anchored, slightly left of the right edge, with its height capped so its label clears the nav.
  - It drifts and fades with the hero on scroll.
  - Dark mode dims the orb behind it.
  - Mobile order: kicker → name → portrait → lede → a full-width SERVICES button.
  - Exact values are in `hero-portrait.md` → Layout.
- **Rendering:** a canvas ASCII portrait made from the processed studio headshot. Glyph ramp ` .·:;-=+*#%@`, cell 4, mono electric blue. Shading uses tints of electric blue rather than opacity. The bottom and shoulders fade out.
- **Loader (revised 2026-10-27):** the existing `IntroStamp` curtain plays on every load or reload of Home. As it lifts, a 2.4 s wave builds the portrait from the face outward, from skeleton blocks through a noise front to the final glyphs, and the hero text floats in as on the live site (no letter decode). Hero text must be server-rendered and visible to LCP from the first paint.
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

### 5. Projects: "Selected Work" (wow)

- **Data and order:**
  - 01 This Portfolio
  - 02 Personal Dashboard
  - 03 Aloys Travels (`https://aloys-travels.com/`)
  - 04 Spades Solutions
  - 05 Danella De Cruz
  - 06 Kahatagaha Graphite
  - 07 Interact District 3220: upcoming, not linked
  - 08 ai-studio: upcoming, not linked, "In the works · 2026", no blurb
  - End card: "Your project next"

  Coursework Archive is removed. Blurbs are in `copy.md`.
- **Pinned diagonal strip:**
  - The section pins while about 3 viewport-heights of scroll drive a strip of cards along a gentle ~12° path from lower-left to upper-right. Then it releases.
  - The cards themselves stay level; only the path is diagonal.
  - Each card is about 45% of the viewport width, so roughly two are in view: one fully, the next arriving.
- **Card:**
  - A minimal browser window: three dots, plus the site's domain in a mono address bar.
  - Inside is a **skeleton** of that site's real homepage layout (nav, hero, cards, footer) drawn in the blue palette, so each one is recognisable.
  - Under the card sits a small mono label `NN — Title — Year`.
- **Hover / keyboard focus:**
  - The skeleton decodes through characters into a real screenshot of the site, and the tags and blurb appear.
  - Click or Enter opens the live site in a new tab.
  - When the pointer leaves, the card dissolves back into its skeleton after a short delay.
- **Upcoming cards:** **generic** skeletons (Damian). Nothing of Interact's unreleased design goes in the public repo. Address bars read `interactdistrict3220.org` and `ai-studio`. They never decode. On hover they scramble and stay as skeletons, with a `loading… 2026 →` label. They are not links. When a site goes live, flipping its status gives it the full treatment.
- **This Portfolio card:** recursive. Its skeleton is the V3 hero itself, including a tiny ASCII portrait, and it decodes into a screenshot of V3.
- **End card:** an empty skeleton window whose address bar types out `your-site.com`, with "Your project next" and a "Start a project →" link to Contact.
- **Mobile:** no pinning. Cards are full width and level, stacked vertically; the diagonal shows as a gentle alternating sideways offset (builder's call). The card nearest the centre of the screen decodes automatically, and tapping opens the site.
- **Screenshots:** captured from each live site at 1440×900 (top of the page) and optimised to WebP.

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

- Shared motion basics apply: label decode, link scramble, glyph-dissolve transition and cursor.
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
