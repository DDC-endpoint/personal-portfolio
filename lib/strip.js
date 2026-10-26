// Geometry of the pinned Projects strip (docs/v3/design.md → 5. Projects).
// Cards sit level along a 12° path from lower-left to upper-right; while the
// section is pinned, scroll progress p (0 → 1) slides the whole strip down
// and to the left along that path, so each next card arrives from the upper
// right. Pure: no DOM, so it unit-tests in node. All lengths are CSS px.

export const STRIP = {
  ANGLE_DEG: 12,
  CARD_VW: 0.45, // card width as a share of the viewport width…
  CARD_MAX_VH: 0.55, // …unless the screenshot area would pass 55% of its height
  GAP_VW: 0.06, // horizontal gap between cards
  EDGE_VW: 0.08, // inset of the first card at the start and the last at the end
  PIN_SCREENS: 3, // viewport-heights of scroll the pin lasts
  SHOT_RATIO: 900 / 1440, // screenshots are 1440×900
  CHROME_PX: 34, // browser-window bar above the shot
  LABEL_PX: 96, // label + reveal row under the card
};

const TAN = Math.tan((STRIP.ANGLE_DEG * Math.PI) / 180);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function stripLayout({ vw, vh, count }) {
  const { CARD_VW, CARD_MAX_VH, GAP_VW, EDGE_VW, SHOT_RATIO, CHROME_PX, LABEL_PX } = STRIP;
  const cardW = Math.min(CARD_VW * vw, (CARD_MAX_VH * vh) / SHOT_RATIO);
  const shotH = cardW * SHOT_RATIO;
  const cardH = CHROME_PX + shotH + LABEL_PX;
  const pitch = cardW + GAP_VW * vw;
  const rise = pitch * TAN;
  // The leading card and the one arriving after it, centred as a pair.
  const startY = (vh - (cardH + rise)) / 2 + rise;
  const travelX = Math.max(0, (count - 1) * pitch - (vw - cardW - 2 * EDGE_VW * vw));
  return { cardW, shotH, cardH, pitch, rise, startX: EDGE_VW * vw, startY, travelX, travelY: travelX * TAN };
}

// A card's position inside the strip.
export const cardPosition = (i, L) => ({ left: i * L.pitch, top: -i * L.rise });

// The strip's translate at scroll progress p.
export const stripOffset = (p, L) => ({ x: L.startX - p * L.travelX, y: L.startY + p * L.travelY });

// The progress at which card i is the leading card (at the left inset).
export const progressForCard = (i, L) => (L.travelX > 0 ? clamp01((i * L.pitch) / L.travelX) : 0);

// Index of the centre closest to the middle of `extent`, or -1 when none lies
// within half an extent of it (nothing is on screen).
export function nearestToCentre(centres, extent) {
  const mid = extent / 2;
  let best = -1, bestD = mid;
  centres.forEach((c, i) => {
    const d = Math.abs(c - mid);
    if (d <= bestD) [best, bestD] = [i, d];
  });
  return best;
}
