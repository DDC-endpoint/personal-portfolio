import {
  STRIP,
  stripLayout,
  cardPosition,
  stripOffset,
  focusAt,
  progressForCard,
  depthAt,
  stackDepth,
  stackKeyframes,
  smoothStep,
  nearestToCentre,
} from "@/lib/strip";

const TAN = Math.tan((12 * Math.PI) / 180);
const COUNT = 6; // Home's five + the end card

// A card's centre on screen when the strip is focused on f.
const centre = (i, f, L) => ({
  x: stripOffset(f, L).x + cardPosition(i, L).left + L.cardW / 2,
  y: stripOffset(f, L).y + cardPosition(i, L).top + L.cardH / 2,
});

test("constants match the plan", () => {
  expect(STRIP).toMatchObject({
    ANGLE_DEG: 12,
    CARD_VW: 0.4,
    SHOT_MAX_VH: 0.488,
    PITCH_VW: 0.5,
    PIN_SCREENS: 3,
    DOF: { zone: 0.4, ramp: 0.6 },
  });
});

test("cards are 40% of the viewport width, the shot capped at 48.8% of its height", () => {
  expect(stripLayout({ vw: 1440, vh: 900 }).cardW).toBeCloseTo(576, 6);
  const short = stripLayout({ vw: 1440, vh: 600 });
  expect(short.shotH).toBeCloseTo(0.488 * 600, 6);
  expect(short.cardW).toBeCloseTo((0.488 * 600 * 1440) / 900, 6);
});

test("the pitch is half the screen width", () => {
  expect(stripLayout({ vw: 1440, vh: 900 }).pitch).toBe(720);
});

test("focusAt and progressForCard are inverse", () => {
  expect(focusAt(0, COUNT)).toBe(0);
  expect(focusAt(1, COUNT)).toBe(5);
  for (let i = 0; i < COUNT; i++) expect(focusAt(progressForCard(i, COUNT), COUNT)).toBeCloseTo(i, 9);
  expect(progressForCard(2, COUNT)).toBeCloseTo(0.4, 9);
});

test.each([
  [1440, 900],
  [1280, 720],
  [2560, 1080],
])("the focused card sits dead centre at %i×%i", (vw, vh) => {
  const L = stripLayout({ vw, vh });
  for (let i = 0; i < COUNT; i++) {
    const c = centre(i, focusAt(progressForCard(i, COUNT), COUNT), L);
    expect(c.x).toBeCloseTo(vw / 2, 6);
    expect(c.y).toBeCloseTo(vh / 2, 6);
  }
});

test("the first card is centred at progress 0", () => {
  const L = stripLayout({ vw: 1440, vh: 900 });
  expect(centre(0, focusAt(0, COUNT), L).x).toBeCloseTo(720, 6);
  // The next card's centre sits on the right edge.
  expect(centre(1, focusAt(0, COUNT), L).x).toBeCloseTo(1440, 6);
});

test("the end card is centred at 1, the previous card's centre on the left edge", () => {
  const L = stripLayout({ vw: 1440, vh: 900 });
  const f = focusAt(1, COUNT);
  expect(centre(COUNT - 1, f, L).x).toBeCloseTo(720, 6);
  expect(centre(COUNT - 2, f, L).x).toBeCloseTo(0, 6);
});

test("the strip travels along a 12° path", () => {
  const L = stripLayout({ vw: 1440, vh: 900 });
  const a = stripOffset(0, L), b = stripOffset(1, L);
  expect(b.x).toBeLessThan(a.x);
  expect((b.y - a.y) / (a.x - b.x)).toBeCloseTo(TAN, 9);
  // Cards sit level along the same line, rising to the right.
  expect(-cardPosition(1, L).top / cardPosition(1, L).left).toBeCloseTo(TAN, 9);
});

test("depthAt is flat inside the sharp zone", () => {
  for (const d of [0, 0.1, 0.3, 0.4]) {
    expect(depthAt(d)).toEqual({ scale: 1, opacity: 1, blur: 0, saturate: 1 });
  }
});

test("depthAt reaches the stated values at one and one and a half steps", () => {
  const one = depthAt(1);
  expect(one.scale).toBeCloseTo(0.9, 9);
  expect(one.opacity).toBeCloseTo(0.68, 9);
  expect(one.blur).toBeCloseTo(3.2, 9);
  expect(one.saturate).toBeCloseTo(0.65, 9);
  const far = depthAt(1.5);
  expect(far.blur).toBeCloseTo(4.8, 9);
  expect(far.opacity).toBeCloseTo(0.52, 9);
  expect(depthAt(3)).toEqual(far);
});

test("depthAt is monotonic past the zone", () => {
  let prev = depthAt(0.4);
  for (let d = 0.45; d <= 2; d += 0.05) {
    const cur = depthAt(d);
    expect(cur.scale).toBeLessThanOrEqual(prev.scale);
    expect(cur.opacity).toBeLessThanOrEqual(prev.opacity);
    expect(cur.blur).toBeGreaterThanOrEqual(prev.blur);
    expect(cur.saturate).toBeLessThanOrEqual(prev.saturate);
    prev = cur;
  }
});

test("depthAt without blur keeps the rest", () => {
  const d = depthAt(1.2, { blur: false });
  expect(d.blur).toBe(0);
  expect(d.saturate).toBe(1);
  expect(d.scale).toBe(depthAt(1.2).scale);
  expect(d.opacity).toBe(depthAt(1.2).opacity);
});

test("stackDepth dims and shrinks by distance from the centre", () => {
  expect(stackDepth(0)).toEqual({ scale: 1, opacity: 1 });
  const far = stackDepth(1);
  expect(far.scale).toBeCloseTo(0.92, 9);
  expect(far.opacity).toBeCloseTo(0.6, 9);
  expect(stackDepth(0.3).opacity).toBeLessThan(1);
});

test("stackKeyframes, read between keyframes, is stackDepth at every point of the view timeline", () => {
  const scaleOf = (t) => +t.match(/scale\(([\d.]+)\)/)[1];
  for (const ratio of [0.1, 0.45, 0.8, 1.6]) {
    const ks = stackKeyframes(ratio);
    expect(ks[0].offset).toBe(0);
    expect(ks.at(-1).offset).toBe(1);
    for (let i = 0; i <= 400; i++) {
      const p = i / 400;
      const j = Math.max(0, ks.findIndex((k) => k.offset >= p) - 1);
      const [a, b] = [ks[j], ks[Math.min(j + 1, ks.length - 1)]];
      const u = b.offset === a.offset ? 0 : (p - a.offset) / (b.offset - a.offset);
      const want = stackDepth((1 + ratio) * Math.abs(0.5 - p));
      expect(scaleOf(a.transform) + u * (scaleOf(b.transform) - scaleOf(a.transform))).toBeCloseTo(want.scale, 9);
      expect(a.opacity + u * (b.opacity - a.opacity)).toBeCloseTo(want.opacity, 9);
    }
  }
});

test("smoothStep eases with a ~110 ms time constant, converges and never overshoots", () => {
  // One time constant covers about 63% of the way.
  expect(smoothStep(0, 1, STRIP.SMOOTH_MS)).toBeCloseTo(1 - Math.exp(-1), 6);
  let shown = 0;
  for (let i = 0; i < 200; i++) {
    const next = smoothStep(shown, 1, 16.7);
    expect(next).toBeGreaterThanOrEqual(shown);
    expect(next).toBeLessThanOrEqual(1);
    shown = next;
  }
  expect(shown).toBe(1);
  // Downwards too, and a long frame lands exactly.
  expect(smoothStep(1, 0, 5000)).toBe(0);
  expect(smoothStep(0.5, 0.5, 16)).toBe(0.5);
});

test("nearestToCentre picks the closest centre, or -1 when none is near", () => {
  expect(nearestToCentre([100, 420, 900], 844)).toBe(1);
  expect(nearestToCentre([-900, 1900], 844)).toBe(-1);
  expect(nearestToCentre([], 844)).toBe(-1);
});
