# Portrait spike (throwaway)

The prototype used to settle the hero portrait. It is reference material for `../hero-portrait.md`, not production code.

## Run it

```bash
# 1. Produce the cutout from the original headshot (kept outside git).
#    Needs sharp: run from the repo root so it resolves from node_modules.
node docs/v3/spike/process-headshot.cjs "/path/to/Professional Young Man’s Studio Headshot.png" docs/v3/spike

# 2. Serve the folder (canvas pixel reads need http, not file://).
node docs/v3/spike/serve.cjs            # PORT=3201 to change the port

# 3. Open http://localhost:3200/portrait-spike.html (portrait on its own) or http://localhost:3200/hero-live.html (portrait inside a replica of the live hero, with nav, SERVICES button and blobs)
```

`cutout.png` and `cutout-preview.jpg` are gitignored. Don't commit them here; the production copy goes through the normal image pipeline.

## Controls

The control bar lets you replay the loader, toggle dark mode, and compare the cell size, "mystery" level, lens radius and style. The locked values are cell 4, mystery 0, lens 120, glyphs, light/dark both supported. The lens in the spike is drawn on the canvas; in production the site cursor's ring expands into it (see the spec).
