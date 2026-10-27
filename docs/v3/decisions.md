# V3 decision log

Every decision made in the V3 design conversation (2026-10-26), with the reason where one was given. "Damian" = decided by the site owner. "Builder's call" = proposed by Claude and not objected to; open to change.

## Intent

- **What V3 is:** keep the existing style and visual direction (light blue palette, Instrument Serif + JetBrains Mono + Manrope, bold motion) and completely upgrade transitions, animations, loaders and content grids; review the whole design; refresh the copy.
- **The first ten seconds (Damian):** visitors should be mesmerised and think "I wonder what more this site has to offer", then scroll and see how well designed and clean a website can be. Two beats: a hook, then proof of craft.
- **Wow moments:** not a single signature moment. Five sections get a wow moment; the rest stay quiet but polished.

## Scope

- **Pages (Damian):** Home and `/services` get V3. The lab (lab.damiandc.com) is untouched.
- **`/services` upgrades (Damian):** shared motion basics (labels decode, link scramble, glyph-dissolve transition, cursor); `§ 03 Recent work` cards become small skeleton browser windows that decode on hover; `§ 02 How it works` steps get the running-stitch thread; `§ 05 Start a project` gets the growing electric contact card.
- **Reduced motion (Damian):** static final state everywhere — no loader, idle, pinning, scramble or growth. Portrait renders as finished ASCII (no lens), Projects is a plain list of decoded screenshots, photos in colour, timeline fully stitched, contact card full width. Everything readable and clickable.
- **Five wow sections (Damian):** Hero, Projects, Timeline, Lens (photo gallery), Contact.
- **Quiet sections:** About, Leadership, Skills, Resume. They get the upgraded motion vocabulary (headings that decode/scramble in, number counters where real numbers exist, cleaner grids) but no spectacle.
- **Headings (Damian):** the mono section label (e.g. `§ 02 — Beyond the Code`) decodes from characters; the big serif title keeps today's line-by-line rise. ASCII stays a seasoning, not everywhere.
- **Skills (Damian):** becomes a **terminal readout** in a **navy terminal panel**: mono prompt `damian@colombo ~ $ ls tools/`, skills type out in ivory and electric, column by column, ending on a blinking cursor.
- **Resume (Damian):** keep as is (Request CV mailto button + copy), plus the shared heading/hover upgrades.
- **Leadership (Damian):** each role's top rule draws left to right, then the text rises.
- **Link hover (Damian):** nav links and mono buttons (e.g. `SERVICES →`) briefly scramble and resolve on hover; serif text links keep the underline draw.
- **Marquee removed (Damian):** the scrolling word ribbon under the hero goes. Reason: "that feels very AI coded."
- **Page transitions (Damian):** glyph dissolve between Home and `/services`. The outgoing page breaks into blue characters, the new page decodes in through the same wave as the hero loader (~0.6s).
- **Delivery (Damian):** phases on a `v3` integration branch; see README.

## Hero

See [`hero-portrait.md`](hero-portrait.md) for the full locked spec. Summary of Damian's calls:

- Portrait in the **right column**; hero copy stays on the left **like the current site** (kicker, DAMIAN / *de* CRUZ., lede, corner metadata, SERVICES button, blobs). The "Currently" line and scroll indicator are removed; see "Builder review answers" below.
- Rendered as **ASCII glyphs**, full face visible at rest (no "mystery" silhouette), finest grid (cell 4), **mono electric blue** (`#2563EB`).
- **Bottom and shoulders fade out** (strong fade, starting around chest level) so it doesn't end abruptly.
- **Loader:** the ASCII wave reveals the whole hero (~2.4s) and replaces today's intro curtain. It plays on the first visit per browser session only.
- **Idle:** slow scan band every 6s + sparse character flicker.
- **Hover:** the site's existing cursor (ring + dot) expands into a **lens** showing the **full-colour photo**, radius ~120px (about 40% on the prototype slider). Thin ring + small `x · y` coordinates; no scrambled edge.
- **Touch:** drag on the portrait moves the lens.
- **Mobile order:** kicker → name → portrait → lede → full-width SERVICES button.
- **Dark mode:** bright electric blue glyphs (`#3B82F6`) on navy.
- **Label** "PORTRAIT · 160 × 130 CELLS" above the portrait stays.
- **Photo:** the ChatGPT-edited studio headshot (navy suit, light blue shirt, navy tie, plain grey background). Publishing a processed, EXIF-free copy is approved.

### Tried and rejected (don't reintroduce)

- **Portrait behind the text / full-hero layout copied from the reference video.** The video was only meant to show the ASCII image style, not restyle the site.
- **Code-character trail across the whole hero** — "it's bad."
- **Dot-matrix style** — glyphs chosen instead.
- **Code-trail hover** instead of the lens — Damian preferred the lens.
- **Muted navy or electric duotone inside the lens** — full colour chosen.
- **Two-tone shading** (electric → navy) — mono chosen.
- **70-step character ramp** — turned the face into a wall of letters.
- **Whole-site dot texture.**
- **Original school-uniform photo** — replaced by the studio headshot (the uniform had a crest and Head Prefect pins Damian wanted out).

## Projects (wow #2)

- **Order (Damian):** 01 This Portfolio · 02 Personal Dashboard · 03 Aloys Travels · 04 Spades Solutions · 05 Danella De Cruz · 06 Kahatagaha Graphite · then upcoming: Interact District 3220, ai-studio.
- **Aloys Travels link:** `https://aloys-travels.com/` (replaces the pages.dev URL).
- **Interact District 3220 (Damian):** client project, `https://www.interactdistrict3220.org/`, site not live yet.
- **ai-studio (Damian):** keep it mysterious: title + "In the works · 2026", no description.
- **Coursework Archive:** dropped (two real upcoming projects beat a placeholder).
- **Upcoming cards:** no links until live. Shown as **generic** skeletons (no unreleased client design in the public repo) that never decode; on hover they scramble and stay skeletons with a "loading… 2026 →" label. When a site launches, flip its status to live and it gets the full treatment.
- **Skeleton previews (Damian):** for live sites, traced from each site's real layout (screenshot the live site, hand-trace nav/hero/cards/footer as a skeleton in the blue palette), so each is recognisable.
- **Motion (Damian):** section pins; scrolling drives a tilted strip of previews diagonally across the viewport (~3 screens of scroll), then releases. Mobile: a vertical stack of full-width level cards with an alternating sideways offset (builder's call, after review).
- **Hover/tap (Damian):** the skeleton decodes through characters into a real screenshot of the site, plus title/year/tags. Click opens the live site in a new tab.
- **Card frame (Damian):** each skeleton sits in a minimal browser window — three dots + the site's domain in a mono address bar.
- **Card label (Damian):** small mono label under each card: number — title — year (e.g. `03 — Aloys Travels — 2026`). Tags and blurb appear on hover.
- **Angle (Damian):** gentle ~12° path from lower-left to upper-right. Cards stay level; only the path is diagonal.
- **Size (Damian):** large — each card ~45% of the viewport width, about two in view (one full, the next arriving).
- **Mobile reveal (Damian):** the card nearest the centre of the screen auto-decodes into its screenshot as you scroll; tapping opens the site.
- **Mouse leave (Damian):** a decoded card dissolves back into its skeleton after a short delay, so the strip returns to its calm blueprint state.
- **Strip end (Damian):** a final "your project next" card — an empty skeleton window whose address bar types out `your-site.com`, with a "Start a project →" link to Contact.
- **This Portfolio card (Damian):** recursive — a skeleton of the V3 hero itself, including a tiny ASCII portrait; on hover it decodes into a screenshot of V3.
- **Builder's calls:** screenshots captured with Playwright from each live site at 1440×900 (top of page), optimised to WebP; keyboard focus behaves like hover (decode) and Enter opens the site; reduced motion = no pinning, a plain vertical list of already-decoded cards.

## Timeline (wow #3)

- **Motion (Damian):** a needle stitches down. As you scroll, a thin thread draws down the timeline; each milestone lights up as the needle passes and its year decodes from scrambled digits.
- **Content:** add a "Began second year" entry — Damian is now in second year.
- **Order (Damian):** flip to **oldest first** (2018 → now) so the needle stitches forward through time and the story ends on the present.
- **Thread (Damian):** running stitch — an electric-blue dashed line like real stitches, led by a small needle head; each milestone gets a tiny cross-stitch × as the needle passes.
- **Scroll back (Damian):** the thread follows scroll both ways (unstitches); milestones above the needle stay lit, those below go faint again.
- **Milestone light-up (Damian):** the year decodes from scrambled digits and the title + description go from faint to full ink.
- *Superseded on 2026-10-27: the running stitch and needle became a circuit with a pinned year counter (see "Timeline circuit"). Order, content, scroll-back and the light-up stand.*

## Lens — photo gallery (wow #4)

- **Layout (Damian, revised twice on 2026-10-26):** a compact mixed-size grid. There are 6 columns of small 3:4 tiles, two 2×2 hero tiles (Sigiriya, Storm light) and a text tile with the Instagram link. Captions appear on hover on desktop. Damian rejected two earlier versions: the big editorial spread ("massive pictures") and the equal five-across grid (wanted mixed sizes that look cleaner). Frame 01's baked-in camera frame stays. Later the same day: full content width, a hairline border + ivory mat on every tile, no zoom or lift on hover, and instead a highlighter line that traces the frame clockwise (Damian). Phones put captions below the photo in the mat, and a tap runs a quick trace before the viewer opens (Damian). **Gallery locked.**
- **Wow:** each photo "develops" from a blue halftone into full colour as it scrolls into view.
- **Viewer (Damian):** click opens a full-screen viewer expanding from the photo's spot; arrow keys / swipe for next, Esc or click to close.
- **More photos (Damian):** delivered 2026-10-26. There are 6 new originals, now in `assets/photography-originals/` (gitignored), for 10 in total. They go through `npm run optimize-photos` (EXIF/GPS stripped) before commit.
- **Halftone (Damian):** round electric-blue dots sized by tone, like a print screen, resolving into the full-colour photo.
- **Replay (Damian):** develops **every time** it scrolls into view; scrolling away returns it to halftone.
- **Photos, order and captions (Damian, 2026-10-26):** 10 photos (4 existing + 6 new), with captions chosen by Damian. Placement was curated by Claude for colour and day/night rhythm. The full table is in `design.md` → Lens.
- **Caption (Damian):** place + month as now (e.g. `Sigiriya, from Pidurangala · May 2026`) plus the frame number.

## Contact (wow #5)

- **Closing moment (Damian):** a small electric-blue tile scales up into a full-width card as you scroll in: big serif line, email + WhatsApp buttons.
- **Card colour (Damian):** electric blue with ivory text.
- **Growth (Damian):** scroll-scrubbed — expands as you scroll down, shrinks back as you scroll up.
- **Card content (Damian):** headline + email and WhatsApp buttons + the pulsing availability badge (`Available · 2026`) + social links (LinkedIn, GitHub, Instagram, Discord) + a live `Colombo · hh:mm` clock.
- **Headline (Damian):** "Got something in *mind*?" (chosen in the copy refresh over "Let's talk." and "Say hello.").

## Copy refresh

- **Do it now (Damian):** Claude drafts tightened copy for every section; Damian approves before build.
- **Audience (Damian):** freelance clients and recruiters equally (keep today's balance).
- **Voice (Damian):** same calm, slightly wry editorial voice, tighter; cut filler, fewer em-dashes.
- **Tooling (Damian):** run the drafts through `/no-ai-slop`.
- **Facts to include:** Damian is now in **second year** of the BSc (Hons) Computer Science at IIT; new upcoming projects (Interact District 3220, ai-studio); Aloys Travels URL change.
- Real copy only, no fake metrics.

## Phase 2 planning (2026-10-27)

- **Pin engine (Damian):** CSS `position: sticky` plus framer-motion `useScroll`, not GSAP ScrollTrigger. It works with Lenis as is and keeps GSAP out of the Home bundle (it stays lab-only).
- **Card decode (Damian):** a glyph-grid canvas over the card. Noise characters sweep in, then clear cell by cell to reveal the screenshot, and the sweep reverses on leave. It uses the same noise set as the hero.
- **Screenshots (Damian):** captured with Playwright at 1440×900 (top of page), with banners dismissed, and converted to WebP. This Portfolio is captured from the V3 hero in local dev, after the curtain. Damian sees the set before it is committed.
- **Merge (Damian):** `v3-phase-2` merges into `v3` locally, like Phase 1. No push.
- **Interact District 3220** returned 404 on 2026-10-27, which is consistent with its upcoming status.

## Phase 2 build rulings (2026-10-27)

- **Screenshot gate deferred, not skipped (builder).** The capture script is committed. The six WebPs stay uncommitted until Damian approves them.
- **Capture prep (builder):**
  - Aloys Travels' hero is a crossfading slideshow, so the capture waits for a slide change, then 2.5 s.
  - The portfolio shot hides the custom cursor and the Next dev badge.
- **Touch activation (builder):** devices ≥ 768 px without hover use nearest-to-centre activation in the strip too.
- **Intro copy now (builder):** "Six projects out in the world, two more on the way…" The old "one more in motion" contradicted the two upcoming cards.
- **Input modality (review fix).** Only keyboard focus scrolls the strip; a click's focus must not move the card away. A Tab press makes focus win over a parked mouse until the pointer moves.
- **Pin gated on JS (review fix).** It is gated on `html.js`, so no-JS visitors get the plain list.
- **The end card counts (builder).** It is a nearest-to-centre candidate, so centring it leaves no project card active, and focusing its link scrolls it into view.
- **Card links (review fix).** Each card link's description is its blurb (`aria-describedby`), so screen readers hear what the project is.
- **Review minors, all fixed at Damian's request (2026-10-27):**
  - The tags and blurb stay while the screenshot does, not only while the card is active.
  - Under reduced motion the skeleton stays under the screenshot, so a failed image still shows it.
  - The pointer hit-test stops while the track is off screen.
  - The track height comes from `STRIP.PIN_SCREENS` (a `--pin-track` custom property).
  - Heights are in `svh`, and the layout reads the sticky viewport's own height, so mobile toolbars don't re-lay out the strip.
  - An e2e test re-hovers mid-dissolve.
  - The decode never starts after unmount.
  - A touch on a fine-pointer device switches to nearest-to-centre until the mouse moves.
- **The EndCard still types into its React-rendered text node (builder).** That is the same idiom as `useScramble` in `Scramble.jsx`, and the domain never changes.
- **"Start a project" scrambles only its letters (Damian).** The arrow sits outside the scramble, like the hero's SERVICES arrow, so the button never changes width.
- **Screenshots approved (Damian, 2026-10-27).** All six are committed with no metadata. Phase 2 is merged into `v3` locally.
- **Lens fade test made load-proof (builder, after the merge).** The Phase 1 test `with the lens off the portrait stops measuring itself` assumed the lens finishes fading within 2 s. Under a busy parallel run it sometimes didn't, and the extra weight Phase 2 adds to Home made that show up. It now polls until the measuring stops (8 s cap). The behaviour it checks is unchanged.

## Phase 3 planning (2026-10-27)

- **Copy now (Damian):** Timeline, Lens and Contact switch to the approved `copy.md` text as they are rebuilt. Phase 4 covers the remaining sections.
- **Head Prefect entry (Damian):** the Timeline gets a new "2024–2025 · Head Prefect" entry at St. Joseph's College, Colombo 10, right after A-Levels.
- **Contact card start (Damian):** a small electric square under the § 08 label that grows right and down into the full-width card.
- **Lens develop (Damian):** timed, about 1.2 s once a tile enters view, replaying each time it comes back into view. *Superseded at the gate: the develop now follows scroll (see "Phase 3 gate fixes").*
- **Builder's calls:**
  - The Contact card grows by `clip-path`, so layout never reflows and the links are always in the DOM.
  - The Lens viewer is a modal dialog with a focus trap. It reuses the site's scroll lock (`body` overflow, as in `Nav`).
- **Plan approved (Damian, 2026-10-27).** He approved `plan-phase-3.md` as written and kept all three of its open calls: the Contact card grows by `clip-path`, the viewer reuses the `Nav` scroll lock, and the Head Prefect entry reads "Led the student body as Head Prefect in the year after my A-Levels." The build starts at Task 1.

## Phase 3 build rulings (2026-10-27)

- **Halftone tone (builder).** The plan's dot formula printed the night photos as solid blue slabs. Each photo is now auto-levelled (2nd–98th percentile), and the largest dot is 0.9 of a cell across, so dots stay round and separate. In dark mode the dots are sized by brightness, so the print reads as a positive on the navy field.
- **Viewer backdrop at 95%, not 90% (builder).** At 90% the nav read through and collided with "Close".
- **Viewer photo `sizes` (builder).** The 3:4 photo is height-bound on landscape screens, so `sizes` says about 62vh there rather than 92vw.
- **Viewer taps close on `pointerup` (review fix).** After a quick touch flick Chrome swallowed the next tap's click, and the viewer wouldn't close.
- **Touch trace keys off the tap (builder).** A tile shows the quick trace when the tap's `pointerType` is touch, rather than on a `(hover: none)` device.
- **Timeline stitch is CSS (builder).** A dashed gradient revealed by `clip-path` from one `--d` property, instead of an SVG line, so no-JS and reduced motion get the full thread from CSS alone. Entries no longer use `Reveal`, which hid them in server HTML; the light-up is the entrance.
- **Contact labels (builder).** The email button shows the address and WhatsApp says "WhatsApp"; arrows sit outside the scramble. The badge is built into the card, because `<Availability>`'s electric dot vanishes on it.
- **Contact growth reaches its end (review fix).** On screens taller than about 1100 px the page ended before the card's top reached 25% of the screen, so the card never opened. The growth now ends at the bottom of the page when that comes first.
- **Focus ring on the card (builder, keyboard pass).** The site's electric ring vanished on the electric card; there it takes the card's text colour, and the pill buttons stay round.
- **Review minors, all fixed (Damian's standing preference):** the caption overlay uses tokens; a resize repaints the halftone at once and resamples once it settles; a hero tile taller than the screen still develops; the Timeline re-measures whenever its list resizes; card text is full ivory, not dimmed.
- **Dark-mode card contrast:** open at build time (about 3.4:1 for the small labels). *Settled at the gate: the card keeps `#2563EB` in both themes (see "Phase 3 gate fixes").*

## Phase 3 gate fixes (2026-10-27)

- **The needle sat off the thread (Damian).** The rule and the thread were pinned by their left edge, so their centres sat 0.5 and 0.75 px right of the needle, dots and cross-stitches. Both are now centred on that axis. Test: "needle, thread and milestones share one axis".
- **The cursor hid behind the open viewer (Damian).** The custom cursor was `z-index: 70` and the viewer `z-100`; with the native cursor hidden, the pointer vanished over the photo. The cursor is now `z-index: 110`, above every layer. Test: "the custom cursor stays above the open viewer".
- **The Lens develop follows scroll (Damian).** The timed develop was a little buggy scrolling in and out; Damian asked for it linked straight to scroll, so photos uncure as you scroll back up. His answers:
  - **Effect:** keep the halftone develop (dots swell and fade, the photo fades in), scrubbed by scroll instead of the 1.2 s timer.
  - **Range:** starts as the tile's top enters the bottom of the screen; full colour when the tile's centre reaches the screen's centre. Every tile finishes, heroes included.
  - **Exit:** pure position. Above the screen a photo stays in colour; it only goes back to dots as it drops back toward the bottom.
  - **Feel:** exact, 1:1 with scroll (Lenis already smooths it), no spring.

  `scrollDevelop` in `lib/halftone.js` maps the tile's position to 0–1; `useDevelop` reads it once a frame on scroll and repaints only when it changes. The `IntersectionObserver`, the timer and `inView` are gone. Tests: the `scrollDevelop` unit tests; "the develop follows scroll both ways", "a photo above the screen stays in colour", "fast scroll leaves every tile matching its position".
- **The dot print sat slightly off the photo (Damian).** The photo was sampled into `ceil(W / 7)` cells stretched across the tile, but the dots were drawn on a fixed 7 px grid, so the print ran up to 7 px past the tile and drifted off the photo toward the right and bottom edges. `dotGrid` now gives cells that span the tile exactly, and the dots are drawn at the centres of the same cells the photo was sampled into. Test: "the dot grid spans the tile exactly".

  That was only part of it, and Damian still saw the offset. The main cause was the sample crop. With `srcset`, `img.naturalWidth` is the photo's CSS size (244 px for a single tile), not the size of the file the screen's density picked (256 px at 100% scaling, 384 px at 125–150%, 640 px at 200%). The crop was worked out in CSS units but applied to the file's pixels, so at 100% the print sat 6 px off, and at 150% it sampled only the top-left of the photo. My earlier screenshots ran at 200%, where it happened to look right. The crop is now worked out on a full-size `ImageBitmap` of the decoded file. Test: "the dot print registers with the photo", at 100% and 150% scaling. It correlates the print's dot density with the photo's darkness and requires the best match within 2 px.
- **Hydration error from a browser extension (Damian).** An extension in Damian's Chrome injected a `<script src="blob:…">` into `<head>` before React loaded. React skips unexpected nodes there unless it can mistake one for one of its own, so it compared the injected script with our JSON-LD script and reported a mismatch. The page now renders no scripts of its own in `<head>`. The theme script opens `<body>` (it still runs before anything paints), and the two JSON-LD blocks close it, escaped the way Next's JSON-LD guide does. Tests: "a script injected into <head> doesn't break hydration" (it injects after every script in `<head>`), and "structured data is still on the page".
- **The Contact card keeps `#2563EB` in dark mode (Damian).** The dark theme's brightened electric (`#3B82F6`) gave the card's light text about 3.4:1, below AA for the small mono labels and the body copy; within the token set, navy text reached only 4.49:1. Damian chose the light-mode electric for the card in both themes, the one place a colour sits outside the tokens (`dark:bg-[#2563EB]` in `Contact.jsx`). Ivory on it is about 4.8:1. The rest of the dark theme keeps `#3B82F6`. Test: "dark mode › card text passes AA on the card".
- **Lens resize test flake (builder).** Under full-suite load a resize step could outlast the 150 ms debounce and add one sample (11 against a cap of 10). The cap is now under 20, still well below the 50 an undebounced resize gives.

## Timeline circuit (2026-10-27)

Damian asked what could replace the running stitch. Five candidates were prototyped in `spike/timeline-rails.html` (decode rail, signal trace, circuit route, halftone thread, pinned year counter). He chose the **circuit with the year counter on the left**:

- **The trace (Damian):** an electric circuit-board track runs down the list with scroll and drains back on the way up. Between milestones it jogs out to a side lane with 45° bends, alternating sides; pads too close for a jog are joined straight. A small glowing square head rides its tip. The shape is `circuitPoints` / `traceAt` in `lib/timeline.js`.
- **Pads (Damian):** each milestone is a contact pad. When the current reaches it, the pad lights and glows, a short track draws out to the entry and ends in a small via, the year decodes and the text goes to full ink. Desktop shows tiny `P01`–`P10` labels left of the pads.
- **Current at rest (Damian):** bright dashes keep flowing along the lit trace even when you stop scrolling, but only while the section is on screen (an `IntersectionObserver` sets `data-flowing`).
- **Year counter (Damian):** the first year of the latest lit milestone, in large serif digits that roll like an odometer, sits under the § 05 label. Under it, the title decodes, then a `06 / 10` count.
  - **Caption is the title only (Damian).** The prototype repeated the year in small text.
  - **Two lines reserved (Damian).** A title that wrapped made the counter jump; the caption now always takes two lines of space.
  - **No progress bar (Damian).** With the circuit beside it, that was two progress bars on screen.
  - **Phones (Damian, on my suggestion):** a compact strip sticks under the header (80 px): year on the left, title and count beside it.
- **Fallbacks:** no JS gets a straight, finished electric line with every pad lit and no head or counter (the bends need measured positions). Reduced motion gets the finished circuit, every milestone lit, no head and no moving current; the counter switches instantly.
- **Builder's calls:** the trace's lit layer is revealed by CSS from `--d`, as the stitch was, and only the head is moved by JS. The pads, tracks and labels are HTML inside each entry, lit by default and kept dark only under `js:motion-safe:`. The counter is decorative (`aria-hidden`), since the list carries every year and title.
- **Open for Phase 4:** `design.md` has `/services` "How it works" reusing the Timeline's running-stitch thread. With the stitch gone, that needs Damian's call: reuse the circuit there, or something simpler.

## Phase 4 planning (2026-10-27)

Phase 4 is planned in [`plan-phase-4.md`](plan-phase-4.md). Damian's answers while planning:

- **"How it works" gets a mini circuit (Damian).** Its four steps sit in one column on the Timeline's circuit, with pads that light as you scroll and flowing current. This settles the open question in "Timeline circuit": the running stitch it was going to reuse is gone.
- **The page transition is its own phase (Damian).** It moves both pages to client-side navigation, so it touches routing, Lenis, the IntroStamp curtain and the hero portrait. It ships as Phase 5, after Phase 4, with its own review and gate.
- **The Skills terminal on phones types one folder at a time (Damian):** `ls tools/code/`, then `design/` and so on, stacked down the panel, at full size with no sideways scroll.
- **Résumé takes the optional fix (Damian):** "Education, coursework and current pursuits, on a single page."
- **Builder's calls in the plan, for Damian to confirm:**
  - The terminal's accent is `#60A5FA`, because neither electric token passes AA on navy.
  - The panel is navy in light mode and dark paper with a rule border in dark mode.
  - The terminal types once per load.
  - Leadership keeps today's rules.
  - The step numbers stay.
  - The recent-work cards activate like Projects.
  - `/services` metadata and Offer JSON-LD stay as they are, while the FAQ JSON-LD is built from the visible FAQ.

**Approved (Damian, 2026-10-27).** He approved the plan and its builder's calls as written. In the same message he added an SEO and GEO upgrade, so the call that `/services` metadata and Offer JSON-LD stay as they are no longer holds. Those changes come from the SEO/GEO audit, are listed in the plan as Task 11, and need his approval before they're built, because they change copy and claims.

## Phase 4 build and review (2026-10-27)

Builder's rulings while building, and the fixes from the fresh review (no Critical findings; every Important and Minor finding fixed):

- **The terminal types faster than the plan said:** 30 ms a command character, 6 ms an output character and 90 ms gaps, instead of 45/12/120. At the plan's speed the phone listing took over 6 s. Both layouts now finish in under 4.5 s (a unit test holds it).
- **The terminal's cursor is a drawn block, not "▍".** The mono face's latin subset has no block glyphs, so the character rendered as nothing.
- **The terminal shows four columns from `lg`, not `md` (review).** Between 768 and about 950 px the columns overlapped and the last one was clipped. Tablets get the folder-by-folder listing.
- **Nothing starts hidden without JS (review, partly pre-existing).** framer-motion server-renders every entrance's start state inline (`opacity:0`, or the hero name below its line mask), and the project cards hid their screenshot, tags and blurb with plain classes. Without JS, most of Home and `/services` was invisible, which is also true of the live site today. A `html:not(.js)` rule in `globals.css` shows inline start states, and a new `nojs:` variant covers the class-based ones. A test checks every text on `/`, `/services` and `/privacy` with JS off.
- **Share cards are static files (review).** HANDOFF's "DO NOT RE-BREAK" rule 2 forbids `opengraph-image` routes, because a dynamic one gave 502s behind nginx and PM2. The cards are `public/og.jpg` and `public/og-services.jpg`, wired through `lib/shareImages.js`, and HANDOFF rule 2 names both files. Footer B replaces HANDOFF rule 5 (`text-right` at all sizes).
- **No BreadcrumbList (review):** `/services` shows no breadcrumb, and the markup only states what the page shows. `alternateName: "DDC"` stays, since "DDC" is in the nav on every page.
- **The `/services` H1 kicker wraps at its dot on phones:** each half stays whole ("Freelance web designer ·" / "Colombo, Sri Lanka").
- **The FAQ's "+" is `aria-hidden`,** so each question's disclosure is named by the question alone.
- **The circuit completes by the bottom of the page** (`reachableEnd`) when its end offset is out of reach (Review Focus 5). It's shared by the Timeline and "How it works".
- **Only the Timeline and "How it works" pin (Damian, at the gate).** The other § labels (About on Home; § 01, § 03 and § 04 on `/services`) had `sticky` wrappers that only pinned where the label column spanned the section; they no longer pin at all. "How it works" is laid out like the Timeline: its label column spans the section, and under the § label the current step's title pins in large serif type, decoding as the current moves (Brief → Design → Build → Launch), with a "02 / 04" count (`components/services/StepCounter.jsx`, his pick of three mock-ups). Phones get it as a strip under the nav, like the Timeline's year counter.

## SEO and GEO (2026-10-27)

Damian added an SEO and GEO upgrade when he approved Phase 4. A five-part audit ran first; its summary and the work list are in [`seo-geo.md`](seo-geo.md). His answers:

- **Business name: "Damian De Cruz, trading as DDC Web Services" (Damian).** Home stays person-led and `/services` is the business page, which he asked to be curated to match:
  - The hero's identity block reads "DDC Web Services / by Damian De Cruz".
  - The title is "Web Design Services in Colombo | DDC Web Services".
  - The lead gains ", working as DDC Web Services".
- **Build scope (Damian):** technical and schema fixes; titles, descriptions and the `/services` H1; a privacy page with footer links; new share images. Prices and policies don't change.
- **Footer: option B from `spike/footer-mock.html`, centred on phones (Damian).** The three columns stay; the trading name sits under the © line, and Home · Services · Privacy sit under the tagline.
- **Spades Solutions is "Client design · not launched" (Damian).** He'll finish the site later.
- **No Google Business Profile (Damian):** he works online only, which Google's rules exclude.
- **Builder's calls:**
  - The `/services` H1 takes the kicker inside it, reading "Freelance web designer · Colombo, Sri Lanka", so the heading names the service and the place with no visual change. The kicker gains "web designer" for this.
  - No LocalBusiness or ProfessionalService markup, because Google requires a street address and the home address stays private. An Organization "DDC Web Services" carries the business instead.
  - FAQ data uses typographic apostrophes (’) throughout, so the visible FAQ and its JSON-LD stay identical.
- **Server-side items** (`www` → apex redirect, `server_tokens`, lab robots) are Damian's to apply on the VPS. They're listed in `seo-geo.md` without host details. He applied the `www` redirect and `server_tokens off` on 2026-10-27, and both check out (see `seo-geo.md`).

## Phase 1 review (2026-10-27)

- **No scramble on underlined links (Damian).** The nav links and "Services & pricing" already have the underline draw, so they don't also get the ASCII scramble. Only mono buttons scramble.
- **The cursor dot hides inside the lens (Damian).** The dot blended teal over the colour photo.
- **High contrast counts as static (spec).** Forced-colours mode gets the finished portrait, with no loader, idle animation or lens.
- **Curtain back, on every reload (Damian, supersedes "Loader frequency" below).** The live site's `IntroStamp` curtain stays on Home and plays on every load or reload. The portrait's ASCII wave plays as the curtain lifts, also on every load. The hero text floats in as on the live site; the letter decode on the kicker and name is dropped. Only Home ↔ `/services` navigation will use the glyph-dissolve transition, built in Phase 4 as planned.
- **Reduced-motion hydration fix rides with V3 (Damian).** `SplitLines`, `Parallax`, `Timeline` and `ScrollProgress` branched their markup on framer's `useReducedMotion()`, which differs between server and client. The hydration failure rebuilt the page and reset the theme. They now use the hydration-safe `lib/useReducedMotion.js`. The fix ships when `v3` merges to `main`, not as a separate hotfix.
- **A wave nobody can see is skipped (builder's call).** In a background tab or on a landing below the hero, the finished portrait shows instead.

## Builder review answers (2026-10-26)

- **Hero pieces (Damian):**
  - Kept: SERVICES button in its current spot (verified to clear the portrait), the sky-blue blobs, and the name at 13.5vw.
  - Removed: the "Currently" line and the scroll indicator.
- **Portrait placement (Damian):** bottom-anchored, nudged a little left, with responsive sizing. On scroll it drifts and fades with the hero.
- **Dark-mode orb (Damian):** dimmed, because it clashed with the blue glyphs.
- **Mobile SERVICES button (Damian):** shown full width under the lede.
- **Loader frequency (Damian):** first visit per browser session. Otherwise the 0.6 s transition plays and the portrait is already drawn.
- **Gallery photos (Damian):** more coming before Phase 3. They were delivered the same day, so the gallery is designed around the real set of 10.
- **Upcoming project cards (Damian):** generic skeletons, so no unreleased client design is published.
- **Builder's calls:**
  - Mobile Projects uses an alternating sideways offset instead of a tilted path.
  - The `/services` steps become one column for the thread.
  - Page transitions use client-side navigation with a persistent overlay.

## Builder's calls so far

- **Custom canvas renderer, not the `ascii-reveal` npm package.** The package is v0.3, three weeks old, single maintainer, and has no hooks for the palette, the lens, or dark mode.
- **Hero text stays in the server HTML** under the loader, so LCP is unaffected (see the 2026-07-18 perf pass: mobile LCP floor is fonts).
- **Reduced motion:** see Scope. The static final state is now specified per section.

## Status and next step (continue here)

As of the end of 2026-10-27, Phases 1, 2 and 3 and the Timeline circuit are built and merged into `v3` locally. Phase 4 is planned in [`plan-phase-4.md`](plan-phase-4.md) and waits for Damian's approval; the page transition is Phase 5. [`README.md`](README.md) has the full status, what each phase built, the next step, and how to test.

- **Approved:** Damian approved [`design.md`](design.md) on 2026-10-26. His later revisions are in "Phase 1 review (2026-10-27)" above; where they conflict with older entries, they win.
- **Next:** Damian approves `plan-phase-4.md` and answers its builder's calls (see "Phase 4 planning"). Then build it on `v3-phase-4` (native inline execution, one fresh reviewer at the end) and merge it into `v3` locally on his approval. Then plan and build Phase 5 (the page transition), then `v3` → `main`.
- **Superseded:** "Loader frequency" (first visit per session) is replaced by the curtain on every reload. The page transition still covers Home ↔ `/services` navigation, but not reloads.
- **Builder's calls, all 10 confirmed by Damian on 2026-10-26** with the design approval (they are listed in `design.md`):
  1. Custom canvas renderer for the portrait, not `ascii-reveal`.
  2. Client-side page transitions with a persistent overlay, which also cover links like `/#work`.
  3. Mobile Projects uses an alternating sideways offset.
  4. `/services` "How it works" becomes one column.
  5. Project screenshots are WebP captures at 1440×900.
  6. Keyboard focus decodes a project card, and Enter opens the site.
  7. The timeline thread runs on the left edge on mobile.
  8. Nav, scroll progress bar and footer keep their current form.
  9. Lighthouse mobile scores show no regression against `main` (measured on production builds).
  10. If photos are late, Timeline and Contact come before the Lens. This is moot now that the photos are in.
