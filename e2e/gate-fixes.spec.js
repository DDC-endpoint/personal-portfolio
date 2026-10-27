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
  // ...and the custom cursor's ring grows over them, as over every link.
  await expect(page.locator(".cursor-ring")).toHaveCSS("width", "60px");
});

test("privacy: the Google links' arrows nudge up and right on hover", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/privacy");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  for (const link of await page.locator("main a[target='_blank']").all()) {
    const arrow = link.locator("[data-arrow]");
    await expect(arrow).toHaveText("↗");
    await expect(arrow).toHaveAttribute("aria-hidden", "true");
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    // Tailwind 4 moves it with the translate property.
    await expect.poll(() => arrow.evaluate((el) => getComputedStyle(el).translate)).toMatch(/^[1-9][\d.]*px -[1-9][\d.]*px$/);
    await page.mouse.move(5, 5);
  }
});

test("the hero lede is a little wider, and never runs into the portrait", async ({ page }, info) => {
  desktopOnly(info);
  for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
    const { lede, portrait } = await page.evaluate(() => ({
      lede: document.querySelector("#top p").getBoundingClientRect().toJSON(),
      portrait: document.querySelector("[data-portrait]").getBoundingClientRect().toJSON(),
    }));
    if (width === 1440) expect(lede.width).toBeGreaterThan(500);
    expect(lede.right).toBeLessThan(portrait.left - 24);
  }
});

const mobileOnly = (info) => test.skip(info.project.name !== "mobile", "phone");

test("phones: the viewer's arrows sit at the bottom of the screen, clear of the photo", async ({ page }, info) => {
  mobileOnly(info);
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  const tile = page.locator('[data-frame="03"]');
  await expect(tile).toHaveAttribute("data-develop", /.+/);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await tile.click();
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(500);
  const photo = await dialog.locator("[data-viewer-photo]").boundingBox();
  const caption = await dialog.locator("[data-viewer-caption]").boundingBox();
  const vh = page.viewportSize().height;
  for (const name of ["Previous photo", "Next photo"]) {
    const b = await dialog.getByRole("button", { name }).boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(Math.max(photo.y + photo.height, caption.y + caption.height));
    expect(vh - (b.y + b.height)).toBeLessThan(48);
  }
  const prev = await dialog.getByRole("button", { name: "Previous photo" }).boundingBox();
  const next = await dialog.getByRole("button", { name: "Next photo" }).boundingBox();
  expect(prev.x).toBeLessThan(next.x);
  // They still step.
  await dialog.getByRole("button", { name: "Next photo" }).click();
  await expect(dialog.locator("[data-viewer-caption]")).toContainText("FRAME 04");
});

test("desktop: the viewer's arrows stay beside the photo", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  const tile = page.locator('[data-frame="03"]');
  await expect(tile).toHaveAttribute("data-develop", /.+/);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await tile.click();
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await page.waitForTimeout(500);
  const photo = await dialog.locator("[data-viewer-photo]").boundingBox();
  const prev = await dialog.getByRole("button", { name: "Previous photo" }).boundingBox();
  expect(prev.x + prev.width).toBeLessThan(photo.x);
  expect(Math.abs(prev.y + prev.height / 2 - (photo.y + photo.height / 2))).toBeLessThan(60);
});

test("phones: while the year strip is pinned, nothing shows through behind the header", async ({ page }, info) => {
  mobileOnly(info);
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  const strip = page.locator("[data-counter=strip]");
  // Before it pins: no cover above it.
  await strip.scrollIntoViewIfNeeded();
  await expect(strip).not.toHaveAttribute("data-stuck");
  // Pinned mid-Timeline: the strip's background reaches the top of the screen.
  await page.locator("#timeline").evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2));
  await expect(strip).toHaveAttribute("data-stuck", "");
  const cover = await strip.evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    const r = el.getBoundingClientRect();
    return { display: s.display, bg: s.backgroundColor, height: parseFloat(s.height), stripTop: r.top };
  });
  expect(cover.display).toBe("block");
  expect(cover.bg).not.toMatch(/rgba\(.*, 0\)|transparent/);
  expect(cover.height).toBeGreaterThanOrEqual(cover.stripTop);
  // Scrolled past the Timeline: unpinned again.
  await page.locator("#resume").scrollIntoViewIfNeeded();
  await expect(strip).not.toHaveAttribute("data-stuck");
});

test("the viewer's caption is two lines: the frame and month, then the title", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
  const tile = page.locator('[data-frame="03"]');
  await expect(tile).toHaveAttribute("data-develop", /.+/);
  await tile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await tile.click();
  const caption = page.getByRole("dialog", { name: "Photo viewer" }).locator("[data-viewer-caption]");
  await expect(caption).toBeVisible();
  const meta = caption.locator("[data-caption-meta]");
  const title = caption.locator("[data-caption-title]");
  await expect(meta).toHaveText(/^Frame 03 · May 2025$/i);
  await expect(title).toHaveText("Architecture at nightfall", { ignoreCase: true });
  const m = await meta.boundingBox();
  const t = await title.boundingBox();
  expect(t.y).toBeGreaterThanOrEqual(m.y + m.height - 1); // the title is the second line
  // Each is one line on this screen.
  for (const el of [meta, title]) {
    const lines = await el.evaluate((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight)));
    expect(lines).toBe(1);
  }
});
