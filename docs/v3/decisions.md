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

- Portrait in the **right column**; hero copy stays on the left **exactly like the current site** (kicker, DAMIAN / *de* CRUZ., lede, corner metadata).
- Rendered as **ASCII glyphs**, full face visible at rest (no "mystery" silhouette), finest grid (cell 4), **mono electric blue** (`#2563EB`).
- **Bottom and shoulders fade out** (strong fade, starting around chest level) so it doesn't end abruptly.
- **Loader:** the ASCII wave reveals the whole hero (~2.4s) and replaces today's intro curtain.
- **Idle:** slow scan band every 6s + sparse character flicker.
- **Hover:** the site's existing cursor (ring + dot) expands into a **lens** showing the **full-colour photo**, radius ~120px (about 40% on the prototype slider). Thin ring + small `x · y` coordinates; no scrambled edge.
- **Touch:** drag on the portrait moves the lens.
- **Mobile order:** kicker → name → portrait → lede.
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
- **Upcoming cards:** no links until live. Shown as skeletons that never decode; on hover they scramble and stay skeletons with a "loading… 2026 →" label. When a site launches, flip its status to live and it gets the full treatment.
- **Skeleton previews (Damian):** traced from each site's real layout (screenshot the live site, hand-trace nav/hero/cards/footer as a skeleton in the blue palette), so each is recognisable.
- **Motion (Damian):** section pins; scrolling drives a tilted strip of previews diagonally across the viewport (~3 screens of scroll), then releases. Mobile: normal vertical stack with the same tilt.
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

## Lens — photo gallery (wow #4)

- **Layout (Damian):** editorial asymmetric grid — photos at mixed sizes on an offset grid like a magazine spread, each with a mono caption + date.
- **Wow:** each photo "develops" from a blue halftone into full colour as it scrolls into view.
- **Viewer (Damian):** click opens a full-screen viewer expanding from the photo's spot; arrow keys / swipe for next, Esc or click to close.
- **More photos (Damian):** Damian will add more; design the grid for 6–10 photos. New originals go in `assets/photography-originals/` and through `npm run optimize-photos` (EXIF stripped) before commit.
- **Halftone (Damian):** round electric-blue dots sized by tone, like a print screen, resolving into the full-colour photo.
- **Replay (Damian):** develops **every time** it scrolls into view; scrolling away returns it to halftone.
- **Caption (Damian):** place + month as now (e.g. `Sigiriya, from Pidurangala · May 2026`) plus the frame number.

## Contact (wow #5)

- **Closing moment (Damian):** a small electric-blue tile scales up into a full-width card as you scroll in: big serif line, email + WhatsApp buttons.
- **Card colour (Damian):** electric blue with ivory text.
- **Growth (Damian):** scroll-scrubbed — expands as you scroll down, shrinks back as you scroll up.
- **Card content (Damian):** headline + email and WhatsApp buttons + the pulsing availability badge (`Available · 2026`) + social links (LinkedIn, GitHub, Instagram, Discord) + a live `Colombo · hh:mm` clock.
- **Headline:** decided in the copy refresh (Claude drafts options; "Let's talk." is one of them).

## Copy refresh

- **Do it now (Damian):** Claude drafts tightened copy for every section; Damian approves before build.
- **Audience (Damian):** freelance clients and recruiters equally (keep today's balance).
- **Voice (Damian):** same calm, slightly wry editorial voice, tighter; cut filler, fewer em-dashes.
- **Tooling (Damian):** run the drafts through `/no-ai-slop`.
- **Facts to include:** Damian is now in **second year** of the BSc (Hons) Computer Science at IIT; new upcoming projects (Interact District 3220, ai-studio); Aloys Travels URL change.
- Real copy only, no fake metrics.

## Builder review answers (2026-10-26)

- **Hero pieces (Damian):**
  - Kept: SERVICES button in its current spot (verified to clear the portrait), the sky-blue blobs, and the name at 13.5vw.
  - Removed: the "Currently" line and the scroll indicator.
- **Portrait placement (Damian):** bottom-anchored, nudged a little left, with responsive sizing. On scroll it drifts and fades with the hero.
- **Dark-mode orb (Damian):** dimmed, because it clashed with the blue glyphs.
- **Mobile SERVICES button (Damian):** shown full width under the lede.
- **Loader frequency (Damian):** first visit per browser session. Otherwise the 0.6 s transition plays and the portrait is already drawn.
- **Gallery photos (Damian):** more coming before Phase 3.
- **Upcoming project cards (Damian):** generic skeletons, so no unreleased client design is published.
- **Builder's calls:**
  - Mobile Projects uses an alternating sideways offset instead of a tilted path.
  - The `/services` steps become one column for the thread.
  - Page transitions use client-side navigation with a persistent overlay.

## Builder's calls so far

- **Custom canvas renderer, not the `ascii-reveal` npm package.** The package is v0.3, three weeks old, single maintainer, and has no hooks for the palette, the lens, or dark mode.
- **Hero text stays in the server HTML** under the loader, so LCP is unaffected (see the 2026-07-18 perf pass: mobile LCP floor is fonts).
- **Reduced motion:** no loader wave, no idle animation, no lens; the portrait renders static. Exact behaviour per section still to specify.

## Open questions (continue here)

Section design is settled as of 2026-10-26. Remaining:

- **Copy drafts** for every section on Home and `/services` (then `/no-ai-slop`, then Damian's approval). Written to `docs/v3/copy.md`, current vs proposed side by side.
- Then: consolidate into `docs/v3/design.md`, independent builder review, Damian's approval, implementation plan.

Builder's calls not yet confirmed by Damian (flag in the design doc): timeline mobile layout keeps the thread on the left edge; nav, scroll progress bar and footer keep their current form apart from the shared label/hover upgrades; performance budget = no regression on the current Lighthouse mobile scores (mobile LCP floor is fonts); Instagram link stays under the gallery.
