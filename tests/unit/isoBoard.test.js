import { N, LIFT, SIGMA, TAU, falloff, ambient, smoothing, settled, aim } from "@/lib/isoBoard";

test("the lab's constants", () => {
  expect({ N, LIFT, SIGMA, TAU }).toEqual({ N: 5, LIFT: 26, SIGMA: 0.85, TAU: 0.14 });
});

test("falloff: 1 under the pointer, a Gaussian round it, symmetric", () => {
  expect(falloff(2, 2, 2.5, 2.5)).toBe(1);
  const near = falloff(2, 3, 2.5, 2.5), far = falloff(2, 4, 2.5, 2.5);
  expect(near).toBeCloseTo(Math.exp(-1 / (2 * SIGMA * SIGMA)), 9);
  expect(far).toBeLessThan(near);
  expect(falloff(2, 1, 2.5, 2.5)).toBeCloseTo(near, 9);
  expect(falloff(1, 2, 2.5, 2.5)).toBeCloseTo(near, 9);
  expect(falloff(0, 0, 4.5, 4.5)).toBeLessThan(0.01);
});

test("ambient: a slow diagonal wave, never below 0 or above 0.24", () => {
  for (let t = 0; t < 20; t += 0.37) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const a = ambient(r, c, t);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(0.24 + 1e-9);
      }
    }
  }
  // Tiles on one diagonal (same r + c) move together.
  expect(ambient(0, 2, 3.3)).toBe(ambient(1, 1, 3.3));
  expect(ambient(0, 2, 3.3)).not.toBe(ambient(0, 3, 3.3));
});

test("smoothing: 0 for no time, approaching 1, one time constant ≈ 63%", () => {
  expect(smoothing(0)).toBe(0);
  expect(smoothing(TAU)).toBeCloseTo(1 - Math.exp(-1), 9);
  expect(smoothing(5)).toBeGreaterThan(0.999);
});

test("settled: the reduced-motion cluster peaks round tile (row 1, col 3)", () => {
  let best = [0, 0], max = -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = settled(r, c);
      expect(v).toBeLessThanOrEqual(0.9);
      if (v > max) [max, best] = [v, [r, c]];
    }
  }
  expect(best).toEqual([1, 3]);
  expect(settled(4, 0)).toBeLessThan(0.01);
});

test("aim: a tile and a point in it give board coordinates, clamped", () => {
  expect(aim(1, 3, 10, 30, 40, 40)).toEqual({ x: 3.25, y: 1.75 });
  expect(aim(0, 0, -5, 99, 40, 40)).toEqual({ x: 0, y: 1 });
  expect(aim(2, 2, 0, 0, 0, 0)).toEqual({ x: 2.5, y: 2.5 });
});
