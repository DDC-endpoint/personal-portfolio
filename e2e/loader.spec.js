import { test, expect } from "@playwright/test";

const KICKER = "Creative Technologist · Freelance Web Designer";
const portrait = (page) => page.locator("[data-portrait]");

// Records every data-state the portrait passes through, from the first paint,
// plus when the state became "wave" and when the curtain left the DOM.
async function recordStates(page) {
  await page.addInitScript(() => {
    window.__states = [];
    let seen = false;
    new MutationObserver(() => {
      const s = document.querySelector("[data-portrait]")?.getAttribute("data-state");
      if (s && window.__states.at(-1) !== s) {
        window.__states.push(s);
        if (s === "wave") window.__waveAt = performance.now();
      }
      const curtain = document.querySelector(".intro-stamp");
      if (curtain) seen = true;
      else if (seen && window.__curtainGoneAt === undefined) window.__curtainGoneAt = performance.now();
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-state"], childList: true });
  });
}

test("the curtain is in the server HTML and lifts on every load", async ({ page, request }) => {
  expect(await (await request.get("/")).text()).toContain("intro-stamp");
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 4000 });
  await page.reload();
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator("#top").getByText(KICKER, { exact: true })).toBeVisible();
});

test("reduced motion: no curtain, no wave", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordStates(page);
  await page.goto("/");
  await expect(page.locator(".intro-stamp")).toBeHidden();
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("forced colours: no wave", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await recordStates(page);
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("slow image skips the wave", async ({ page }) => {
  await page.route("**/hero/portrait.webp", async (r) => {
    await new Promise((res) => setTimeout(res, 3000));
    await r.continue();
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "skipped", { timeout: 10000 });
});

test("a hidden tab gets the finished portrait", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
    Object.defineProperty(document, "hidden", { get: () => true });
  });
  await recordStates(page);
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("landing below the hero gets the finished portrait", async ({ page }) => {
  await recordStates(page);
  await page.goto("/#about");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

// These need a prompt load: the wave is skipped by design when the page is
// ready later than 2.5 s, which an unminified dev build under parallel
// workers occasionally is. Only these retry; the gate isn't loosened.
test.describe("every load (timing-dependent)", () => {
  test.describe.configure({ retries: 2 });

  test("the wave starts as the curtain lifts, on every load", async ({ page }) => {
    await recordStates(page);
    for (const load of [() => page.goto("/"), () => page.reload()]) {
      await load();
      await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
      await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 5000 });
      const { waveAt, goneAt } = await page.evaluate(() => ({ waveAt: window.__waveAt, goneAt: window.__curtainGoneAt }));
      // The curtain wipe takes 0.35 s before it leaves the DOM; the wave
      // starts as the wipe begins, not while the curtain still covers it.
      expect(goneAt).toBeDefined();
      expect(waveAt).toBeGreaterThanOrEqual(goneAt - 450);
    }
  });

  test("the hero entrance never shifts layout", async ({ page }) => {
    await page.addInitScript(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/");
    await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
    await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 5000 });
    expect(await page.evaluate(() => window.__cls)).toBeLessThan(0.01);
  });
});
