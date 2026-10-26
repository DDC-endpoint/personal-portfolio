import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";
import { card, decodeState, hoverCard, pointerAway, scrollToCard, visibleCentre } from "./projectsHelpers";

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "hover checks run on desktop"));

// An aborted request logs "Failed to load resource"; anything else is a real error.
const pageErrors = (errors) => errors.filter((e) => !/Failed to load resource/.test(e));

test("hover decodes to shot and shows tags", async ({ page }) => {
  await page.goto("/");
  await hoverCard(page, 2);
  await expect.poll(() => decodeState(card(page, 2)), { timeout: 5000 }).toBe("shot");
  await expect(card(page, 2).locator("[data-reveal]")).toHaveCSS("opacity", "1");
  await expect(card(page, 2).locator("[data-reveal]")).toContainText("Client Work");
});

test("leave waits, then dissolves", async ({ page }) => {
  await page.goto("/");
  await hoverCard(page, 2);
  await expect.poll(() => decodeState(card(page, 2)), { timeout: 5000 }).toBe("shot");
  await pointerAway(page);
  await page.waitForTimeout(300);
  expect(await decodeState(card(page, 2))).toBe("shot");
  await expect.poll(() => decodeState(card(page, 2)), { timeout: 3000 }).toBe("skeleton");
});

test("quick in-out ends as skeleton", async ({ page }) => {
  await page.goto("/");
  await scrollToCard(page, 2);
  // Shot ready first, so the run starts the moment the pointer arrives.
  await card(page, 2).locator("img").evaluate((img) => {
    img.loading = "eager";
    return img.decode();
  });
  await hoverCard(page, 2);
  await page.waitForTimeout(150);
  await pointerAway(page);
  await expect.poll(() => decodeState(card(page, 2)), { timeout: 3000 }).toBe("skeleton");
  await page.waitForTimeout(500);
  expect(await decodeState(card(page, 2))).toBe("skeleton");
});

test("failed screenshot stays a skeleton link", async ({ page }) => {
  const errors = trackErrors(page);
  await page.route("**/projects/aloys-travels.webp", (r) => r.abort());
  await page.goto("/");
  await hoverCard(page, 2);
  await page.waitForTimeout(2000);
  expect(await decodeState(card(page, 2))).toBe("skeleton");
  await expect(card(page, 2)).toHaveJSProperty("tagName", "A");
  await expect(card(page, 2)).toHaveAttribute("href", "https://aloys-travels.com/");
  expect(pageErrors(errors)).toEqual([]);
});

test("upcoming card never decodes", async ({ page }) => {
  await page.goto("/");
  await scrollToCard(page, 6);
  const { x, y } = await visibleCentre(card(page, 6).locator("[data-shot-area]"));
  await page.mouse.move(x, y);
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    seen.add(await decodeState(card(page, 6)));
    await page.waitForTimeout(50);
  }
  expect(seen.has("scrambling")).toBe(true);
  expect(seen.has("shot")).toBe(false);
  await expect.poll(() => decodeState(card(page, 6)), { timeout: 3000 }).toBe("skeleton");
  await expect(card(page, 6).getByText("loading… 2026 →").first()).toBeVisible();
  await expect(card(page, 6)).toHaveJSProperty("tagName", "DIV");
  await expect(card(page, 6).locator("a")).toHaveCount(0);
});

test("theme toggle mid-decode", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await hoverCard(page, 3);
  await page.waitForTimeout(200);
  await page.evaluate(() => document.documentElement.classList.toggle("dark"));
  await expect.poll(() => decodeState(card(page, 3)), { timeout: 5000 }).toBe("shot");
  expect(pageErrors(errors)).toEqual([]);
});
