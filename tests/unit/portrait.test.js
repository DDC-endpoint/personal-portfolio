import {
  cellSize, fadeAt, glyphIndex, shadeRGB, revealTime, cellPhase, scanBand, bandWeight,
  flickerCount, buildField, density, glyphAlpha, smoothstep, RAMP,
} from "@/lib/portrait";

test("ramp", () => expect(RAMP).toBe(" .·:;-=+*#%@"));

test("cell 4 geometry", () => {
  const s = cellSize();
  expect(s.font).toBe(6);
  expect(s.cw).toBeCloseTo(3.6);
  expect(s.ch).toBeCloseTo(5.52);
});

test("smoothstep clamps", () => {
  expect(smoothstep(0, 1, -1)).toBe(0);
  expect(smoothstep(0, 1, 2)).toBe(1);
  expect(smoothstep(0, 1, 0.5)).toBe(0.5);
});

test("fade", () => {
  expect(fadeAt(0.5, 0.3)).toBe(1);
  expect(fadeAt(0.5, 0.92)).toBe(0);
  expect(fadeAt(0.5, 0.7)).toBeCloseTo(0.5357, 4);
  expect(fadeAt(0.9, 0.8)).toBeCloseTo(0.0234, 4);
});

test("glyph index", () => {
  expect(glyphIndex(1)).toBe(11);
  expect(glyphIndex(0.5)).toBe(4);
  expect(glyphIndex(0.1)).toBe(1);
});

test("shade by lightness of electric", () => {
  expect(shadeRGB(0, [37, 99, 235], [246, 246, 241])).toEqual([142, 173, 238]);
  expect(shadeRGB(1, [37, 99, 235], [246, 246, 241])).toEqual([37, 99, 235]);
});

test("glyph alpha", () => {
  expect(glyphAlpha(1, 1)).toBe(1);
  expect(glyphAlpha(0, 0.5)).toBeCloseTo(0.275);
});

test("reveal timing", () => {
  const a = 5.52 / 3.6;
  expect(revealTime(80, 49.4, 160, 130, a, 0)).toBeCloseTo(0.3, 6);
  expect(revealTime(0, 0, 160, 130, a, 0)).toBeCloseTo(1.4207, 4);
  expect(revealTime(160, 130, 160, 130, a, 1)).toBeCloseTo(1.9475, 4);
  expect(cellPhase(1.0, 1.3)).toBe("skeleton");
  expect(cellPhase(1.1, 1.3)).toBe("front");
  expect(cellPhase(1.3, 1.3)).toBe("final");
});

test("scan band", () => {
  expect(scanBand(0, 100)).toBe(-8);
  expect(scanBand(1.2, 100)).toBe(50);
  expect(scanBand(3, 100)).toBeNull();
  expect(scanBand(7.2, 100)).toBeCloseTo(50);
  expect(bandWeight(50, 50)).toBe(1);
  expect(bandWeight(52, 50)).toBeCloseTo(Math.exp(-0.5));
});

test("flicker count", () => {
  expect(flickerCount(10, 10)).toBe(1);
  expect(flickerCount(200, 200)).toBeCloseTo(6);
});

test("field: transparent cells are outside, flat image has no NaN", () => {
  // 2×2 cells, ss=3 → 6×6 px; left column opaque mid-grey, right column transparent
  const px = new Uint8ClampedArray(6 * 6 * 4);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 3; x++) px.set([128, 128, 128, 255], (y * 6 + x) * 4);
  const f = buildField(px, 2, 2);
  expect(f.inside).toEqual([0, 2]);
  expect([...f.tone, ...f.edge].every(Number.isFinite)).toBe(true);
});

test("field: a hard luminance edge saturates", () => {
  // 4×1 cells, opaque; left half black, right half white → the boundary cells carry the max edge
  const px = new Uint8ClampedArray(12 * 3 * 4);
  for (let y = 0; y < 3; y++) for (let x = 0; x < 12; x++) {
    const v = x < 6 ? 0 : 255;
    px.set([v, v, v, 255], (y * 12 + x) * 4);
  }
  const f = buildField(px, 4, 1);
  expect(f.edge[1]).toBe(1);
  expect(f.edge[2]).toBe(1);
  expect(f.edge[0]).toBe(0);
});

test("density is 0 outside the figure", () =>
  expect(density({ alpha: [0.1], tone: [0], edge: [1] }, 0, false)).toBe(0));

test("density: dark mode reads tone directly", () => {
  const field = { alpha: [1], tone: [1], edge: [0] };
  expect(density(field, 0, false)).toBeCloseTo(0.05);
  expect(density(field, 0, true)).toBe(1);
});
