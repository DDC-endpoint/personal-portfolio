# Portrait spike (throwaway)

The prototype used to settle the hero portrait. It is reference material for `../hero-portrait.md`, not production code.

## Run it

From the repo root (needs `sharp`, a repo dependency):

```bash
# 1. Cutout for the portrait, from the original headshot (kept outside git)
node docs/v3/spike/process-headshot.cjs "/path/to/Professional Young Man’s Studio Headshot.png" docs/v3/spike

# 2. EXIF-free web copies of the 10 gallery photos (reads public/photography/ + assets/photography-originals/)
node docs/v3/spike/make-gallery-copies.cjs

# 3. Serve this folder (canvas pixel reads need http, not file://); PORT=3201 to change the port
node docs/v3/spike/serve.cjs
```

Then open:

- http://localhost:3200/portrait-spike.html: the portrait on its own, with controls.
- http://localhost:3200/hero-live.html: the portrait inside a replica of the live hero (nav, SERVICES button, blobs, scroll drift, mobile order, dimmed dark-mode orb).
- http://localhost:3200/gallery-mockup.html: the locked Lens gallery (compact mixed grid, framed tiles, tracing highlighter, mobile captions under the photo).
- http://localhost:3200/timeline-rails.html: candidates to replace the Timeline's running stitch (2026-10-27), with the current stitch as `0 Now`. The bar at the bottom switches between them: 1 decode rail, 2 signal trace, 3 circuit route, 4 halftone thread, 5 pinned year counter. `+ Year` adds the counter to any rail, and `Dark` flips the theme. `?v=0..5&y=1` links straight to one.
- http://localhost:3200/strip-carousel.html: Phase 6 candidates for the home Selected Work strip (2026-10-28): A only the end changes, B carousel rhythm (chosen), C dwell + glide, D depth tunnel, E a mix. `#B` links straight to one. Superseded by `home-curation.html` for the final look.
- http://localhost:3200/home-curation.html: **Phase 6 Home as approved**: the four-page nav, the hero without the SERVICES button, and § 04 as a carousel of Damian's five sites (Aloys, Danella, Kahatagaha, Spades, Dashboard) at 40vw, with depth of field (sharp within ±20vw, then a ramp), scroll smoothing, no settle, and the centred card decoding from its real skeleton. The skeletons are `home-skeletons.js`, rendered from `components/projects/skeletons.jsx` (re-render them if those change). The bottom-right controls are the sharp zone, settle, reduced motion and dark.
- http://localhost:3200/portfolio-page.html: **Phase 6 `/portfolio` as approved**: compact hero, grid with filters, Grid | List morph, and the animations Damian picked (scroll-through preview, address bar typing, upcoming build loop, row-by-row entrance with no decode, live pulse).
- http://localhost:3200/loader-curtain.html: **Phase 6 loader and curtain as approved**: the "Damian's" preset (centre-out, liquid edges, edge light on, shadow always, lab speed, ivory/mist, the loader riding the middle panel, no tension, the mono label). "Crafted" and "Lab faithful" are the compared alternatives. Run the full load, the short reload, and page changes from the mock nav.

**Set up `proj/` for the Phase 6 spikes** (gitignored copies of public images, plus full-page captures):

```bash
mkdir -p docs/v3/spike/proj
cp public/projects/*.webp public/hero/portrait.webp docs/v3/spike/proj/
node docs/v3/spike/capture-full.mjs   # writes proj/full/; "portfolio" needs npm run dev
```

`cutout*.png`, `cutout*.jpg`, `gal/` and `proj/` are gitignored. Don't commit them here; the production copies go through the normal image pipeline.

## Controls

The control bar lets you replay the loader, toggle dark mode, and compare the cell size, "mystery" level, lens radius and style. The locked values are cell 4, mystery 0, lens 120, glyphs, light/dark both supported. The lens in the spike is drawn on the canvas; in production the site cursor's ring expands into it (see the spec).
