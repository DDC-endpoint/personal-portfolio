import { HALFTONE, dotRadius, developMix, levels, dotTone, scrollDevelop, dotGrid } from "@/lib/halftone";

test("constants", () => expect(HALFTONE).toEqual({ CELL: 7 }));

test("dark areas get big dots, white gets none", () => {
  expect(dotRadius(1, 7)).toBe(0);
  expect(dotRadius(0, 7)).toBeCloseTo(3.15, 5); // 6.3 px across in a 7 px cell: dots never merge at rest
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

test("levels stretches a dark photo to the full tonal range", () => {
  const dark = Float32Array.from({ length: 100 }, (_, i) => 0.05 + (i / 99) * 0.2); // 0.05 … 0.25
  const out = levels(dark);
  expect(out[0]).toBe(0);
  expect(out[99]).toBe(1);
  expect(out[50]).toBeGreaterThan(0.4);
  expect(out[50]).toBeLessThan(0.6);
  for (let i = 1; i < 100; i++) expect(out[i]).toBeGreaterThanOrEqual(out[i - 1]);
});

test("levels ignores outliers and leaves a flat image alone", () => {
  const spiky = Float32Array.from({ length: 100 }, (_, i) => (i === 0 ? 0 : i === 99 ? 1 : 0.4 + (i / 99) * 0.2));
  const out = levels(spiky);
  expect(out[1]).toBeLessThan(0.05); // the black outlier doesn't hold the floor down
  expect(out[98]).toBeGreaterThan(0.95);
  expect([...levels(new Float32Array(10).fill(0.3))]).toEqual(Array(10).fill(0.3).map(Math.fround));
});

test("dark mode sizes dots by brightness, so the print stays a positive", () => {
  expect(dotRadius(dotTone(0.9, false), 7)).toBeLessThan(dotRadius(dotTone(0.1, false), 7)); // light: dark → big
  expect(dotRadius(dotTone(0.9, true), 7)).toBeGreaterThan(dotRadius(dotTone(0.1, true), 7)); // dark: bright → big
});

// Damian: the develop follows scroll. 0 while the tile's top is at or below
// the screen's bottom edge, 1 once its centre reaches the screen's centre.
test("develop starts as the tile's top enters the screen", () => {
  expect(scrollDevelop(900, 300, 900)).toBe(0);
  expect(scrollDevelop(1400, 300, 900)).toBe(0);
});

test("develop completes when the tile's centre reaches the screen's centre", () => {
  expect(scrollDevelop(300, 300, 900)).toBe(1); // centre at 450 of 900
});

test("develop is linear in scroll between the two", () => {
  // a 300 px tile on a 900 px screen develops over 600 px of scroll
  expect(scrollDevelop(600, 300, 900)).toBeCloseTo(0.5, 10);
  expect(scrollDevelop(750, 300, 900)).toBeCloseTo(0.25, 10);
});

test("a tile above the screen stays developed", () => {
  expect(scrollDevelop(-2000, 300, 900)).toBe(1);
});

test("a tile taller than the screen still completes", () => {
  // 950 px tile on a 300 px screen: centre at 150 when its top is at -325
  expect(scrollDevelop(-325, 950, 300)).toBe(1);
  expect(scrollDevelop(300, 950, 300)).toBe(0);
});

// The dots must sit exactly on the cells the photo was sampled into, or the
// print drifts off the photo toward the right and bottom edges.
test("the dot grid spans the tile exactly", () => {
  for (const [w, h] of [[213, 284], [217, 290], [440.5, 587.3], [7, 7]]) {
    const g = dotGrid(w, h, 7);
    expect(g.cols).toBe(Math.ceil(w / 7));
    expect(g.rows).toBe(Math.ceil(h / 7));
    expect(g.cols * g.cw).toBeCloseTo(w, 9);
    expect(g.rows * g.ch).toBeCloseTo(h, 9);
    expect(g.cw).toBeLessThanOrEqual(7);
    expect(g.ch).toBeLessThanOrEqual(7);
  }
});
