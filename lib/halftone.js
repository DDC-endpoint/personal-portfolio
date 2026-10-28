// § 07 Lens develop — each photo starts as a halftone of round electric dots
// sized by tone and resolves into full colour as it scrolls into view. Pure maths:
// components/lens/useDevelop.js does the drawing.
import { smoothstep } from "./portrait";

export const HALFTONE = {
  CELL: 7, // px per dot cell
};

// The dot cells for a W × H tile: whole cells of at most `cell` px that span
// it exactly. The photo is sampled into these cells and the dots drawn at
// their centres, so the print registers with the photo all the way to the
// edges (a fixed cell size would run past the tile and drift).
export function dotGrid(W, H, cell) {
  const cols = Math.max(1, Math.ceil(W / cell)), rows = Math.max(1, Math.ceil(H / cell));
  return { cols, rows, cw: W / cols, ch: H / rows };
}

// Dark areas get big dots, white gets none. lum is 0–1. The largest dot is
// 0.9 of a cell across, so dots stay round and separate at rest.
export const dotRadius = (lum, cell) => Math.pow(1 - lum, 0.8) * 0.45 * cell;

// The develop's mix at t (0 → 1): the photo fades in over the dots, which
// hold, then fade while they swell, so the print "bleeds" into the photo.
export function developMix(t) {
  const x = Math.min(1, Math.max(0, t));
  return {
    dots: 1 - smoothstep(0.35, 1, x),
    photo: smoothstep(0.25, 0.9, x),
    grow: 1 + 0.6 * x,
  };
}

// Auto-levels per photo: stretches the 2nd–98th percentile of its luminance
// to 0–1, so a night shot keeps its structure instead of printing as a solid
// block of dots. A flat image is left as it is.
export function levels(lum) {
  const sorted = Float32Array.from(lum).sort();
  const n = sorted.length;
  const lo = sorted[Math.floor(0.02 * (n - 1))];
  const hi = sorted[Math.ceil(0.98 * (n - 1))];
  if (hi - lo < 1e-3) return lum;
  return lum.map((l) => Math.min(1, Math.max(0, (l - lo) / (hi - lo))));
}

// The lum dotRadius should print. On the light page the dots are ink on paper
// (dark → big); on the navy page they are light, so bright → big, and the
// print reads as a positive in both themes.
export const dotTone = (lum, dark) => (dark ? 1 - lum : lum);

// How far a tile has developed (0 → 1), tied straight to scroll (Damian): 0
// while its top is at or below the screen's bottom edge, 1 once its centre
// reaches the screen's centre, linear between. Above the screen it stays at
// 1, so a photo only goes back to dots as it drops back toward the bottom.
// top is the tile's top relative to the viewport.
export function scrollDevelop(top, height, viewH) {
  const t = (viewH - top) / ((viewH + height) / 2);
  return Math.min(1, Math.max(0, t));
}
