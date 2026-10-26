import { test, expect } from "@playwright/test";

test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "hover/scroll checks run on desktop"));

const workLink = (page) => page.locator('header nav a[href="#work"]');
// The visible label — the link also holds a static sr-only copy for its name.
const visible = (link) => link.locator('[aria-hidden="true"]');

test("section label decodes on entry", async ({ page }) => {
  await page.goto("/");
  const label = page.locator("#about h2.section-label");
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect.poll(() => label.getAttribute("aria-busy"), { timeout: 3000 }).toBe("true");
  await expect(label).toHaveText("§ 01 — About", { timeout: 1500 });
  await expect(label).not.toHaveAttribute("aria-busy");
});

test("nav link scrambles without moving", async ({ page }) => {
  await page.goto("/");
  const link = workLink(page);
  const w = (await link.boundingBox()).width;
  await link.hover();
  await expect.poll(() => visible(link).innerText(), { timeout: 1000 }).not.toBe("WORK");
  expect(Math.abs((await link.boundingBox()).width - w)).toBeLessThanOrEqual(0.5);
  await expect(page.getByRole("link", { name: "Work", exact: true })).toHaveCount(1);
  await expect.poll(() => visible(link).innerText(), { timeout: 1000 }).toBe("WORK");
});

test("reduced motion never scrambles", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const link = workLink(page);
  await link.hover();
  for (let i = 0; i < 12; i++) {
    expect(await visible(link).innerText()).toBe("WORK");
    await page.waitForTimeout(50);
  }
});
