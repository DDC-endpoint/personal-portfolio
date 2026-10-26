import { ENTRIES, litCount } from "@/lib/timeline";

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
