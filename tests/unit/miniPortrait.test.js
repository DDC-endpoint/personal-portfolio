import { MINI_PORTRAIT } from "@/lib/miniPortrait";
import { RAMP } from "@/lib/portrait";

const COLS = 28, ROWS = 21;
const weight = (ch) => RAMP.indexOf(ch);

test("21 rows of 28 characters", () => {
  expect(MINI_PORTRAIT).toHaveLength(ROWS);
  for (const row of MINI_PORTRAIT) expect(row).toHaveLength(COLS);
});

test("only portrait ramp glyphs", () => {
  for (const row of MINI_PORTRAIT) for (const ch of row) expect(RAMP).toContain(ch);
});

test("at least a quarter of the cells are inked", () => {
  const all = MINI_PORTRAIT.join("");
  expect([...all].filter((c) => c !== " ").length / all.length).toBeGreaterThanOrEqual(0.25);
});

test("the figure is denser in the middle than the corners", () => {
  const sum = (r0, r1, c0, c1) => {
    let s = 0;
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) s += weight(MINI_PORTRAIT[r][c]);
    return s / ((r1 - r0) * (c1 - c0));
  };
  const middle = sum(6, 15, 9, 19);
  const corners = (sum(0, 4, 0, 5) + sum(0, 4, COLS - 5, COLS)) / 2;
  expect(middle).toBeGreaterThan(corners);
});
