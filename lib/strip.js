// Geometry of the pinned Projects carousel (docs/v3/plan-phase-6.md → Task 3,
// variant B in docs/v3/spike/home-curation.html). Cards sit level along a 12°
// path from lower-left to upper-right, half a screen apart, so while one card
// is centred its neighbours' centres sit on the screen edges. While the
// section is pinned, the strip glides along that path through the screen
// centre: at focus f (0 → count − 1) card f is dead centre. Cards away from
// the centre take depth of field. Pure: no DOM, so it unit-tests in node. All
// lengths are CSS px.

export const STRIP = {
  ANGLE_DEG: 12,
  CARD_VW: 0.4, // card width as a share of the viewport width…
  SHOT_MAX_VH: 0.488, // …unless the screenshot would pass 48.8% of its height
  PITCH_VW: 0.5, // distance between card centres
  PIN_SCREENS: 3, // viewport-heights of scroll the pin lasts
  SHOT_RATIO: 900 / 1440, // screenshots are 1440×900
  CHROME_PX: 34, // browser-window bar above the shot
  LABEL_PX: 96, // label + reveal row under the card
  // Depth of field, in steps (one step = the pitch): fully sharp within
  // `zone` of the centre, then a smooth ramp to full depth over `ramp`
  // (Damian: a wider sharp zone, ±20vw).
  DOF: { zone: 0.4, ramp: 0.6 },
  SMOOTH_MS: 110, // the displayed progress eases after the scroll progress
};

const TAN = Math.tan((STRIP.ANGLE_DEG * Math.PI) / 180);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => t * t * (3 - 2 * t);

export function stripLayout({ vw, vh }) {
  const { CARD_VW, SHOT_MAX_VH, PITCH_VW, SHOT_RATIO, CHROME_PX, LABEL_PX } = STRIP;
  const cardW = Math.min(CARD_VW * vw, (SHOT_MAX_VH * vh) / SHOT_RATIO);
  const shotH = cardW * SHOT_RATIO;
  const cardH = CHROME_PX + shotH + LABEL_PX;
  const pitch = PITCH_VW * vw;
  return { vw, vh, cardW, shotH, cardH, pitch, rise: pitch * TAN };
}

// A card's position inside the strip.
export const cardPosition = (i, L) => ({ left: i * L.pitch, top: -i * L.rise });

// The strip's translate with card f (fractional) centred on screen.
export const stripOffset = (f, L) => ({
  x: L.vw / 2 - L.cardW / 2 - f * L.pitch,
  y: L.vh / 2 - L.cardH / 2 + f * L.rise,
});

// Scroll progress p (0 → 1) ↔ the card in focus.
export const focusAt = (p, count) => p * (count - 1);
export const progressForCard = (i, count) => i / (count - 1);

// Depth of field for a card d steps from the centre. Past one step it blurs
// and fades a little more. Phones pass { blur: false }: blur (and the colour
// loss that goes with it) is the costliest effect on a phone.
export function depthAt(d, { blur = true } = {}) {
  const { zone, ramp } = STRIP.DOF;
  const k = smooth(clamp01((d - zone) / ramp));
  const past = clamp01((d - 1) / 0.5);
  return {
    scale: 1 - k * 0.1,
    opacity: 1 - k * 0.32 - past * 0.16,
    blur: blur ? k * 3.2 + past * 1.6 : 0,
    saturate: blur ? 1 - k * 0.35 : 1,
  };
}

// The phone stack: a card d screen-heights from the centre dims and shrinks.
export function stackDepth(d) {
  const k = Math.min(1, d * 1.6);
  return { scale: 1 - k * 0.08, opacity: 1 - k * 0.4 };
}

// stackDepth as keyframes over a card's view timeline (its `cover` range:
// p = 0 as its top enters the bottom of the screen, 1 as its bottom leaves
// the top), so the compositor plays it in step with the scroll. A card
// `ratio` screen-heights tall is (1 + ratio)·|½ − p| screen-heights from the
// centre, so the depth is straight lines in p, broken only at the centre and
// where it reaches full depth; keyframes at those points draw it exactly.
export function stackKeyframes(ratio) {
  const reach = 1 / (1.6 * (1 + ratio)); // p's distance from ½ to full depth
  const at = (offset) => {
    const z = stackDepth((1 + ratio) * Math.abs(0.5 - offset));
    return { offset, transform: `scale(${z.scale})`, opacity: z.opacity };
  };
  const breaks = reach < 0.5 ? [0, 0.5 - reach, 0.5, 0.5 + reach, 1] : [0, 0.5, 1];
  return breaks.map(at);
}

// One frame of the scroll smoothing: `shown` eases towards `target` over dt
// ms, and snaps to it once within a hair.
export function smoothStep(shown, target, dt) {
  const next = target + (shown - target) * Math.exp(-dt / STRIP.SMOOTH_MS);
  return Math.abs(target - next) < 0.0004 ? target : next;
}

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
