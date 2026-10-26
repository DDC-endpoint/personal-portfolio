import { HALFTONE, dotRadius, developMix } from "@/lib/halftone";

test("constants", () => expect(HALFTONE).toEqual({ CELL: 7, DEVELOP_MS: 1200 }));

test("dark areas get big dots, white gets none", () => {
  expect(dotRadius(1, 7)).toBe(0);
  expect(dotRadius(0, 7)).toBeCloseTo(3.85, 5);
  let prev = Infinity;
  for (let l = 0; l <= 1.0001; l += 0.05) {
    const r = dotRadius(Math.min(1, l), 7);
    expect(r).toBeLessThan(prev);
    prev = r;
  }
});

test("develop endpoints", () => {
  expect(developMix(0)).toEqual({ dots: 1, photo: 0, grow: 1 });
  expect(developMix(-0.5)).toEqual({ dots: 1, photo: 0, grow: 1 });
  expect(developMix(1)).toEqual({ dots: 0, photo: 1, grow: 1.6 });
  expect(developMix(2)).toEqual({ dots: 0, photo: 1, grow: 1.6 });
});

test("photo rises monotonically while dots fade", () => {
  let photo = -1;
  let dots = 2;
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const m = developMix(t);
    expect(m.photo).toBeGreaterThanOrEqual(photo);
    expect(m.dots).toBeLessThanOrEqual(dots);
    ({ photo, dots } = m);
  }
  expect(developMix(0.3).dots).toBe(1); // dots hold until 0.35
});
