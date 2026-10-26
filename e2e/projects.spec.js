import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";
import { card, decodeState, hydrated, scrollToCard, scrollToProgress, trackInfo, visibleCentre, CARD_COUNT } from "./projectsHelpers";

const LABELS = [
  "01 — This Portfolio — 2026",
  "02 — Personal Dashboard — 2026",
  "03 — Aloys Travels — 2026",
  "04 — Spades Solutions — 2026",
  "05 — Danella De Cruz — 2026",
  "06 — Kahatagaha Graphite — 2026",
  "07 — Interact District 3220 — 2026",
  "08 — ai-studio — 2026",
];
const TAN = Math.tan((12 * Math.PI) / 180);

const inViewport = (box, vw, vh) =>
  box.x >= -1 && box.y >= -1 && box.x + box.width <= vw + 1 && box.y + box.height <= vh + 1;

test.describe("desktop", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop strip"));

  test("labels in order", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#work [data-card-label]")).toHaveText(LABELS);
    const last = page.locator("#work [data-strip] > *").last();
    await expect(last).toHaveAttribute("data-end-card", "");
  });

  test("section pins and strip follows 12°", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.25);
    const a = await card(page, 0).boundingBox();
    expect((await page.locator("[data-strip-viewport]").boundingBox()).y).toBeCloseTo(0, 0);
    await scrollToProgress(page, 0.75);
    const b = await card(page, 0).boundingBox();
    expect((await page.locator("[data-strip-viewport]").boundingBox()).y).toBeCloseTo(0, 0);
    const dx = b.x - a.x, dy = b.y - a.y;
    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
    expect(Math.abs(Math.abs(dy / dx) - TAN)).toBeLessThan(0.02);
  });

  test("live cards open in a new tab", async ({ page }) => {
    await page.goto("/");
    await expect(card(page, 2)).toHaveAttribute("target", "_blank");
    await expect(card(page, 2)).toHaveAttribute("rel", /noopener/);
  });

  test("resting pointer decodes the card the strip brings to it", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 1);
    const { vw, vh } = await trackInfo(page);
    const at = { x: vw * 0.3, y: vh * 0.55 };
    await page.mouse.move(at.x, at.y);
    const under = () =>
      page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-card]")?.dataset.card ?? null, at);
    const first = await under();
    expect(first).not.toBeNull();
    await expect.poll(() => decodeState(card(page, first)), { timeout: 5000 }).toBe("shot");
    let next = first;
    for (let i = 0; i < 40 && (next === first || next === null); i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(120);
      next = await under();
    }
    expect(next).not.toBe(first);
    expect(next).not.toBeNull();
    await expect.poll(() => decodeState(card(page, next)), { timeout: 5000 }).toBe("shot");
    await expect.poll(() => decodeState(card(page, first)), { timeout: 5000 }).toBe("skeleton");
  });

  test("tab reaches off-screen cards", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await card(page, 0).focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
    await expect(card(page, 5)).toBeFocused();
    await page.waitForTimeout(300);
    const { vw, vh } = await trackInfo(page);
    expect(inViewport(await card(page, 5).boundingBox(), vw, vh)).toBe(true);
    expect(await page.locator("[data-strip-viewport]").evaluate((el) => el.scrollLeft)).toBe(0);
    await expect.poll(() => decodeState(card(page, 5)), { timeout: 5000 }).toBe("shot");
  });

  test("tabbing past the last card brings the end card into view", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await card(page, 5).focus();
    await page.keyboard.press("Tab");
    const link = page.locator('[data-end-card] a[href="#contact"]');
    await expect(link).toBeFocused();
    await page.waitForTimeout(300);
    const { vw, vh } = await trackInfo(page);
    expect(inViewport(await link.boundingBox(), vw, vh)).toBe(true);
  });

  test("clicking a card that isn't leading opens it without moving the strip", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 1);
    const before = await page.evaluate(() => window.scrollY);
    const { x, y } = await visibleCentre(card(page, 2).locator("[data-shot-area]"));
    const [popup] = await Promise.all([page.context().waitForEvent("page"), page.mouse.click(x, y)]);
    await popup.waitForURL(/^https:\/\/aloys-travels\.com/, { timeout: 20000 });
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("keyboard focus wins over a parked mouse", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await page.mouse.move(1150, 300);
    await card(page, 0).focus();
    await page.keyboard.press("Tab");
    await expect(card(page, 1)).toBeFocused();
    await page.waitForTimeout(800); // settled: the strip has scrolled under the parked pointer
    expect(await card(page, 1).getAttribute("data-active")).toBe("true");
    expect(await card(page, 2).getAttribute("data-active")).toBe("false");
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
  });

  test("without JS the strip is a plain list", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
    expect(pos).not.toBe("sticky");
    await context.close();
  });

  test("screen readers get the blurb as the card's description", async ({ page }) => {
    await page.goto("/");
    const id = await card(page, 2).getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    await expect(page.locator(`[id="${id}"]`)).toHaveText(
      "Website for a travel company: clean booking flows and a design that sells the journey."
    );
  });

  test("enter opens the site", async ({ page }) => {
    await page.goto("/");
    await card(page, 3).focus();
    const [popup] = await Promise.all([page.context().waitForEvent("page"), page.keyboard.press("Enter")]);
    await popup.waitForURL(/^https:\/\/enderguardian25\.github\.io\/spades-solutions/, { timeout: 20000 });
  });

  test("end card types and links", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 1);
    const end = page.locator("[data-end-card]");
    await expect(end.locator("[data-address]")).toHaveText("your-site.com", { timeout: 4000 });
    await expect(end.locator('a[href="#contact"]')).toHaveCount(1);
  });

  test("resize mid-pin keeps the leading card on screen", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.5);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    await scrollToCard(page, 4);
    expect(inViewport(await card(page, 4).boundingBox(), 1280, 720)).toBe(true);
  });

  test("no console errors through the pin", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    for (let i = 0; i <= 10; i++) await scrollToProgress(page, i / 10);
    expect(errors).toEqual([]);
  });
});

test.describe("mobile", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "mobile stack"));

  test("stacked, no pin, alternating offset", async ({ page }) => {
    await page.goto("/");
    const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
    expect(pos).not.toBe("sticky");
    const a = await card(page, 0).boundingBox();
    const b = await card(page, 1).boundingBox();
    expect(b.x).toBeGreaterThan(a.x);
  });

  test("card nearest centre decodes", async ({ page }) => {
    await page.goto("/");
    await card(page, 1).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
    await card(page, 2).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(() => decodeState(card(page, 2)), { timeout: 5000 }).toBe("shot");
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("skeleton");
  });

  test("centring the end card leaves no project card active", async ({ page }) => {
    await page.goto("/");
    await card(page, 7).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(card(page, 7)).toHaveAttribute("data-active", "true");
    await page.locator("[data-end-card]").evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(card(page, 7)).toHaveAttribute("data-active", "false");
  });
});

test("reduced motion is a plain decoded list", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
  expect(pos).not.toBe("sticky");
  for (const i of [0, 1, 2, 3, 4, 5]) {
    await expect(card(page, i).locator("img")).toHaveCSS("opacity", "1");
    await expect(card(page, i).locator("[data-skeleton]")).toBeHidden();
  }
  for (let i = 0; i < CARD_COUNT - 1; i++) await expect(card(page, i)).toHaveAttribute("data-decode", "static");
  await card(page, 2).scrollIntoViewIfNeeded();
  const { x, y } = await visibleCentre(card(page, 2));
  await page.mouse.move(x, y);
  await page.waitForTimeout(800);
  await expect(card(page, 2)).toHaveAttribute("data-decode", "static");
});
