import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

// The 404 page's Isometric Board (Phase 6 Task 9).
const board = (page) => page.locator("[data-iso-board]");
const lift = (loc) => loc.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m43);

test("the 404 shows the board above the message, and the link home", async ({ page }) => {
  const errors = trackErrors(page);
  const res = await page.goto("/no-such-page");
  expect(res.status()).toBe(404);
  await expect(board(page)).toBeVisible();
  await expect(board(page)).toHaveAttribute("aria-hidden", "true");
  await expect(board(page).locator("[data-tile]")).toHaveCount(25);
  const boardBottom = await board(page).evaluate((el) => el.getBoundingClientRect().bottom);
  const headingTop = await page.getByRole("heading", { name: "Nothing here." }).evaluate((el) => el.getBoundingClientRect().top);
  expect(boardBottom).toBeLessThanOrEqual(headingTop);
  await expect(page.getByRole("link", { name: "Back to damiandc.com" })).toHaveAttribute("href", "/");
  // The 404 status itself logs a failed resource, and React's dev build warns
  // about the layout's pre-paint <script> on this route (it did before the
  // board, too): neither is the board's.
  expect(errors.filter((e) => !/404|Failed to load resource|Encountered a script tag/.test(e))).toEqual([]);
});

// Next reserves /404 and serves its built-in page there; proxy.js sends it
// to the styled one instead.
test("/404 itself is the styled 404", async ({ page }) => {
  const res = await page.goto("/404");
  expect(res.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Nothing here." })).toBeVisible();
});

test("hovering lifts the tile under the pointer, and it holds", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones tap instead");
  await page.goto("/no-such-page");
  await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
  const tile = board(page).locator('[data-tile="12"]');
  const box = await tile.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const face = tile.locator("[data-face]");
  await expect.poll(() => lift(face), { timeout: 3000 }).toBeGreaterThan(20);
  // A neighbour rises less; a far corner barely moves.
  expect(await lift(board(page).locator('[data-tile="13"] [data-face]'))).toBeLessThan(await lift(face));
  expect(await lift(board(page).locator('[data-tile="0"] [data-face]'))).toBeLessThan(3);
  await page.waitForTimeout(600);
  expect(await lift(face)).toBeGreaterThan(20);
});

test("phones: a tap lifts the tile under it", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phones");
  await page.goto("/no-such-page");
  await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
  const tile = board(page).locator('[data-tile="6"]');
  const box = await tile.boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => lift(tile.locator("[data-face]")), { timeout: 3000 }).toBeGreaterThan(18);
});

test("idle, the wave drifts", async ({ page }) => {
  await page.goto("/no-such-page");
  const face = board(page).locator('[data-tile="0"] [data-face]');
  const a = await lift(face);
  await page.waitForTimeout(700);
  expect(await lift(face)).not.toBeCloseTo(a, 1);
});

test("reduced motion: the settled cluster, still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/no-such-page");
  const peak = board(page).locator('[data-tile="8"] [data-face]'); // row 1, column 3
  await expect.poll(() => lift(peak)).toBeGreaterThan(18);
  const a = await lift(peak);
  await page.waitForTimeout(600);
  expect(await lift(peak)).toBe(a);
  expect(await lift(board(page).locator('[data-tile="20"] [data-face]'))).toBeLessThan(1);
});

test("the lab demo still renders, in its own look", async ({ page, isMobile }) => {
  test.skip(isMobile, "one check is enough");
  const errors = trackErrors(page);
  await page.goto("http://lab.localhost:3000/isometric-board");
  await expect(page.getByText("Iso / 5×5")).toBeVisible({ timeout: 15000 });
  expect(errors).toEqual([]);
});
