# Hero ASCII portrait — locked spec

Settled with Damian on 2026-10-26 through a series of live prototypes. The reference implementation is [`spike/portrait-spike.html`](spike/portrait-spike.html); every number below comes from that file. It is a throwaway prototype — port the behaviour, not the code structure.

## Layout

Verified against the live hero at 1440×900, 1280×720 and 1024×768 and on mobile. The reference is [`spike/hero-live.html`](spike/hero-live.html).

- **Stays as today (Damian):**
  - the nav;
  - the corner metadata: coordinates top-left, and `(001) Index / Landing` top-right;
  - the **SERVICES → button in its current place** under `(001)`. At 1440×900 it sits in the empty top-right corner of the portrait stage, beside the head, and doesn't overlap the face;
  - the mono kicker;
  - the name at today's **13.5vw**, which still fits the left side because "DE CRUZ." spans about 41vw;
  - the lede, with copy per `copy.md`;
  - the sky-blue blur blobs.
- **Removed (Damian):** the "Currently — learning, shipping, breaking things." line and the "scroll" indicator.
- **Portrait stage:**
  - Absolutely positioned in the hero and **anchored to the bottom edge**, so it rises out of the page.
  - Horizontal position: `right: calc(40px + 5vw)`, shifted a little left of the edge (Damian).
  - Width: `min(40vw, 72vh, (100vh − 190px) × 0.8)`, at 4:5. The height cap keeps the label clear of the 80 px nav on short screens.
  - At ≤1100 px wide: `right: 40px` and width up to `38vw`, so it doesn't crowd the name.
- **Label:** a small mono `PORTRAIT · {cols} × {rows} CELLS` at the top-left of the stage. Kept by Damian.
- **On scroll (Damian):** the portrait drifts and fades with the rest of the hero, as the text does today: y goes from 0 to −100 px across the hero's height, and opacity reaches 0 at 80%.
- **Dark-mode orb (Damian):** the sky blob behind the portrait clashed with the blue glyphs. Drop it from `dark:bg-sky/40` to about `dark:bg-sky/15`, and make the mist blob slightly darker.
- **Mobile (≤760px):** one column in this order:
  - kicker
  - name
  - portrait, centred, width `min(86vw, 60vh)`
  - lede
  - a **full-width electric SERVICES → button**. This is new; the button is hidden on mobile today (Damian).

## Source image

- Source: the ChatGPT-edited studio headshot Damian supplied ("Professional Young Man's Studio Headshot.png", 1121×1403, no EXIF): navy suit, light-blue shirt, navy tie, flat light-grey background, no logos/pins. The original file stays **out of git**.
- Processing (script: [`spike/process-headshot.cjs`](spike/process-headshot.cjs)):
  1. Scale the **full photo width** to 92% of an 800×1000 frame (scale ≈ 0.6566 → 736×921), centre horizontally (x = 32), top offset 31 px. This keeps **both shoulders inside the frame**; the photo's own cut edges land in the fade zone.
  2. Slight contrast: `linear(1.1, -10)`, saturation ×1.05.
  3. Background key: take the median colour of the top corners; flood-fill from the frame border through pixels within RGB distance **22** of it. The shirt/collar area (original-photo coords x 432–719, y > 666) is never keyed, because the light-blue collar is close to the background grey.
  4. Feather the mask with a 1.2 px blur. Output a transparent PNG.
- Publishing the processed cutout (EXIF-free) in the public repo is **approved by Damian**. Verify no EXIF before committing.

## Rendering — glyph grid

- Canvas covers the stage; DPR capped at 2.
- **Glyphs, not dots.** Font: JetBrains Mono, size `cell × 1.5`, weight 700 when `cell ≤ 5`.
- **Cell = 4** (the finest setting, Damian's choice). Cell width `font × 0.6`, row height `font × 0.92` (tight rows give the eyes and mouth more vertical detail).
- **Ramp (light → dense):** `" .·:;-=+*#%@"`. Glyph index = `round(d^1.35 × 11)`, so heavy glyphs (`#%@`) only appear in the deepest shadows. A 70-step ramp was tried and rejected (the face read as a wall of letters).
- **Sampling:** 3×3 supersampling per cell for luminance and alpha. Cells with alpha < 0.3 are empty.
- **Edges:** Sobel-style gradient on luminance plus alpha × 0.45, averaged per cell, normalised to the max and ×2.4, clamped to 1.
- **Tone smoothing:** `0.55 × own + 0.45 × mean of 3×3 in-figure neighbours`, to stop speckle.
- **Equalisation:** the head (top 50% of rows) and the body are histogram-equalised **separately** (otherwise the dark suit washes out the face). Final tone = `0.5 × rank + 0.5 × smoothed tone`.
- **Density:** `d = edge × 0.18 + (ink)^1.2 × 0.95 + 0.05`, clamped to 1, where `ink = 1 − tone` in light mode and `tone` in dark mode. ("Mystery" = 0: full face visible at rest. The outline-only silhouette was rejected.)

## Colour — mono electric blue

- Single hue: **electric blue `#2563EB`** (light mode; `#3B82F6` in dark mode).
- Shading by lightness of that blue, not by opacity (tiny glyphs at low opacity read as grey on a real screen):
  - light cells = electric tinted 50% toward the page background (`#F6F6F1`; navy `#0B1F3A` in dark mode);
  - dense cells = pure electric;
  - blend factor `smoothstep(0, 0.7, d)`.
- Opacity per glyph: `min(1, 0.55 + 0.45 × d) × fade`.
- Two-tone (electric → navy) was tried and rejected; mono chosen.

## Fade (bottom + shoulders)

Per cell, with `u = x / cols`, `v = y / rows`:

```
fade = (1 − smoothstep(0.50, 0.92, v))
     × (1 − smoothstep(0.18, 0.46, |u − 0.5|) × smoothstep(0.42, 0.75, v))
```

The fade starts around chest level ("stronger" setting, Damian's choice) so the portrait reads as head and shoulders dissolving into the page. The same mask is applied to the photo inside the lens.

## Loader (plays as the IntroStamp curtain lifts)

- **When it plays (Damian, revised 2026-10-27):** on **every load or reload of Home**, together with the existing `IntroStamp` curtain, which stays. The curtain decrypts the name and coordinates and wipes up at about 1 s (`INTRO_OFFSET`). The wave starts as it lifts, alongside the hero's float-in. Arriving from `/services` through the Phase 4 glyph-dissolve transition shows the portrait already drawn, with no wave.
- Skipped (finished portrait shown instead) under reduced motion or forced colours, in a background tab, on a landing below the hero (`/#work`), or when the image is ready later than 2.5 s.
- Duration ~**2.4 s**, kept as is (Damian).
- Wave origin: the face, at `(0.5, 0.38)` of the stage. Per-cell reveal time `tr = 0.3 + dist/maxDist × 2.6 + jitter × 0.15` s (row distance scaled by cell aspect).
- Before `tr − 0.25`: faint skeleton block (40% of the cell, opacity 0.10–0.15, shimmering).
- `tr − 0.25 … tr`: a random code glyph at 0.9 opacity (the decode front). Noise set: `A–Z` (no I/O), `0–9`, `#$%&@*+=<>/\`.
- After `tr`: the final glyph.
- **Hero text (Damian, revised 2026-10-27):** no letter decode. After the curtain, the text floats in as on the live site: the kicker fades up and the name rises line by line (`Word` masks, delays `INTRO_OFFSET` + 0.1 / 0.25 / 0.4 s). The lede stays static for LCP.
- **LCP:** the real text must be in the server-rendered HTML from the first paint, under the SSR curtain (same approach as EagerReveal/IntroStamp). Don't regress the 2026-07-18 perf work.

## Idle motion (kept as is)

- **Scan band:** every 6 s, a soft band sweeps down the portrait over 2.4 s (Gaussian over rows, σ² = 8). Cells in the band draw an extra glyph one step denser at up to 0.3 opacity.
- **Flicker:** each frame, `cols × rows × 0.00015` random in-figure cells swap to a noise glyph for 90–180 ms.

## Hover — cursor becomes the lens

- The site already has a custom cursor (`components/Cursor.jsx`): a 36 px ring that trails the mouse with easing 0.18, plus a centre dot. **Over the portrait, that ring expands into the lens.** The dot stays at the centre. Leaving the portrait shrinks the ring back to 36 px.
- Lens radius **~120 px** (240 px ring; about 40% on the prototype's 60–200 slider).
- Inside the lens: the **full-colour photo** (processed cutout, with the fade mask applied). Solid to 62% of the radius, soft falloff to 100%. The glyphs under the lens are cleared with the same soft mask.
- Lens extras: thin electric ring (opacity 0.5) and a small mono `x {n} · y {n}` readout (9 px, ink-faint) at the lower right of the ring. **No scrambled-glyph edge** (removed by Damian).
- Lens position eases toward the pointer at 0.18 per frame (matches the cursor ring); lens strength fades in and out at 0.12 per frame.
- Reduced motion / forced colours: the custom cursor is already disabled there; the portrait renders static with no lens.

## Touch

- Dragging on the portrait moves the lens (`touch-action: none` on the portrait only). Lifting the finger hides it. Swipes elsewhere scroll normally.

## Dark mode

- Glyphs in bright electric `#3B82F6` on navy `#0B1F3A`. Density uses `tone` directly (light-on-dark), so the image is not inverted.

## Rejected (don't reintroduce)

Portrait behind the text; full-hero layout from the reference video; hero-wide code-character trail; dot-matrix style; code-trail hover; muted/duotone lens; two-tone shading; 70-step ramp; whole-site dot texture; school-uniform photo.
