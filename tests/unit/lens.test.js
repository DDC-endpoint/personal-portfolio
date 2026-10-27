import { existsSync } from "node:fs";
import { join } from "node:path";
import { FRAMES, LENS_NOTE, LENS_INTRO } from "@/lib/lens";

// design.md → Lens table, in reading order.
const TABLE = [
  ["Sigiriya, from Pidurangala", "May 2026"],
  ["Small tenant", "Apr 2026"],
  ["Architecture at nightfall", "May 2025"],
  ["Storm light", "Sep 2026"],
  ["Pink in the green", "Jan 2026"],
  ["Thalpe, low tide", "Sep 2025"],
  ["A dahlia after dark, Nuwara Eliya", "Jan 2026"],
  ["Above the mist, Sigiriya", "Jan 2026"],
  ["Colombo skyline, blue hour", "Oct 2025"],
  ["Getting lost up Ella Rock", "Jan 2026"],
];

test("ten frames numbered in table order, captions verbatim", () => {
  expect(FRAMES.map((f) => f.n)).toEqual(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  expect(FRAMES.map((f) => [f.caption, f.month])).toEqual(TABLE);
});

test("only frames 01 and 04 are 2×2 heroes", () => {
  expect(FRAMES.filter((f) => f.hero).map((f) => f.n)).toEqual(["01", "04"]);
  for (const f of FRAMES) {
    const w = f.area.col[1] - f.area.col[0];
    const h = f.area.row[1] - f.area.row[0];
    expect([w, h]).toEqual(f.hero ? [2, 2] : [1, 1]);
  }
});

test("areas tile the 6×3 grid exactly, note included", () => {
  const cells = new Map();
  for (const { area, n } of [...FRAMES, { area: LENS_NOTE.area, n: "note" }]) {
    for (let c = area.col[0]; c < area.col[1]; c++)
      for (let r = area.row[0]; r < area.row[1]; r++) {
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(6);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(3);
        const key = `${c},${r}`;
        expect(cells.has(key), `${n} overlaps ${cells.get(key)} at ${key}`).toBe(false);
        cells.set(key, n);
      }
  }
  expect(cells.size).toBe(18);
});

test("every photo exists under public/", () => {
  for (const f of FRAMES) {
    expect(f.src).toMatch(/^\/photography\/.+\.jpg$/);
    expect(existsSync(join("public", decodeURI(f.src))), f.src).toBe(true);
  }
});

test("note and intro copy", () => {
  expect(LENS_NOTE).toEqual({
    count: "10",
    range: "2025 – 2026 · Sri Lanka",
    note: "Private account. Request access for the full feed.",
    handle: "@nothing._.ddc",
    href: "https://www.instagram.com/nothing._.ddc/",
    area: { col: [5, 7], row: [3, 4] },
  });
  expect(LENS_INTRO).toBe(
    "Shot on a Nothing Phone (3a) Pro: light, geometry and the occasional accident. The feed is private; this is the cut I share."
  );
});
