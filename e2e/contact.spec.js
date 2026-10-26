import { test, expect } from "@playwright/test";

const card = (page) => page.locator("[data-contact-card]");
const clip = (page) => card(page).evaluate((el) => getComputedStyle(el).clipPath);
const rightInset = async (page) => parseFloat((await clip(page)).match(/^inset\(\S+ (\S+)/)[1]);
// Computed style serialises the full clip in its shortest form.
const FULL = /^inset\(0px( 0px){0,3} round 8px\)$/;
const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop");

// Scrolls so the card's top sits at fraction f of the viewport height.
const cardTopAt = (page, f) =>
  page.evaluate((ff) => {
    const r = document.querySelector("[data-contact-card]").getBoundingClientRect();
    window.scrollTo(0, r.top + window.scrollY - ff * innerHeight);
  }, f);

// The growth effect is live once it has written the first clip.
const grown = (page) => expect.poll(() => clip(page)).toMatch(/^inset/);

test("card grows with scroll and shrinks back", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await cardTopAt(page, 0.9);
  await grown(page);
  await expect.poll(() => rightInset(page)).toBeGreaterThan(500);
  await cardTopAt(page, 0.2);
  await expect.poll(() => clip(page)).toMatch(FULL);
  await cardTopAt(page, 0.9);
  await expect.poll(() => rightInset(page)).toBeGreaterThan(500);
});

test("content and links", async ({ page }) => {
  await page.goto("/");
  const c = card(page);
  await expect(c.locator("h2")).toHaveText("Got something in mind?");
  await expect(c.getByRole("link", { name: /hello@damiandc\.com/ })).toHaveAttribute("href", /^mailto:hello@damiandc\.com/);
  await expect(c.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\//);
  await expect(c.locator("[data-social]")).toHaveCount(4);
  await expect(c.locator("[data-availability]")).toHaveText("Available · 2026");
});

test("clock shows Colombo time", async ({ page }) => {
  await page.goto("/");
  await expect(card(page).locator("[data-clock]")).toHaveText(/^Colombo · \d{2}:\d{2}$/, { timeout: 2000 });
});

test("focus opens the card", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await cardTopAt(page, 0.9);
  await grown(page);
  await expect.poll(() => rightInset(page)).toBeGreaterThan(500);
  const email = card(page).getByRole("link", { name: /hello@damiandc\.com/ });
  await email.evaluate((el) => el.focus({ preventScroll: true }));
  await expect.poll(() => clip(page)).toMatch(FULL);
  const content = card(page).locator("[data-contact-content]");
  await expect.poll(() => content.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  // still held open while focus stays inside, even as scroll moves
  await page.mouse.wheel(0, -40);
  await page.waitForTimeout(300);
  expect(await clip(page)).toMatch(FULL);
  // focus leaving the card hands it back to scroll
  await page.evaluate(() => document.activeElement.blur());
  await cardTopAt(page, 0.9);
  await expect.poll(() => rightInset(page)).toBeGreaterThan(500);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion is full width", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    await cardTopAt(page, 0.9);
    await page.waitForTimeout(500);
    expect(await clip(page)).toBe("none");
  });
});

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("no-JS is full width", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    expect(await clip(page)).toBe("none");
    expect(await card(page).locator("[data-contact-content]").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });
});

test("buttons keep their width while scrambling", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await cardTopAt(page, 0.2);
  await expect.poll(() => clip(page)).toMatch(FULL);
  const email = card(page).getByRole("link", { name: /hello@damiandc\.com/ });
  const before = (await email.boundingBox()).width;
  await email.hover();
  const widths = [];
  for (let i = 0; i < 10; i++) {
    widths.push((await email.boundingBox()).width);
    await page.waitForTimeout(30);
  }
  expect(widths).toEqual(Array(10).fill(before));
});
