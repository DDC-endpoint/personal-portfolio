import { test, expect } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "hover/scroll checks run on desktop"));

// The hero's desktop SERVICES button — a mono button, so it scrambles.
const servicesButton = (page) => page.locator("#top a[href='/services']:visible");
// Scrambling text lives in an aria-hidden span; a static sr-only copy carries the name.
const visible = (el) => el.locator('[aria-hidden="true"]');

// Samples an element's text every 50 ms for 600 ms.
async function samples(loc) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    out.push(await loc.innerText());
    await loc.page().waitForTimeout(50);
  }
  return out;
}

test("section label decodes on entry", async ({ page }) => {
  await page.goto("/");
  const label = page.locator("#about h2.section-label");
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect.poll(() => label.getAttribute("aria-busy"), { timeout: 3000 }).toBe("true");
  await expect(label.locator("[data-letters]")).toHaveText("§ 01 — About", { timeout: 1500 });
  await expect(label).not.toHaveAttribute("aria-busy");
});

test("screen readers get the real section label mid-decode", async ({ page }) => {
  await page.goto("/");
  const label = page.locator("#about h2.section-label");
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect.poll(() => label.getAttribute("aria-busy"), { timeout: 3000 }).toBe("true");
  expect(await page.locator("#about").ariaSnapshot()).toContain('heading "§ 01 — About" [level=2]');
});

test("mono button scrambles without moving", async ({ page }) => {
  await page.goto("/");
  const button = servicesButton(page);
  await expect(button).toBeVisible({ timeout: 5000 });
  const w = (await button.boundingBox()).width;
  await button.hover();
  await expect.poll(() => visible(button).innerText(), { timeout: 1000 }).not.toBe("SERVICES");
  expect(Math.abs((await button.boundingBox()).width - w)).toBeLessThanOrEqual(0.5);
  await expect(page.getByRole("link", { name: "Services" }).first()).toBeVisible();
  await expect.poll(() => visible(button).innerText(), { timeout: 1000 }).toBe("SERVICES");
});

test("underlined links keep their underline and never scramble", async ({ page }) => {
  await page.goto("/");
  const work = page.locator('header nav a[href="#work"]');
  await work.hover();
  expect(new Set(await samples(work))).toEqual(new Set(["WORK"]));
  const pricing = page.locator("#about a[href='/services']");
  await pricing.scrollIntoViewIfNeeded();
  await pricing.hover();
  expect(new Set(await samples(pricing))).toEqual(new Set(["SERVICES & PRICING\n→"]));
});

test("reduced motion never scrambles", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const button = servicesButton(page);
  await button.hover();
  expect(new Set(await samples(visible(button)))).toEqual(new Set(["SERVICES"]));
});
