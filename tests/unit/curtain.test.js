import {
  TIMING,
  EXTENT,
  panelCount,
  delayOf,
  maxDelay,
  ease,
  edgeLight,
  sampleMove,
  coverTime,
  liftTime,
  totalChange,
  clearAt,
} from "@/lib/curtain";

test("the lab's timings", () => {
  expect(TIMING).toEqual({ in: 0.7, hold: 0.22, out: 0.85, stagger: 0.12 });
  expect(EXTENT).toBe(1); // one panel height either side, as the lab
});

test("five panels from md, three below", () => {
  expect(panelCount(1440)).toBe(5);
  expect(panelCount(768)).toBe(5);
  expect(panelCount(767)).toBe(3);
  expect(panelCount(390)).toBe(3);
});

test("centre-out delays", () => {
  expect([0, 1, 2, 3, 4].map((i) => delayOf(i, 5))).toEqual([0.24, 0.12, 0, 0.12, 0.24]);
  expect([0, 1, 2].map((i) => delayOf(i, 3))).toEqual([0.12, 0, 0.12]);
  expect(maxDelay(5)).toBe(0.24);
  expect(maxDelay(3)).toBe(0.12);
});

test("ease is power4 in-out: symmetric, 0 → 1", () => {
  expect(ease(0)).toBe(0);
  expect(ease(1)).toBe(1);
  expect(ease(0.5)).toBeCloseTo(0.5, 9);
  for (const t of [0.1, 0.25, 0.4]) expect(ease(t) + ease(1 - t)).toBeCloseTo(1, 9);
  expect(ease(0.25)).toBeCloseTo(16 * 0.25 ** 5, 9);
});

test("edge light: off at rest, full at 3.5 screens a second", () => {
  expect(edgeLight(0)).toBe(0);
  expect(edgeLight(1.75)).toBeCloseTo(0.5, 9);
  expect(edgeLight(-3.5)).toBe(1);
  expect(edgeLight(9)).toBe(1);
});

test("a page change: cover 0.94 s, hold 0.22 s, lift 1.09 s", () => {
  expect(coverTime(5)).toBeCloseTo(0.94, 9);
  expect(liftTime(5)).toBeCloseTo(1.09, 9);
  expect(totalChange(5)).toBeCloseTo(2.25, 9);
  expect(totalChange(3)).toBeCloseTo(0.82 + 0.22 + 0.97, 9);
});

test("the page shows from 0.45 of the way through the out phase, after the last panel's delay", () => {
  expect(clearAt(5)).toBeCloseTo(0.24 + 0.85 * 0.45, 9);
  expect(clearAt(3)).toBeCloseTo(0.12 + 0.85 * 0.45, 9);
});

// The compositor-driven move (2026-10-29): a move sampled in advance on a
// fixed grid, for the Web Animations API.
test("sampleMove: the eased travel on a fixed grid, with its speed", () => {
  const s = sampleMove(1, 0, 0.7);
  expect(s[0]).toEqual({ t: 0, y: 1, speed: 0 });
  // 0.7 s at 120 Hz: 84 steps, plus the still frame after the move.
  expect(s).toHaveLength(86);
  expect(s.at(-1)).toEqual({ t: 0.7, y: 0, speed: 0 });
  expect(s.at(-2).y).toBeCloseTo(0, 9);
  for (let i = 1; i < s.length - 1; i++) {
    expect(s[i].y).toBeCloseTo(1 - ease(s[i].t / 0.7), 9);
    expect(s[i].speed).toBeGreaterThanOrEqual(0); // upwards positive
  }
  // Fastest in the middle, so the edge light is brightest there.
  const mid = s[Math.floor(s.length / 2)];
  expect(mid.speed).toBeGreaterThan(s[5].speed);
  expect(edgeLight(mid.speed)).toBe(1);
  expect(edgeLight(s[1].speed)).toBeLessThan(0.01);
});
