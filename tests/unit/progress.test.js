import { followStep, PROGRESS_LAG } from "@/lib/motion";

// The scroll bar's follow (components/ScrollProgress.jsx): it may lag the
// scroll, but must never pass it and come back (the old spring did).

test("one time constant covers 1 - 1/e of the gap", () => {
  expect(followStep(0, 1, PROGRESS_LAG)).toBeCloseTo(1 - Math.exp(-1), 10);
});

test("each step lands between where it was and the target", () => {
  for (const dt of [1 / 240, 1 / 60, 1 / 10, 1]) {
    const up = followStep(0.2, 0.5, dt);
    expect(up).toBeGreaterThan(0.2);
    expect(up).toBeLessThanOrEqual(0.5);
    const down = followStep(0.5, 0.2, dt);
    expect(down).toBeLessThan(0.5);
    expect(down).toBeGreaterThanOrEqual(0.2);
  }
});

test("a scroll that eases to a stop is never overshot", () => {
  // Lenis-style ease-out from 0 to 0.02 over 1.15 s, sampled at 240 Hz.
  const dt = 1 / 240;
  let shown = 0;
  for (let t = 0; t <= 2; t += dt) {
    const p = Math.min(1, t / 1.15);
    const target = 0.02 * Math.min(1, 1.001 - Math.pow(2, -10 * p));
    const next = followStep(shown, target, dt);
    expect(next).toBeGreaterThanOrEqual(shown); // never steps back
    expect(next).toBeLessThanOrEqual(target + 1e-12); // never ahead
    shown = next;
  }
});

test("a zero or negative frame time doesn't move it", () => {
  expect(followStep(0.3, 0.6, 0)).toBe(0.3);
  expect(followStep(0.3, 0.6, -0.01)).toBe(0.3);
});
