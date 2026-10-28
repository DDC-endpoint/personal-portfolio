import { test, expect } from "@playwright/test";

// The Isometric Board on the electric contact cards (Phase 6 gate, Damian:
// placement A, beside the text; ivory glass tiles; the 404's motion).
const CARDS = [
  ["/", "[data-contact-card]"],
  ["/services", "#start [data-electric-card]"],
];
const lift = (loc) => loc.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m43);

for (const [path, sel] of CARDS) {
  test.describe(path, () => {
    const open = async (page) => {
      await page.goto(path);
      await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
      const card = page.locator(sel);
      await card.scrollIntoViewIfNeeded();
      // Scroll on until the card has grown fully open.
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 40);
      }, sel);
      await page.waitForTimeout(900);
      return card;
    };

    test("the board sits beside the text (above it on phones), hidden from screen readers", async ({ page, isMobile }) => {
      const card = await open(page);
      const board = card.locator("[data-iso-board]");
      await expect(board).toHaveCount(1);
      await expect(board).toHaveAttribute("aria-hidden", "true");
      await expect(board.locator("[data-tile]")).toHaveCount(25);
      const b = await board.boundingBox();
      const h2 = await card.locator("h2").boundingBox();
      if (isMobile) expect(b.y + b.height).toBeLessThanOrEqual(h2.y);
      else expect(b.x).toBeGreaterThanOrEqual(h2.x + h2.width - 1);
      // Inside the card.
      const c = await card.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(c.x - 1);
      expect(b.x + b.width).toBeLessThanOrEqual(c.x + c.width + 1);
    });

    test("ivory glass tiles", async ({ page }) => {
      const card = await open(page);
      const face = card.locator('[data-iso-board] [data-tile="0"] [data-face]');
      expect(await face.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/^(rgba\(246, 246, 241, 0\.12\)|oklab|color\()/);
      expect(await face.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe("rgb(251, 251, 247)");
    });

    test("hovering lifts the tile under the pointer", async ({ page, isMobile }) => {
      test.skip(isMobile, "phones tap");
      const card = await open(page);
      const tile = card.locator('[data-iso-board] [data-tile="12"]');
      const box = await tile.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect.poll(() => lift(tile.locator("[data-face]")), { timeout: 3000 }).toBeGreaterThan(20);
    });
  });
}

test("reduced motion: the settled cluster on the cards too", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services");
  const peak = page.locator('#start [data-iso-board] [data-tile="8"] [data-face]');
  await peak.scrollIntoViewIfNeeded();
  await expect.poll(() => lift(peak)).toBeGreaterThan(18);
});
