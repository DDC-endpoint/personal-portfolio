import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

test("home renders with no errors", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Damian");
  expect(errors).toEqual([]);
});

test("marquee is gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("✦")).toHaveCount(0);
  const next = await page.locator("main > #top").evaluate((el) => el.nextElementSibling?.id);
  expect(next).toBe("about");
});

test("reduced motion hydrates cleanly and keeps the saved theme", async ({ page }) => {
  // A hydration mismatch makes React rebuild the document from <html> down,
  // wiping the classes the pre-paint theme script set (dark, js).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const errors = trackErrors(page);
  for (const path of ["/", "/services"]) {
    await page.goto(path);
    await page.waitForTimeout(2000);
    const cls = await page.evaluate(() => document.documentElement.className);
    expect(cls, path).toContain("dark");
    expect(cls, path).toContain("js");
  }
  expect(errors).toEqual([]);
});
