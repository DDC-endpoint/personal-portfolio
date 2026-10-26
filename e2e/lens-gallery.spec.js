import { test, expect } from "@playwright/test";
import { FRAMES, LENS_NOTE } from "../lib/lens.js";

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
