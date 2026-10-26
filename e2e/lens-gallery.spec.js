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

const scrollTo = (page, y) => page.evaluate((v) => window.scrollTo(0, v), y);
const scrollToFrame = (page, n) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - (innerHeight - r.height) / 2);
  }, `[data-frame="${n}"]`);

// Counts requestAnimationFrame calls made from the develop hook only: Lenis
// and the hero portrait keep their own loops running all the time.
const countDevelopFrames = (page) =>
  page.addInitScript(() => {
    window.__developFrames = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      if (/startDevelop|developFrame/.test(new Error().stack)) window.__developFrames++;
      return raf(cb);
    };
  });

test("photos develop on entering view and reset on leaving", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "halftone");
  await scrollToFrame(page, "05");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing", { timeout: 3000 });
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developed", { timeout: 3000 });
  await scrollTo(page, 0);
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "halftone");
  await scrollToFrame(page, "05");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing", { timeout: 3000 });
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developed", { timeout: 3000 });
});

test("fast scroll leaves no tile stuck", async ({ page }, info) => {
  desktopOnly(info);
  await countDevelopFrames(page);
  await page.goto("/");
  await scrollToFrame(page, "05");
  await expect(frame(page, "05")).toHaveAttribute("data-develop", "developing", { timeout: 3000 });
  expect(await page.evaluate(() => window.__developFrames)).toBeGreaterThan(0); // the probe sees the hook

  const top = await page.locator("#lens").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  for (let i = 0; i < 8; i++) {
    await scrollTo(page, top - 300 + i * 300);
    await page.waitForTimeout(30);
  }
  await scrollTo(page, 0);
  await page.waitForTimeout(200);
  const states = await page.locator("[data-frame]").evaluateAll((els) => els.map((el) => el.dataset.develop));
  expect(states).toEqual(Array(10).fill("halftone"));
  const before = await page.evaluate(() => window.__developFrames);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__developFrames)).toBe(before);
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

test("theme toggle mid-develop keeps going", async ({ page }, info) => {
  desktopOnly(info);
  const errors = trackErrors(page);
  await page.goto("/");
  await scrollToFrame(page, "06");
  await expect(frame(page, "06")).toHaveAttribute("data-develop", "developing", { timeout: 3000 });
  await page.evaluate(() => document.documentElement.classList.toggle("dark"));
  await expect(frame(page, "06")).toHaveAttribute("data-develop", "developed", { timeout: 3000 });
  expect(errors).toEqual([]);
});
