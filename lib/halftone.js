// § 07 Lens develop — each photo starts as a halftone of round electric dots
// sized by tone and resolves into full colour as it enters view. Pure maths:
// components/lens/useDevelop.js does the drawing.
import { smoothstep } from "./portrait";

export const HALFTONE = {
  CELL: 7, // px per dot cell
  DEVELOP_MS: 1200, // timed develop on entering view (Damian)
};

// Dark areas get big dots, white gets none. lum is 0–1.
export const dotRadius = (lum, cell) => Math.pow(1 - lum, 0.8) * 0.55 * cell;

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
