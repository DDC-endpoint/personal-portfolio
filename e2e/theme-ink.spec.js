import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

// The theme switch floods the new theme out of the toggle through an ink-blot
// mask (ThemeToggle + globals.css html.ink-switch). Reduced motion keeps the
// plain cross-fade.

const NEW_ROOT = "::view-transition-new(root)";
const toggle = (page) => page.getByRole("button", { name: /Switch to (dark|light) mode/ }).first();
const settle = (page) =>
  page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60_000 });

test("the toggle floods the new theme in from the button, then cleans up", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await settle(page);

  await toggle(page).click();
  await page.waitForFunction((p) => document.getAnimations().some((a) => a.effect?.pseudoElement === p), NEW_ROOT);
  const ink = await page.evaluate((p) => {
    const a = document.getAnimations().find((a) => a.effect?.pseudoElement === p);
    const kf = a.effect.getKeyframes();
    const btn = [...document.querySelectorAll("button")].find((b) => /Switch to/.test(b.getAttribute("aria-label")));
    const r = btn.getBoundingClientRect();
    return { from: kf[0].maskPosition, size: kf[0].maskSize, cx: r.left + r.width / 2, cy: r.top + r.height / 2, cls: document.documentElement.className };
  }, NEW_ROOT);
  expect(ink.size).toBe("0px 0px");
  const [x, y] = ink.from.split(" ").map(parseFloat);
  expect(Math.abs(x - ink.cx)).toBeLessThan(1);
  expect(Math.abs(y - ink.cy)).toBeLessThan(1);
  expect(ink.cls).toContain("ink-switch");

  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  await expect(page.locator("html")).not.toHaveClass(/ink-switch/, { timeout: 4000 });
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  await toggle(page).click();
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await expect(page.locator("html")).not.toHaveClass(/ink-switch/, { timeout: 4000 });
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
  expect(errors).toEqual([]);
});

test("reduced motion switches without the flood", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await toggle(page).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const vt = await page.evaluate((p) => document.getAnimations().some((a) => a.effect?.pseudoElement === p), NEW_ROOT);
  expect(vt).toBe(false);
  await expect(page.locator("html")).not.toHaveClass(/ink-switch/);
});
