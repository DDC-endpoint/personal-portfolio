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

// Some browser extensions inject a <script> into <head> before React loads.
// React skips unexpected nodes there, unless it can mistake one for a script
// of ours: so the page renders no scripts of its own in <head>. This injects
// one after every script the parser adds to <head>, so every position is hit.
test("a script injected into <head> doesn't break hydration", async ({ page }) => {
  await page.addInitScript(() => {
    const ours = new WeakSet();
    const mo = new MutationObserver((records) => {
      for (const r of records)
        for (const node of r.addedNodes) {
          if (node.nodeName !== "SCRIPT" || node.parentNode !== document.head || ours.has(node)) continue;
          const s = document.createElement("script");
          s.src = URL.createObjectURL(new Blob([""], { type: "text/javascript" }));
          ours.add(s);
          node.after(s);
        }
    });
    mo.observe(document, { childList: true, subtree: true });
    addEventListener("DOMContentLoaded", () => setTimeout(() => mo.disconnect(), 0));
  });
  const errors = trackErrors(page);
  await page.goto("/");
  await page.waitForTimeout(1500);
  expect(errors.filter((e) => /hydrat|didn't match/i.test(e))).toEqual([]);
});

test("structured data is still on the page", async ({ page }) => {
  await page.goto("/");
  const types = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.map((el) => JSON.parse(el.textContent)["@type"]));
  expect(types).toEqual(["Person", "Service"]);
});
