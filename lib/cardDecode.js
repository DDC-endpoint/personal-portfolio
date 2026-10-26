// Skeleton → screenshot decode for the Projects cards (docs/v3/design.md →
// 5. Projects). The card's shot area is a grid of CELL_PX cells. A front of
// noise characters sweeps left to right with per-cell jitter: ahead of it a
// cell still shows the skeleton, inside the BAND it shows a noise glyph, and
// behind it the screenshot. Dissolving is the same sweep with progress
// falling. Pure: no DOM, so it unit-tests in node.

export const DECODE = {
  CELL_PX: 14,
  BAND: 0.18, // width of the noise front, in progress units
  DECODE_MS: 700,
  DISSOLVE_MS: 450,
  DISSOLVE_DELAY_MS: 600, // a card holds its screenshot this long after the pointer leaves
};

// Deterministic per-cell jitter in [0, 1).
export function hash01(col, row, seed) {
  let h = Math.imul(col + 1, 73856093) ^ Math.imul(row + 1, 19349663) ^ Math.imul(seed + 1, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const cellThreshold = (col, row, cols, seed) =>
  (0.75 * col) / Math.max(cols - 1, 1) + 0.25 * hash01(col, row, seed);

export function cellPhase(progress, threshold) {
  if (progress <= 0) return "skeleton";
  const u = progress * (1 + DECODE.BAND);
  if (u < threshold) return "skeleton";
  if (u < threshold + DECODE.BAND) return "noise";
  return "shot";
}

// Moves progress toward target (0 or 1) by dtMs: decoding takes DECODE_MS,
// dissolving DISSOLVE_MS, and either reverses from wherever it is.
export function stepProgress(progress, target, dtMs) {
  return target > progress
    ? Math.min(1, progress + dtMs / DECODE.DECODE_MS)
    : Math.max(0, progress - dtMs / DECODE.DISSOLVE_MS);
}
