import { CONTACT, growInset, colomboClock, growProgress } from "@/lib/contact";

const box = { W: 1000, H: 500, tile: 96 };

test("copy", () => {
  expect(CONTACT).toEqual({
    headline: ["Got something in ", "mind", "?"],
    body: "Need a website? I design and build them for businesses and creatives, and many go live within a couple of days. Internships, collaborations and good ideas are welcome too. Pick whichever channel suits you.",
    tile: 96,
  });
});

test("the card starts as a tile in the top-left corner", () => {
  expect(growInset(0, box)).toBe("inset(0px 904px 404px 0px round 8px)");
});

test("the card ends fully open", () => {
  expect(growInset(1, box)).toBe("inset(0px 0px 0px 0px round 8px)");
});

test("progress is clamped", () => {
  expect(growInset(-0.5, box)).toBe(growInset(0, box));
  expect(growInset(1.5, box)).toBe(growInset(1, box));
});

test("growth eases and only shrinks the insets", () => {
  const right = (p) => parseFloat(growInset(p, box).split(" ")[1]);
  expect(right(0.5)).toBeCloseTo(452, 0); // ease-in-out is symmetric
  expect(right(0.1)).toBeGreaterThan(904 * 0.9); // slow start
  let prev = Infinity;
  for (let p = 0; p <= 1.0001; p += 0.05) {
    expect(right(p)).toBeLessThanOrEqual(prev);
    prev = right(p);
  }
});

test("Colombo clock is 24-hour local time", () => {
  expect(colomboClock(new Date("2026-10-27T00:00:00Z"))).toBe("Colombo · 05:30");
  expect(colomboClock(new Date("2026-10-27T13:05:00Z"))).toBe("Colombo · 18:35");
});

test("growth spans from the card entering to its top reaching 25%", () => {
  const g = { cardTop: 3000, vh: 1000, maxScroll: 9000 };
  expect(growProgress(3000 - 950, g)).toBe(0);
  expect(growProgress(3000 - 250, g)).toBe(1);
  expect(growProgress(3000 - 600, g)).toBeCloseTo(0.5, 5);
  expect(growProgress(0, g)).toBe(0);
  expect(growProgress(9000, g)).toBe(1);
});

test("growth always completes by the bottom of the page", () => {
  // tall screen: the page ends before the card's top can reach 25%
  const g = { cardTop: 3000, vh: 1600, maxScroll: 2500 };
  expect(growProgress(2500, g)).toBe(1);
  expect(growProgress(3000 - 0.95 * 1600, g)).toBe(0);
  expect(growProgress(2000, g)).toBeGreaterThan(0);
  expect(growProgress(2000, g)).toBeLessThan(1);
});

test("a card that is in view at the very top is already grown", () => {
  expect(growProgress(0, { cardTop: 400, vh: 1000, maxScroll: 0 })).toBe(1);
});
