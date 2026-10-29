import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";
import { card, decodeState, hydrated, scrollToCard, trackInfo, CARD_COUNT } from "./projectsHelpers";
import { progressForCard } from "../lib/strip.js";

// The card's decode, driven by the carousel: the centred card is the active
// one (Phase 6), so "arrive" centres it and "leave" glides to the next card.
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "the strip runs on desktop"));

// An aborted request logs "Failed to load resource"; anything else is a real error.
const pageErrors = (errors) => errors.filter((e) => !/Failed to load resource/.test(e));

const arrive = async (page, i) => {
  await hydrated(page);
  await scrollToCard(page, i);
};
// Scrolls on to the next card without waiting for the glide to settle.
const leave = async (page, i) => {
  const { top, height, vh } = await trackInfo(page);
  await page.evaluate((y) => window.scrollTo(0, y), top + progressForCard(i + 1, CARD_COUNT) * (height - vh));
  await page.waitForTimeout(100);
};

test("centring decodes to shot and shows tags", async ({ page }) => {
  await page.goto("/");
  await arrive(page, 0);
  await expect.poll(() => decodeState(card(page, 0)), { timeout: 5000 }).toBe("shot");
  await expect(card(page, 0).locator("[data-reveal]")).toHaveCSS("opacity", "1");
  await expect(card(page, 0).locator("[data-reveal]")).toContainText("Client Work");
});

test("leaving waits, then dissolves", async ({ page }) => {
  await page.goto("/");
  await arrive(page, 1);
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
  await leave(page, 1);
  expect(await decodeState(card(page, 1))).toBe("shot");
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 3000 }).toBe("skeleton");
});

test("tags and blurb stay while the screenshot does", async ({ page }) => {
  await page.goto("/");
  await arrive(page, 1);
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
  await leave(page, 1);
  expect(await decodeState(card(page, 1))).toBe("shot");
  await expect(card(page, 1).locator("[data-reveal]")).toHaveCSS("opacity", "1");
});

test("coming back during the dissolve turns back to the screenshot", async ({ page }) => {
  await page.goto("/");
  await arrive(page, 1);
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
  await leave(page, 1);
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 2000, intervals: [20] }).toBe("dissolving");
  await scrollToCard(page, 1);
  const seen = new Set();
  for (let i = 0; i < 25; i++) {
    seen.add(await decodeState(card(page, 1)));
    await page.waitForTimeout(40);
  }
  expect(seen.has("skeleton")).toBe(false);
  await expect.poll(() => decodeState(card(page, 1)), { timeout: 3000 }).toBe("shot");
});

test("failed screenshot stays a skeleton link", async ({ page }) => {
  const errors = trackErrors(page);
  await page.route("**/projects/aloys-travels.webp*", (r) => r.abort());
  await page.goto("/");
  await arrive(page, 0);
  await page.waitForTimeout(2000);
  expect(await decodeState(card(page, 0))).toBe("skeleton");
  await expect(card(page, 0)).toHaveJSProperty("tagName", "A");
  await expect(card(page, 0)).toHaveAttribute("href", "https://aloys-travels.com/");
  expect(pageErrors(errors)).toEqual([]);
});

test("theme toggle mid-decode", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await arrive(page, 3);
  await page.waitForTimeout(200);
  await page.evaluate(() => document.documentElement.classList.toggle("dark"));
  await expect.poll(() => decodeState(card(page, 3)), { timeout: 5000 }).toBe("shot");
  expect(pageErrors(errors)).toEqual([]);
});
