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
  // The 404 status itself logs a failed resource: not the board's.
  expect(errors.filter((e) => !/404|Failed to load resource/.test(e))).toEqual([]);
});

// The 404 used to reach the browser as Next's empty error shell and render
// client-side, so the layout's pre-paint script never ran: <html> had no
// `js` or `dark`, the 404 was always light, and the curtain (nojs:hidden)
// stayed hidden on every page after it. app/global-not-found.jsx renders it
// on the server, in the site's layout.
test("the 404 is server-rendered in the site's layout, theme included", async ({ page }) => {
  const html = await (await page.request.get("/no-such-page")).text();
  expect(html).not.toContain("__next_error__");
  expect(html).toMatch(/<div[^>]*data-curtain="intro"/);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/no-such-page");
  const has = (name) => page.evaluate((n) => document.documentElement.classList.contains(n), name);
  expect(await has("js")).toBe(true);
  expect(await has("dark")).toBe(true);
});

// The curtain is moving in or covering, and it shows: its root isn't hidden,
// and a panel is on screen.
const curtainShows = (page) =>
  page.waitForFunction(
    () => {
      const c = document.querySelector("[data-curtain]");
      if (!["covering", "covered"].includes(c?.dataset.curtain) || getComputedStyle(c).display === "none") return false;
      return [...c.querySelectorAll("[data-panel]")].some((p) => {
        const r = p.getBoundingClientRect();
        return getComputedStyle(p).display !== "none" && r.top < innerHeight - 50;
      });
    },
    null,
    { timeout: 8000 },
  );
const settled = async (page) => {
  await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
  await expect(page.locator("[data-curtain]")).toHaveAttribute("data-curtain", "idle", { timeout: 9000 });
};

// The 404 is its own document, so the link home is a full load under the
// curtain (Damian: keep the loader beat). Page changes after it keep theirs.
test("the link home is covered by the curtain, and later page changes are too", async ({ page, isMobile }) => {
  test.skip(isMobile, "one check is enough");
  await page.goto("/no-such-page");
  await settled(page);
  await page.getByRole("link", { name: "Back to damiandc.com" }).click();
  await curtainShows(page);
  await page.waitForURL((url) => url.pathname === "/");
  await settled(page);
  await page.locator("header").getByRole("link", { name: /services/i }).first().click();
  await curtainShows(page);
  await page.waitForURL((url) => url.pathname === "/services");
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
