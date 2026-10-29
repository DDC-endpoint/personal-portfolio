import {
  TIMING,
  EXTENT,
  panelCount,
  delayOf,
  maxDelay,
  ease,
  bulge,
  edgeLight,
  shadowLevel,
  shadow,
  restFilter,
  trail,
  sampleMove,
  coverTime,
  liftTime,
  totalChange,
  clearAt,
} from "@/lib/curtain";

test("the lab's timings", () => {
  expect(TIMING).toEqual({ in: 0.7, hold: 0.22, out: 0.85, stagger: 0.12 });
  expect(EXTENT).toBe(1.3);
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

test("bulge: none at rest, signed with the speed, capped by both limits", () => {
  expect(bulge(0, 900, 288)).toBe(0);
  expect(bulge(1, 900, 288)).toBeCloseTo(9.9, 9);
  expect(bulge(-1, 900, 288)).toBeCloseTo(-9.9, 9);
  expect(bulge(50, 900, 288)).toBeCloseTo(81, 9); // 9% of the screen height
  expect(bulge(50, 844, 130)).toBeCloseTo(39, 9); // 0.3 × a narrow panel
  expect(bulge(-50, 844, 130)).toBeCloseTo(-39, 9);
});

test("edge light: off at rest, full at 3.5 screens a second", () => {
  expect(edgeLight(0)).toBe(0);
  expect(edgeLight(1.75)).toBeCloseTo(0.5, 9);
  expect(edgeLight(-3.5)).toBe(1);
  expect(edgeLight(9)).toBe(1);
});

test("shadow: always a resting part; the moving part rises smoothly from 0", () => {
  const rest = shadow(0, "light");
  expect(rest.rest).toEqual({ alpha: 0.1, blur: 14 });
  expect(rest.move.alpha).toBe(0);
  expect(shadow(0, "dark").rest).toEqual({ alpha: 0.38, blur: 14 });
  expect(shadow(1, "light").move.alpha).toBeCloseTo(0.16, 9);
  expect(shadow(1, "dark").move.alpha).toBeCloseTo(0.45, 9);
  // No threshold: a small level gives a small (non-zero) shadow, and it grows.
  let prev = 0;
  for (let m = 0.01; m <= 1; m += 0.01) {
    const a = shadow(m, "light").move.alpha;
    expect(a).toBeGreaterThan(prev);
    prev = a;
  }
  expect(shadow(0.001, "light").move.alpha).toBeLessThan(0.02);
});

// A filter whose parameters change every frame re-blurs the whole panel every
// frame (measured: 16-22 dropped frames a page change on an Iris Xe laptop).
// So the resting shadow is one constant filter, and the moving one is a
// blurred copy of the panel's shape: the same shadow, but its offset and
// opacity move cheaply and its blur changes only a few times a move.
test("the resting shadow is one constant filter per theme", () => {
  expect(restFilter("light", "11 31 58")).toBe("drop-shadow(0 0 14px rgb(11 31 58 / 0.1))");
  expect(restFilter("dark", "0 0 0")).toBe("drop-shadow(0 0 14px rgb(0 0 0 / 0.38))");
});

test("the moving shadow: the drop-shadow it replaces, drawn as a blurred copy", () => {
  // At rest: invisible, not offset.
  expect(trail(0, 0, "light")).toEqual({ opacity: 0, y: 0, blur: 0 });
  // A drop-shadow's blur radius b is a Gaussian of deviation b / 2, which is
  // what blur() takes. Whole pixels, so the filter changes a few times a move
  // rather than every frame.
  for (const m of [0.3, 0.6, 1]) {
    const { blur } = trail(m, 3, "light");
    expect(Number.isInteger(blur)).toBe(true);
    expect(Math.abs(blur - shadow(m, "light").move.blur / 2)).toBeLessThanOrEqual(0.5);
  }
  // As the drop-shadow it replaces: the same strength, and the same offset
  // (against the direction of travel; speed is upwards positive).
  const up = trail(1, 3, "light"), down = trail(1, -3, "light");
  expect(up.opacity).toBeCloseTo(shadow(1, "light").move.alpha, 9);
  expect(up.y).toBeCloseTo(-shadow(1, "light").move.y, 9);
  expect(down.y).toBeCloseTo(shadow(1, "light").move.y, 9);
  expect(trail(1, 3, "dark").opacity).toBeCloseTo(0.45, 9);
  // Below the visible threshold it is off, so a resting curtain draws nothing.
  expect(trail(0.0001, 3, "light").opacity).toBe(0);
});

test("shadowLevel follows the speed smoothly", () => {
  let m = 0;
  m = shadowLevel(m, 4, 1 / 60);
  expect(m).toBeGreaterThan(0);
  expect(m).toBeLessThan(0.3);
  for (let i = 0; i < 60; i++) m = shadowLevel(m, 4, 1 / 60);
  expect(m).toBeCloseTo(1, 2);
  for (let i = 0; i < 120; i++) m = shadowLevel(m, 0, 1 / 60);
  expect(m).toBeLessThan(0.01);
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
// fixed grid, with the same maths the per-frame engine used.
test("sampleMove: the eased travel on a fixed grid, speed and level as the engine had them", () => {
  const s = sampleMove(1.3, 0, 0.7);
  expect(s[0]).toEqual({ t: 0, y: 1.3, speed: 0, level: 0 });
  // 0.7 s at 120 Hz: 84 steps, plus the still frame after the move.
  expect(s).toHaveLength(86);
  expect(s.at(-1)).toMatchObject({ t: 0.7, y: 0, speed: 0 });
  expect(s.at(-2).y).toBeCloseTo(0, 9);
  for (let i = 1; i < s.length - 1; i++) {
    expect(s[i].y).toBeCloseTo(1.3 + (0 - 1.3) * ease(s[i].t / 0.7), 9);
    expect(s[i].speed).toBeGreaterThanOrEqual(0); // upwards positive
    expect(s[i].level).toBeGreaterThanOrEqual(0);
    expect(s[i].level).toBeLessThanOrEqual(1);
  }
  // Fastest in the middle; the level follows it and drains by the end.
  const mid = s[Math.floor(s.length / 2)];
  expect(mid.speed).toBeGreaterThan(s[5].speed);
  expect(mid.level).toBeGreaterThan(0.5);
  expect(s.at(-1).level).toBeLessThan(mid.level);
  // The still frame keeps the level it ended with, as draw(0) did.
  expect(s.at(-1).level).toBe(s.at(-2).level);
  // A lift carries the level over from the cover's end.
  expect(sampleMove(0, -1.3, 0.85, 0.3)[0].level).toBeCloseTo(0.3, 9);
});
