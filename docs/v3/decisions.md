# V3 decision log

Every decision made in the V3 design conversation (2026-10-26), with the reason where one was given. "Damian" = decided by the site owner. "Builder's call" = proposed by Claude and not objected to; open to change.

## Intent

- **What V3 is:** keep the existing style and visual direction (light blue palette, Instrument Serif + JetBrains Mono + Manrope, bold motion) and completely upgrade transitions, animations, loaders and content grids; review the whole design; refresh the copy.
- **The first ten seconds (Damian):** visitors should be mesmerised and think "I wonder what more this site has to offer", then scroll and see how well designed and clean a website can be. Two beats: a hook, then proof of craft.
- **Wow moments:** not a single signature moment. Five sections get a wow moment; the rest stay quiet but polished.

## Scope

- **Pages (Damian):** Home and `/services` get V3. `/services` gets the quiet-section treatment, not its own wow moments. The lab (lab.damiandc.com) is untouched.
- **Five wow sections (Damian):** Hero, Projects, Timeline, Lens (photo gallery), Contact.
- **Quiet sections:** About, Leadership, Skills, Resume. They get the upgraded motion vocabulary (headings that decode/scramble in, number counters where real numbers exist, cleaner grids) but no spectacle.
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

## Timeline (wow #3)

- **Motion (Damian):** a needle stitches down. As you scroll, a thin thread draws down the timeline; each milestone lights up as the needle passes and its year decodes from scrambled digits.
- **Content:** add a "Began second year" entry — Damian is now in second year.

## Lens — photo gallery (wow #4)

- **Layout (Damian):** editorial asymmetric grid — photos at mixed sizes on an offset grid like a magazine spread, each with a mono caption + date.
- **Wow:** each photo "develops" from a blue halftone into full colour as it scrolls into view.
- **Viewer (Damian):** click opens a full-screen viewer expanding from the photo's spot; arrow keys / swipe for next, Esc or click to close.

## Contact (wow #5)

- **Closing moment (Damian):** a small electric-blue tile scales up into a full-width card as you scroll in: big serif line, email + WhatsApp buttons.

## Copy refresh

- **Do it now (Damian):** Claude drafts tightened copy for every section; Damian approves before build.
- **Audience (Damian):** freelance clients and recruiters equally (keep today's balance).
- **Voice (Damian):** same calm, slightly wry editorial voice, tighter; cut filler, fewer em-dashes.
- **Tooling (Damian):** run the drafts through `/no-ai-slop`.
- **Facts to include:** Damian is now in **second year** of the BSc (Hons) Computer Science at IIT; new upcoming projects (Interact District 3220, ai-studio); Aloys Travels URL change.
- Real copy only, no fake metrics.

## Builder's calls so far

- **Custom canvas renderer, not the `ascii-reveal` npm package.** The package is v0.3, three weeks old, single maintainer, and has no hooks for the palette, the lens, or dark mode.
- **Hero text stays in the server HTML** under the loader, so LCP is unaffected (see the 2026-07-18 perf pass: mobile LCP floor is fonts).
- **Reduced motion:** no loader wave, no idle animation, no lens; the portrait renders static. Exact behaviour per section still to specify.

## Open questions (continue here)

- Projects: strip angle, card size/aspect, how many cards visible at once, screenshot capture process, what shows on the card before hover, keyboard access.
- Timeline: needle style (thread vs line), whether years decode on scroll-back, mobile layout.
- Lens gallery: how many photos (currently 4; more coming?), halftone style, caption content, Instagram link placement.
- Contact: the headline line itself, what's on the card besides email + WhatsApp, behaviour on mobile.
- Quiet sections: which exact motions per section; whether Skills/Leadership grids change shape.
- `/services`: which upgrades apply there.
- Reduced motion and performance budget for every wow section.
- Copy drafts for every section (then `/no-ai-slop`, then approval).
- Visual details still unsettled: cursor behaviour elsewhere on the page, scroll progress bar, nav.
