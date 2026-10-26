import { DECODE, hash01, cellThreshold, cellPhase, stepProgress } from "@/lib/cardDecode";

const COLS = 40, ROWS = 25, SEED = 7;

function phases(progress) {
  const out = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) out.push({ c, phase: cellPhase(progress, cellThreshold(c, r, COLS, SEED)) });
  return out;
}

test("timings match the plan", () => {
  expect(DECODE).toEqual({ CELL_PX: 14, BAND: 0.18, DECODE_MS: 700, DISSOLVE_MS: 450, DISSOLVE_DELAY_MS: 600 });
});

test("at progress 0 every cell is skeleton", () => {
  expect(phases(0).every((x) => x.phase === "skeleton")).toBe(true);
});

test("at progress 1 every cell is shot", () => {
  expect(phases(1).every((x) => x.phase === "shot")).toBe(true);
});

test("mid-run the front sweeps left to right", () => {
  const mid = phases(0.5);
  expect(mid.filter((x) => x.c === 0).some((x) => x.phase === "skeleton")).toBe(false);
  expect(mid.filter((x) => x.c === COLS - 1).some((x) => x.phase === "shot")).toBe(false);
  expect(mid.some((x) => x.phase === "noise")).toBe(true);
});

test("hash01 is deterministic and in [0, 1)", () => {
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const h = hash01(c, r, SEED);
      expect(h).toBe(hash01(c, r, SEED));
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
    }
  expect(hash01(3, 4, 1)).not.toBe(hash01(3, 4, 2));
});

test("stepProgress decodes over 700 ms and dissolves over 450 ms", () => {
  expect(stepProgress(0, 1, 350)).toBeCloseTo(0.5, 9);
  expect(stepProgress(1, 0, 450)).toBe(0);
  expect(stepProgress(0.9, 1, 1000)).toBe(1);
});

test("a run reverses from wherever it is", () => {
  expect(stepProgress(0.4, 0, 90)).toBeCloseTo(0.2, 9);
});
