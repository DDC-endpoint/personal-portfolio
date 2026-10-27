import { test, expect } from "@playwright/test";
import { FRAMES, LENS_NOTE } from "../lib/lens.js";
import { trackErrors } from "./helpers";

const frame = (page, n) => page.locator(`[data-frame="${n}"]`);
const dashOffset = (loc) =>
  loc.locator("[data-highlight] rect").evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset));
const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop layout");
const mobileOnly = (info) => test.skip(info.project.name !== "mobile", "phone layout");

// Brings the gallery into view without leaving the pointer over a tile.
async function toLens(page, n = "01") {
  await page.goto("/");
  await frame(page, n).scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(300);
}

test("ten frames in reading order with captions", async ({ page }) => {
  await page.goto("/");
  const tiles = page.locator("#lens [data-lens-grid] [data-frame]");
  await expect(tiles).toHaveCount(10);
  expect(await tiles.evaluateAll((els) => els.map((el) => el.dataset.frame))).toEqual(FRAMES.map((f) => f.n));
  for (const [i, f] of FRAMES.entries()) {
    await expect(tiles.nth(i)).toHaveAccessibleName(new RegExp(f.caption));
  }
});

test("desktop grid places the hero tiles 2×2", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page);
  const hero = await frame(page, "01").boundingBox();
  const single = await frame(page, "02").boundingBox();
  const gap = 16;
  expect(Math.abs(hero.width - (2 * single.width + gap))).toBeLessThanOrEqual(3);
  expect(Math.abs(hero.height - (2 * single.height + gap))).toBeLessThanOrEqual(3);
  // a single tile is 3:4 overall
  expect(single.height / single.width).toBeCloseTo(4 / 3, 1);
  const grid = await page.locator("[data-lens-grid]").boundingBox();
  const right = await frame(page, "04").boundingBox();
  expect(Math.abs(right.x + right.width - (grid.x + grid.width))).toBeLessThanOrEqual(1);
});

test("captions hide at rest and show on hover", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "02");
  const caption = frame(page, "02").locator("[data-caption]");
  expect(await caption.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await frame(page, "02").hover();
  await page.waitForTimeout(600); // pointer resting, no movement
  expect(await caption.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("highlighter traces on hover and on keyboard focus", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "02");
  expect(await dashOffset(frame(page, "02"))).toBe(1);
  await frame(page, "02").hover();
  await page.waitForTimeout(700);
  expect(await dashOffset(frame(page, "02"))).toBe(0);

  await page.mouse.move(2, 2);
  await frame(page, "02").focus();
  await page.keyboard.press("Tab");
  await expect(frame(page, "03")).toBeFocused();
  await page.waitForTimeout(700);
  expect(await dashOffset(frame(page, "03"))).toBe(0);
});

test("phones put captions under the photo", async ({ page }, info) => {
  mobileOnly(info);
  await toLens(page, "02");
  const photo = await frame(page, "02").locator("[data-photo]").boundingBox();
  const caption = await frame(page, "02").locator("[data-caption]").boundingBox();
  expect(caption.y).toBeGreaterThanOrEqual(photo.y + photo.height - 0.5);
  expect(await frame(page, "02").locator("[data-caption]").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("note tile links to Instagram", async ({ page }) => {
  await page.goto("/");
  const link = page.locator("[data-lens-note] a");
  await expect(link).toHaveAttribute("href", LENS_NOTE.href);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
});

// ---- Halftone develop -------------------------------------------------------
// The develop follows scroll (lib/halftone.js scrollDevelop): 0 while a tile's
// top is at the screen's bottom edge, 1 once its centre reaches the centre.

const scrollTo = (page, y) => page.evaluate((v) => window.scrollTo(0, v), y);
// Brings frame n just past fully developed (20 px above the centre).
const scrollToFrame = (page, n) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - (innerHeight - r.height) / 2 + 20);
  }, `[data-frame="${n}"]`);
// Scrolls so frame n has developed to t.
const scrollToDevelop = (page, n, t) =>
  page.evaluate(
    ([s, tt]) => {
      const r = document.querySelector(s).getBoundingClientRect();
      const vh = innerHeight;
      window.scrollTo(0, r.top + window.scrollY - (vh - (tt * (vh + r.height)) / 2));
    },
    [`[data-frame="${n}"]`, t]
  );
const photoOpacity = (page, n) =>
  frame(page, n).locator("[data-photo] img").evaluate((el) => parseFloat(getComputedStyle(el).opacity));

test("the develop follows scroll both ways", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "halftone");
  await scrollToDevelop(page, "05", 0.5);
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing");
  const mid = await photoOpacity(page, "05");
  expect(mid).toBeGreaterThan(0.2);
  expect(mid).toBeLessThan(0.5);
  await page.waitForTimeout(1500); // no timer: holding still holds the develop
  expect(await photoOpacity(page, "05")).toBeCloseTo(mid, 2);
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing");

  await scrollToFrame(page, "05");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developed");
  expect(await photoOpacity(page, "05")).toBe(1);

  // scrolling back up uncures it, through the same states
  await scrollToDevelop(page, "05", 0.5);
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing");
  await expect.poll(() => photoOpacity(page, "05")).toBeCloseTo(mid, 2);
  await scrollToDevelop(page, "05", -0.2);
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "halftone");
  expect(await photoOpacity(page, "05")).toBe(0);
});

test("a photo above the screen stays in colour", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await page.evaluate(() => {
    const r = document.querySelector('[data-frame="05"]').getBoundingClientRect();
    window.scrollTo(0, r.bottom + window.scrollY + 200);
  });
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developed");
  expect(await photoOpacity(page, "05")).toBe(1);
});

test("fast scroll leaves every tile matching its position", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  const top = await page.locator("#lens").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  for (const dy of [600, -300, 1200, 300, 1500, 0, 900, 450]) {
    await scrollTo(page, top - 300 + dy);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(300);
  const { states, expected } = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll("[data-frame]")];
    return {
      states: tiles.map((el) => el.dataset.develop),
      expected: tiles.map((el) => {
        const r = el.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (innerHeight - r.top) / ((innerHeight + r.height) / 2)));
        return t === 0 ? "halftone" : t === 1 ? "developed" : "developing";
      }),
    };
  });
  expect(states).toEqual(expected);
  expect(new Set(states).size).toBeGreaterThan(1); // the settle point straddles the states
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion shows colour", async ({ page }) => {
    await page.goto("/");
    await frame(page, "01").scrollIntoViewIfNeeded();
    await expect(page.locator('[data-frame][data-develop="static"]')).toHaveCount(10);
    const opacities = await page.locator("[data-frame] [data-photo] img").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities).toEqual(Array(10).fill("1"));
  });
});

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("no-JS shows the photos", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    const img = frame(page, "01").locator("[data-photo] img");
    expect(await img.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });
});

test("theme toggle mid-develop repaints the print", async ({ page }, info) => {
  desktopOnly(info);
  const errors = trackErrors(page);
  await page.goto("/");
  await scrollToDevelop(page, "06", 0.4);
  await expect(frame(page, "06")).toHaveAttribute("data-develop", "developing");
  await page.waitForFunction(() => document.querySelector('[data-frame="06"] img').complete);
  const field = () =>
    frame(page, "06").locator("canvas").evaluate((c) => [...c.getContext("2d").getImageData(1, 1, 1, 1).data].join());
  const before = await field();
  await page.evaluate(() => document.documentElement.classList.toggle("dark"));
  await expect.poll(field).not.toBe(before); // the field follows the theme mid-develop
  await expect(frame(page, "06")).toHaveAttribute("data-develop", "developing");
  expect(errors).toEqual([]);
});

test.describe("dark theme", () => {
  test.beforeEach(({ page }) => page.addInitScript(() => localStorage.setItem("theme", "dark")));
  test("hover captions stay light on a navy wash", async ({ page }, info) => {
    desktopOnly(info);
    await toLens(page, "02");
    await frame(page, "02").hover();
    await page.waitForTimeout(600);
    const c = frame(page, "02").locator("[data-caption]");
    expect(await c.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(246, 246, 241)");
    // the ink/72 wash serialises as rgba or as oklab, depending on the engine
    expect(await c.evaluate((el) => getComputedStyle(el).backgroundImage)).toMatch(
      /rgba\(11, 31, 58, 0\.72\)|oklab\(0\.239\d* -0\.013\d* -0\.056\d* \/ 0\.72\)/
    );
  });
});

test("resize repaints the print at once and samples once it settles", async ({ page }, info) => {
  desktopOnly(info);
  await page.addInitScript(() => {
    window.__samples = 0;
    const cib = window.createImageBitmap.bind(window);
    // Lens tiles only: the hero portrait resamples its own blob on resize
    window.createImageBitmap = (...a) => (a[0]?.closest?.("[data-frame]") && window.__samples++, cib(...a));
  });
  await page.goto("/");
  await scrollToFrame(page, "05"); // load the photos
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developed", { timeout: 5000 });
  await scrollTo(page, 0);
  await expect(page.locator('[data-frame][data-develop="halftone"]')).toHaveCount(10);
  // every photo loaded and sampled, so only the resize can sample from here
  await page.waitForFunction(() => [...document.querySelectorAll("[data-frame] img")].every((i) => i.complete));
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => window.__samples);
  for (const w of [1420, 1400, 1380, 1360, 1340]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(20);
  }
  const painted = await frame(page, "02").locator("canvas").evaluate((c) => {
    const d = c.getContext("2d").getImageData(1, 1, 1, 1).data;
    return d[3];
  });
  expect(painted).toBe(255); // the ivory field is there, not a blank mat
  await page.waitForTimeout(600);
  // Debounced, that's about one sample per tile (10). Without the debounce it
  // is one per tile per resize (50). Under full-suite load a resize step can
  // outlast the 150 ms debounce and add a sample, so allow up to two per tile.
  expect(await page.evaluate(() => window.__samples) - before).toBeLessThan(20);
});

test("a hero tile taller than the screen still develops", async ({ page }, info) => {
  desktopOnly(info);
  await page.setViewportSize({ width: 740, height: 300 });
  await page.goto("/");
  await scrollToFrame(page, "01");
  await expect(frame(page, "01")).toHaveAttribute("data-develop", "developed", { timeout: 5000 });
});
