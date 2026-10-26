import { STRIP, stripLayout, cardPosition, stripOffset, progressForCard, nearestToCentre } from "@/lib/strip";

const TAN = Math.tan((12 * Math.PI) / 180);
const COUNT = 9; // 8 projects + the end card

const screenLeft = (i, p, L) => stripOffset(p, L).x + cardPosition(i, L).left;
const screenTop = (i, p, L) => stripOffset(p, L).y + cardPosition(i, L).top;

test("constants match the spec", () => {
  expect(STRIP).toMatchObject({ ANGLE_DEG: 12, CARD_VW: 0.45, PIN_SCREENS: 3 });
});

test("cards are 45% of the viewport width, capped by height", () => {
  expect(stripLayout({ vw: 1440, vh: 900, count: COUNT }).cardW).toBeCloseTo(648, 6);
  expect(stripLayout({ vw: 1440, vh: 600, count: COUNT }).cardW).toBeCloseTo(528, 6);
});

test("the strip starts with card 0 at the left edge", () => {
  const L = stripLayout({ vw: 1440, vh: 900, count: COUNT });
  expect(screenLeft(0, 0, L)).toBeCloseTo(0.08 * 1440, 3);
});

test("the strip ends with the last card at the right edge", () => {
  const L = stripLayout({ vw: 1440, vh: 900, count: COUNT });
  expect(screenLeft(COUNT - 1, 1, L) + L.cardW).toBeCloseTo(1440 - 0.08 * 1440, 3);
});

test("the strip travels along a 12° path", () => {
  const L = stripLayout({ vw: 1440, vh: 900, count: COUNT });
  const a = stripOffset(0, L), b = stripOffset(1, L);
  expect(b.x).toBeLessThan(a.x);
  expect((b.y - a.y) / (a.x - b.x)).toBeCloseTo(TAN, 6);
});

test("progressForCard runs 0 → 1 and strictly increases", () => {
  const L = stripLayout({ vw: 1440, vh: 900, count: COUNT });
  const ps = Array.from({ length: COUNT }, (_, i) => progressForCard(i, L));
  expect(ps[0]).toBe(0);
  expect(ps[COUNT - 1]).toBe(1);
  // Cards past the clamp all sit at 1; the run up to there is strictly increasing.
  const firstOne = ps.indexOf(1);
  for (let i = 1; i <= firstOne; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1]);
});

test.each([
  [1440, 900],
  [1280, 720],
  [1440, 700],
  [2560, 1080],
])("the leading card stays fully on screen at %i×%i", (vw, vh) => {
  const L = stripLayout({ vw, vh, count: COUNT });
  for (let i = 0; i < COUNT; i++) {
    const p = progressForCard(i, L);
    const top = screenTop(i, p, L);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + L.cardH).toBeLessThanOrEqual(vh);
    const left = screenLeft(i, p, L);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + L.cardW).toBeLessThanOrEqual(vw + 1e-6);
  }
});

test("nearestToCentre picks the closest centre, or -1 when none is near", () => {
  expect(nearestToCentre([100, 420, 900], 844)).toBe(1);
  expect(nearestToCentre([-900, 1900], 844)).toBe(-1);
  expect(nearestToCentre([], 844)).toBe(-1);
});
