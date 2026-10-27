import { ENTRIES, litCount, circuitPoints, traceAt, counterYear, padLabel } from "@/lib/timeline";

test("ten entries, oldest first, Head Prefect after A-Levels", () => {
  expect(ENTRIES.map((e) => `${e.year} · ${e.title}`)).toEqual([
    "2018 · Where it began",
    "2020 · Video games as a hobby",
    "2022–2024 · Edexcel A-Levels",
    "2024–2025 · Head Prefect",
    "2024 · First lines of code",
    "Sep 2025 · Began BSc (Hons) Computer Science",
    "2025–2026 · Completed first year",
    "Sep 2026 · Began second year",
    "2026 · Personal Dashboard",
    "2026 · This portfolio",
  ]);
  expect(ENTRIES[3]).toEqual({
    year: "2024–2025",
    title: "Head Prefect",
    place: "St. Joseph's College, Colombo 10",
    detail: "Led the student body as Head Prefect in the year after my A-Levels.",
  });
});

test("copy is verbatim from copy.md", () => {
  expect(ENTRIES[0]).toEqual({
    year: "2018",
    title: "Where it began",
    place: "Self-taught · Scratch, Micro:bit & Arduino",
    detail: "My first taste of making things: block-coding in Scratch, then wiring up a Micro:bit and an Arduino.",
  });
  expect(ENTRIES[2].detail).toBe(
    "Pearson Edexcel IAL in Mathematics, Physics and Chemistry, alongside serving as Senior Prefect and Interact Club President."
  );
  expect(ENTRIES[9].detail).toBe(
    "Designed and built this site as a living journal of my work. I'll keep refining it through the rest of university."
  );
  for (const e of ENTRIES) {
    expect(e.year).not.toMatch(/—| - /); // ranges use an en dash
    expect(e.detail).not.toMatch(/—/);
  }
});

test("litCount counts thresholds at or below progress", () => {
  expect(litCount(0.5, [0.1, 0.4, 0.6])).toBe(2);
  expect(litCount(0.4, [0.1, 0.4, 0.6])).toBe(2);
  expect(litCount(1, [0.1, 0.4, 0.6])).toBe(3);
  expect(litCount(0, [0.1, 0.4, 0.6])).toBe(0);
  expect(litCount(0.5, [])).toBe(0);
});

// The circuit trace (Damian): it meets every milestone's pad on the rail's
// axis and jogs out to a side lane between pads with 45° bends, alternating
// sides, so it reads as a circuit-board track.
test("the trace meets every pad on the axis and runs top to bottom", () => {
  const pts = circuitPoints([100, 300, 500], 600, 12);
  expect(pts[0]).toEqual([0, 0]);
  expect(pts.at(-1)).toEqual([0, 600]);
  for (const y of [100, 300, 500]) expect(pts).toContainEqual([0, y]);
  for (let i = 1; i < pts.length; i++) expect(pts[i][1]).toBeGreaterThanOrEqual(pts[i - 1][1]);
});

test("between pads the trace jogs to alternating lanes at 45°", () => {
  const pts = circuitPoints([100, 300, 500], 600, 12);
  expect(traceAt(pts, 200)).toBe(12);
  expect(traceAt(pts, 400)).toBe(-12);
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i][0] - pts[i - 1][0]), dy = pts[i][1] - pts[i - 1][1];
    if (dx) expect(dx).toBe(dy);
  }
});

test("traceAt follows the trace and stays on the axis past its ends", () => {
  const pts = circuitPoints([100, 300], 400, 12);
  expect(traceAt(pts, 100)).toBe(0);
  expect(traceAt(pts, 300)).toBe(0);
  expect(traceAt(pts, -5)).toBe(0);
  expect(traceAt(pts, 999)).toBe(0);
  expect(traceAt(pts, 124)).toBe(6); // halfway along the first bend
});

test("pads too close for a jog are joined straight", () => {
  const pts = circuitPoints([100, 120], 200, 12);
  expect(traceAt(pts, 110)).toBe(0);
});

test("the counter shows each entry's first year", () => {
  expect(ENTRIES.map(counterYear)).toEqual(["2018", "2020", "2022", "2024", "2024", "2025", "2025", "2026", "2026", "2026"]);
});

test("pads are labelled P01 to P10", () => {
  expect(padLabel(0)).toBe("P01");
  expect(padLabel(9)).toBe("P10");
});
