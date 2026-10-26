import { test, expect } from "@playwright/test";

// First-visit checks depend on load timing: the loader is skipped by design
// when the page is ready later than 2.5 s, which an unminified dev build
// under parallel workers occasionally is. Retry rather than loosen the gate.
test.describe.configure({ retries: 2 });

const KICKER = "Creative Technologist · Freelance Web Designer";
const portrait = (page) => page.locator("[data-portrait]");
const kicker = (page) => page.locator("[data-hero-kicker]");
// The visible letters (the kicker also holds a hidden sr-only copy).
const letters = (page) => kicker(page).locator("[data-letters]");

// Records every data-state the portrait passes through, from the first paint.
async function recordStates(page) {
  await page.addInitScript(() => {
    window.__states = [];
    new MutationObserver(() => {
      const s = document.querySelector("[data-portrait]")?.getAttribute("data-state");
      if (s && window.__states.at(-1) !== s) window.__states.push(s);
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-state"], childList: true });
  });
}

test("first visit plays the wave, a reload in the same session is static", async ({ page }) => {
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
  await expect(kicker(page)).toHaveAttribute("aria-busy", "true");
  await expect(letters(page)).toHaveText(KICKER, { timeout: 4000 });
  await expect(kicker(page)).not.toHaveAttribute("aria-busy");
  await expect(portrait(page)).toHaveAttribute("data-state", "static");

  await recordStates(page);
  await page.reload();
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
  await expect(letters(page)).toHaveText(KICKER);
});

test("slow image skips the wave", async ({ page }) => {
  await page.route("**/hero/portrait.webp", async (r) => {
    await new Promise((res) => setTimeout(res, 3000));
    await r.continue();
  });
  let busy = false;
  await page.exposeFunction("__busy", () => (busy = true));
  await page.addInitScript(() =>
    new MutationObserver((ms) => {
      if (ms.some((m) => m.target.getAttribute?.("aria-busy") === "true" && m.target.matches("[data-hero-kicker]"))) window.__busy();
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["aria-busy"] })
  );
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "skipped", { timeout: 10000 });
  await expect(letters(page)).toHaveText(KICKER);
  expect(busy).toBe(false);
});

test("reduced motion: no wave", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordStates(page);
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("no IntroStamp", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0);
  expect(await (await request.get("/")).text()).not.toContain("intro-stamp");
});

test("the hero decode never shifts layout", async ({ page }) => {
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
  await expect(letters(page)).toHaveText(KICKER, { timeout: 4000 });
  await expect(portrait(page)).toHaveAttribute("data-state", "static");
  expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
});

test("screen readers get the real hero text mid-decode", async ({ page }) => {
  await page.goto("/");
  await expect(kicker(page)).toHaveAttribute("aria-busy", "true", { timeout: 10000 });
  const snap = await page.locator("#top").ariaSnapshot();
  expect(snap).toContain(KICKER);
  expect(snap).toMatch(/heading "Damian\s*de\s*Cruz\." \[level=1\]/);
});

test("a hidden tab doesn't spend the session's loader", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
    Object.defineProperty(document, "hidden", { get: () => true });
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => sessionStorage.getItem("ddc:loader-played"))).toBeNull();
});

test("landing below the hero doesn't spend the session's loader", async ({ page }) => {
  await page.goto("/#about");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => sessionStorage.getItem("ddc:loader-played"))).toBeNull();
});
