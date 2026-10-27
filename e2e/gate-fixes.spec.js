import { test, expect } from "@playwright/test";

// Damian's last Phase 5 gate fixes: privacy links underline their words only,
// closing the Lens viewer never moves the page, and the electric cards'
// buttons change colour when highlighted.

const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop");

test("privacy: each link at the end is as wide as its words, not the column", async ({ page }) => {
  await page.goto("/privacy");
  const links = page.locator("main a[href^='mailto:'], main a[target='_blank']");
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) {
    const { width, column, text } = await link.evaluate((a) => {
      const range = document.createRange();
      range.selectNodeContents(a);
      return { width: a.getBoundingClientRect().width, column: a.parentElement.getBoundingClientRect().width, text: range.getBoundingClientRect().width };
    });
    expect(width).toBeLessThan(column - 40);
    expect(width - text).toBeLessThan(4);
  }
});

test.describe("the Lens viewer", () => {
  const frame = (page, n) => page.locator(`[data-frame="${n}"]`);
  const dialog = (page) => page.getByRole("dialog", { name: "Photo viewer" });

  test("closing on a photo whose tile is off-screen leaves the page where it was", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
    // Scroll frame 01's tile just above the screen, open a tile still on
    // screen, then step round to frame 01.
    await expect(frame(page, "01")).toHaveAttribute("data-develop", /.+/);
    await frame(page, "01").evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom + 10));
    await page.waitForTimeout(400);
    expect(await frame(page, "01").evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(0);
    const low = await page.evaluate(() => {
      for (const el of document.querySelectorAll("[data-frame]")) {
        const r = el.getBoundingClientRect();
        if (r.top >= 0 && r.bottom <= innerHeight) return el.dataset.frame;
      }
    });
    expect(low).toBeTruthy();
    await frame(page, low).click();
    await expect(dialog(page)).toBeVisible();
    await page.waitForTimeout(500);
    const caption = dialog(page).locator("[data-viewer-caption]");
    for (let i = 0; i < 10 && !(await caption.innerText()).includes("FRAME 01"); i++) await page.keyboard.press("ArrowRight");
    await expect(caption).toContainText("FRAME 01");
    const y = await page.evaluate(() => scrollY);
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThanOrEqual(1);
    // Focus is back on that frame's tile, without scrolling to it.
    expect(await page.evaluate(() => document.activeElement?.dataset.frame)).toBe("01");
  });
});

test.describe("the electric cards' buttons", () => {
  const bg = (loc) => loc.evaluate((a) => getComputedStyle(a).backgroundColor);

  for (const [path, card] of [["/", "#contact"], ["/services", "#start"]]) {
    test(`${path}: both buttons change colour on hover and on keyboard focus`, async ({ page }, info) => {
      desktopOnly(info);
      await page.goto(path);
      await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
      const buttons = page.locator(`${card} [data-electric-card] a.rounded-full`);
      await expect(buttons).toHaveCount(2);
      await buttons.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(800); // the card grows open with scroll
      for (const button of await buttons.all()) {
        const rest = await bg(button);
        await button.hover();
        await expect.poll(() => bg(button)).not.toBe(rest);
        await page.mouse.move(5, 5);
        await expect.poll(() => bg(button)).toBe(rest);
        await button.focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab"); // keyboard focus, so :focus-visible
        await expect.poll(() => bg(button)).not.toBe(rest);
        await button.blur();
      }
    });
  }
});

test("the FAQ questions keep the custom cursor (no pointer finger)", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/services");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("js-cursor"));
  const question = page.locator("#faq summary").first();
  await question.scrollIntoViewIfNeeded();
  await question.hover();
  await expect(question).toHaveCSS("cursor", "none");
});

test("dark mode: the stamp's halo fades out over a longer, softer edge", async ({ page }, info) => {
  desktopOnly(info);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/services");
  await page.locator(".intro-stamp[data-glyphs]").waitFor({ timeout: 8000 });
  const halo = await page.locator(".intro-stamp").evaluate((s) => {
    const first = getComputedStyle(s).backgroundImage.split(/radial-gradient/)[1];
    const stops = [...first.matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1]));
    return { stops, r: Math.max(150, 0.24 * Math.min(innerWidth, innerHeight)) };
  });
  expect(halo.stops.length).toBeGreaterThanOrEqual(6);
  expect(Math.max(...halo.stops)).toBeGreaterThan(halo.r * 1.5);
});
