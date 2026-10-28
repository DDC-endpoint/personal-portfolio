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
- http://localhost:3200/strip-carousel.html: Phase 6 candidates for the home Selected Work strip (2026-10-28): A only the end changes, B carousel rhythm (chosen, at 40vw with depth of field and scroll smoothing), C dwell + glide, D depth tunnel, E a mix. `#B` links straight to one. Needs `proj/` (below).
- http://localhost:3200/portfolio-page.html: Phase 6 `/portfolio` as Damian chose it (compact hero, grid with filters, Grid | List morph, and the animations he picked: scroll-through preview, address bar typing, upcoming build loop, row-by-row entrance, live pulse). Needs `proj/` and the full-page captures in `proj/full/` (made by a throwaway capture script; the build adds a full-page mode to `npm run capture-projects`).
- http://localhost:3200/loader-curtain.html: Phase 6 first-load morph loader and the curtain page transition (presets: Damian's, Crafted, Lab faithful; the full load, the short reload and page changes between four mock pages). Needs `proj/portrait.webp` (`cp public/hero/portrait.webp docs/v3/spike/proj/`).

`cutout*.png`, `cutout*.jpg`, `gal/` and `proj/` are gitignored. Don't commit them here; the production copies go through the normal image pipeline.

## Controls

The control bar lets you replay the loader, toggle dark mode, and compare the cell size, "mystery" level, lens radius and style. The locked values are cell 4, mystery 0, lens 120, glyphs, light/dark both supported. The lens in the spike is drawn on the canvas; in production the site cursor's ring expands into it (see the spec).
