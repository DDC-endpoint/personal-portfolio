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

`cutout*.png`, `cutout*.jpg` and `gal/` are gitignored. Don't commit them here; the production copies go through the normal image pipeline.

## Controls

The control bar lets you replay the loader, toggle dark mode, and compare the cell size, "mystery" level, lens radius and style. The locked values are cell 4, mystery 0, lens 120, glyphs, light/dark both supported. The lens in the spike is drawn on the canvas; in production the site cursor's ring expands into it (see the spec).
