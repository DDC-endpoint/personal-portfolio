# Research — reels and references

Sources Damian shared on 2026-10-26 to steer V3. Reels were captured frame-by-frame (every 0.5 s at 2×, plus captions) and reviewed at near full resolution. Media files are not kept in the repo; these notes are the record.

## Instagram reels

Links: `De2OoUexGU_`, `DeQO86WO9l5`, `DewmsCTtljp`, `DevrrJ4jvAK`, `DezWwSChYob`, `De9A5RAyQRF` (all `https://www.instagram.com/p/<id>/`).

## R1 De2OoUexGU_ — quanhoang.ux "ascii-reveal" v0.3 (open source lib) — 20s
- Site for lib: `ascii-reveal` v0.3 · open source. Hero copy "...skeleton loader ...to death." w/ blurred liquid-blob 3D shape (pink/black/cream).
- API: `import { AsciiReveal } from "ascii-reveal"`; `<AsciiReveal preset="decode"> <ProfileCard/> <Gallery items={prints}/> </AsciiReveal>` — "Wrap any subtree. Text, images and canvases inside it reveal in one wave."
- Demo controls: origin `Center | Corner | Cursor`, SPEED slider; mode toggle `Skeleton + reveal | Skeleton only`; REVEAL presets `Decode | Dither | Terminal | Blueprint`.
- Section "LOADING STATES — +1000 aura per loading state." (maroon/plum accent on "+1000").
- Look of loading state: cards (Profile 520×455, Now playing 480×170, Story 480×260, Event 440×445 — dims labelled above each in tiny mono) on warm off-white dotted-grid canvas. Skeleton = monochrome halftone/dither CHARACTER BLOCKS (grey ascii-ish cells, bars for text lines, circles for avatars), shimmering. Then a wave sweeps across: cells resolve dark->light then into real content (image, text, buttons). Image areas resolve from coarse dither -> full color photo. Text lines: dithered bars -> real text. Avatars -> real.
- Interaction after reveal: Follow -> "✓ Following" pill; Join call -> green "In call · 0:00" timer ticking.
- Halloween: ASCII-art mascots (spider/ghost/pumpkin rendered in ascii glyphs, pumpkin in orange glyphs) as the skeleton; then numbers "decode" (digits scramble 01147 -> 4,617) and ascii art scatters/dissolves into the real stat card. `mascot="spider"` prop. Glyphs disperse like particles on resolve.
- Timing: individual card reveal ≈ 0.8–1.5s; wave direction visible (left->right / from origin).

## R6 De9A5RAyQRF — avi_vashishta29 "GitHub Chart X Portfolio" — 20.6s
Real GitHub contribution data, one API call, one canvas, zero libs. White page, serif section titles ("As a city", "Week by week", "Round the year", "The streak", "In the terminal"), tiny mono captions, "How this page was made" link bottom-left, "↻ Replay" bottom-right per chart.
1. Classic grid: rounded squares drop in column by column L->R, trailing columns fading/scaling in (diagonal shimmer edge); big serif counter ticks 83 -> 8,464 "contributions in the last year".
2. As a city: isometric 3D bars, each day a building, heights=commits, rise L->R as a wave; light->dark green by intensity.
3. Week by week: weekly-total sparkline draws on top; under it, squares "pour" down a curve into the grid (each week's column falls into place, ramp shape at leading edge).
4. Round the year: radial clock — calendar wrapped into a ring (rings=weekdays, spokes=weeks), sweep hand rotates clockwise filling cells; centre "169d streak", side counter 217 -> 8,546.
5. The streak: big serif "Day N" counter 1 -> 169 ticking; a needle/thread stitches through streak cells L->R lighting them dark green; grey cells before; red × marks last day off ("LAST DAY OFF: 9 MAY 2026").
6. In the terminal: `avi@github ~ $ ./contributions.sh` types out; grid scrambles in random ASCII glyphs ($#@<>/+=) then settles column-by-column into 5 shade glyphs (: + # @) per day, green; footer types "8,546 contributions · 169 day streak · best day 128".
Takeaways: data-honest motion, serif counters, ASCII-glyph shading (ties to R1), per-section Replay.

## R2 DeQO86WO9l5 — millee.md "20 crazy Claude animation styles (that you can steal)" — 33.8s
Talking head; a small card (badge #N) shows each style ~1.5s. Comments ask for "Plugin" (likely a Claude skill/plugin). Commenter favourite: comic book + blueprint.
1 Particles (purple field → radial starburst) · 2 Liquid morph (iridescent metaballs merging/splitting) · 3 Holographic (rainbow twisted torus) · 4 Neon glow (NEON sign + receding neon frames) · 5 Wireframe 3D (blue wire torus knot over perspective grid floor) · 6 Glassmorphism (frosted widgets over moving colour blobs, live step counter) · 7 Kinetic type (stacked outline MAKE/IT/MOVE, one solid row, colour-flip per word) · 8 Isometric (voxel city building up) · 9 Clay 3D (sphere/cube/torus bobbing, soft shadows) · 10 ASCII art (green terminal glyph-rendered rotating torus) · 11 Gradient mesh (fluid noise blobs) · 12 Comic book (halftone burst, WHOOSH! bubble, MEANWHILE... CLAUDE CODE!) · 13 Split-flap (DEPARTURES board scrambles to MAKE IT MOVE, "GATE C · ON TIME") · 14 Retro VHS (synthwave sun, PLAY ▶ REC, tracking noise) · 15 Halftone (red/blue dot-shaded 3D shapes on cream) · 16 Bauhaus (geometric tiles rotating/shuffling) · 17 Pixel art (8-bit runner, COINS x07) · 18 Blueprint (blue grid, gears draw on with dimension lines "Ø 124", "GEAR TRAIN DWG A-01 1:2") · 19 Art deco (gold sunburst lines draw, DECO) · 20 Neo-brutalism (SHIP IT., CLICK ME, 98% FASTER, stickers drop in with hard shadows).
Relevance: a vocabulary menu. Fits Damian's existing light-blue + mono/serif direction best: ASCII art, Blueprint, Split-flap, Halftone, Wireframe 3D, Kinetic type. (Blueprint also a preset in R1.)

## R3 DewmsCTtljp — textura.us "How I build sites like these in 5 minutes" (promo for getlayers.ai prompt library) — 22.3s
Showcases two generated sites:
A) "Relay" (dark SaaS, lime #d4f57a-ish accent, serif italic emphasis words: "The handoffs run *themselves*.", "*Boring* in the ways that matter.", "A *Tuesday*, seen from Relay.", "Numbers we did *not* have to explain away.", "You pay for runs, not *for seats*.").
 - PRELOADER: full-screen lime panel with a small dark rounded »» logo tile; panel collapses INTO a glowing lime logo tile that sits mid-hero then fades → site revealed (0.1–1.1s). i.e. preloader = logo that shrinks/morphs into place.
 - Hero: workflow node-graph card (branches "Amount over 5000", "Ask finance", "Log to warehouse") with live run log rows; an aurora light-streak (green/teal/blue ribbons) sweeps through on load and persists as a scroll-driven background that moves between sections.
 - Section transitions: headings DECODE/scramble in (mono glitch chars resolving), dimmed text resolves per line ("One canvas, every branch").
 - CTA: small lime rounded tile scales up into a full-width lime card ("The best workflow is the one *nobody mentions* in standup." + »» button) — box-grow transition with glow + stacked green offset edges.
 - Data sections: isometric bar stacks per weekday, counters (36,304 / 4 / 15%) ticking, ring % chart, pricing slider w/ live $ value.
B) "Brewns" coffee one-pager (threejs/nextjs tags): digit preloader "033" counting; hero "COFFEE FOR YOUR *moment*" with RGB/motion-smear text glitch on entry; 3D cup + bag product renders; listing page lists interactions ("drawn cup fills and pours away to open the page, bag and cup stand in a lit studio you can grab and spin, four product cards lean toward your hand, iced latte turns on a clock face as you scroll, beans drift weightless, thermal printer feeds receipt").
getlayers.ai/templates gallery: dense masonry of cinematic dark/blue site thumbnails, hover lift — "Immersive website prompts", filters (Templates, 3D Scenes, Sections, Backgrounds, Gradients; Tone, Industry chips).
Takeaways for V3: logo-morph preloader, scramble/decode headings, serif-italic emphasis words (Damian already does this), number counters, CTA box-grow, ambient scroll-linked light ribbon.

## R4 DezWwSChYob — textura.us, same promo template as R3, different showcase site — 22.3s
Site "HELD-MINT" (card-custody/NFT vault, Zug). Dark navy + electric blue, condensed heavy italic display type, graffiti-script accent words ("STEEL", "VAULT", "HELD", "RECORD", "STUFF") with paint-drip edges; chrome barbed-wire 3D dividers.
 - PRELOADER: counter 062 -> 100 with thin blue progress line; trading cards fan in tilted 3D behind it, a "SEALED" stamp hits; then hero assembles (vault door w/ cards).
 - Process cards 01–04 (Acquisition/Authentication/Custody/Registry) slide in staggered; giant faded outline word ("PROCESS", "VAULT", "RECORD", "ASK") parallax behind headings.
 - Card carousel: 3D fanned cards, centre card raised, hover tilt; shelf label below "SHELF A-04 · RED HYPE APE · VALUE $58,000".
 - Featured drop: white panel framed by 3D barbed wire, card slides in.
 - Stats: tilted sticker-like stat blocks ($48.6M, 12,480, 4x) + circular badge "0"; ledger table rows w/ rubber "SEALED/CLOSED" stamps slamming in.
 - FAQ accordion "ASK US THE HARD STUFF".
Remaining 3–17s identical to R3 (getlayers gallery, copy prompt, Brewns build).
Takeaways: counter preloader w/ progress line, giant ghost words behind headings, stamp-slam micro-interaction, staggered numbered process cards.

## R5 DevrrJ4jvAK — ikramrana.ai, promo of github.com/juliobsz/skills "/awwwards" agent skill — 24.3s
Talking head over the README; no site motion shown except README demo video thumbs comparing `/frontend-design` vs `/awwwards` outputs (Seven layers keyboard exploded-isometric; "STEM", "SPRING", "HOUSING", "THE POINT" — isometric exploded mechanical part figures on grey).
README method ("Why"): avoids default "purple gradient, three cards, elevate your brand". Process: Brief (infer who/what, missing facts become written assumptions) → Concept (3 ideas from different territories: your name, your craft's materials, a formal system; scored on originality+fit) → Art direction (palette by role, curated free fonts, grid + motion language written to DESIGN.md, tested vs a "genericness check") → Build (GSAP, Lenis, WebGL/OGL "where they earn their place, with ONE signature moment and everything else quiet"; real copy, no lorem/fake metrics) → QA (production build, crawl audit, real-browser screenshots desktop+mobile+reduced-motion, scored against rubric until every category ≥ 8/10). Companion skill `wheresryan22/anatomy`: interactive isometric exploded figures explaining a thing as a physical object ("how it works" section).
Relevance: process + rubric to apply to V3 (one signature moment = ASCII portrait; everything else quiet; reduced-motion parity; same stack Damian already uses: GSAP, Lenis, OGL, framer-motion).

## ASCII portrait reference video (WhatsApp video, 11.3 s)

Shared to show **the ASCII image style only** — not the layout or the rest of the site (Damian was explicit about this).

- A portfolio hero ("d/c." logo, "Good code. Better experiences.", huge sans "Damian de Cruz." across the bottom) with a large head-and-shoulders portrait rendered as a fine dot/character matrix, three-quarter view turned to the right.
- At rest the figure is a "mysterious silhouette": strong outline, faint interior, on a faint full-page dot grid.
- Hover reveals a patch of larger, stronger code characters (`1 0 0 > < / : .`) that trails and fades behind the cursor — "larger characters, stronger reveal, visibly distinct from the mysterious silhouette".
- Dark mode: royal-blue background with light-blue glyphs.
- Footer meta row: `ALL ASCII </>`, mouse readout, `Colombo hh:mm`; a "+ Move to see the source" hint.

What V3 took from it: the idea of a fine glyph portrait. What it did **not** take (tried, rejected): the layout, the silhouette-only "mystery" look, the hero-wide trail, the dot style, the page texture. See `decisions.md`.
