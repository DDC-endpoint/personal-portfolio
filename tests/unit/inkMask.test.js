import { inkSvg, inkMask, inkCoverSize } from "@/lib/inkMask";

// The theme switch's ink blot (lib/inkMask.js, ThemeToggle).

test("the blot is the same for every visitor", () => {
  expect(inkSvg().svg).toBe(inkSvg().svg);
  expect(inkSvg(1).svg).not.toBe(inkSvg(2).svg);
});

test("the blot stays inside its box, so no droplet is clipped", () => {
  const { svg } = inkSvg();
  const nums = [...svg.matchAll(/c[xy]="([\d.]+)"/g)].map((m) => +m[1]);
  expect(nums.length).toBeGreaterThan(50);
  for (const n of nums) {
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(1000);
  }
});

test("the solid core is a real share of the box", () => {
  const { core } = inkMask();
  expect(core).toBeGreaterThan(0.18);
  expect(core).toBeLessThan(0.5);
});

test("at full size the core covers the furthest corner", () => {
  const { core } = inkMask();
  for (const reach of [400, 950, 1700, 3200]) {
    expect((inkCoverSize(reach) * core)).toBeGreaterThanOrEqual(reach);
  }
});

test("the mask is a CSS url() of an inline SVG", () => {
  expect(inkMask().url).toMatch(/^url\("data:image\/svg\+xml,%3Csvg/);
});
