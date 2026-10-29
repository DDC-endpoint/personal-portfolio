import { test, expect } from "@playwright/test";

// The morph loader (Phase 6 Task 7) and the entrances after the lift (Task 8).
const KICKER = "Creative Technologist · Freelance Web Designer";
const portrait = (page) => page.locator("[data-portrait]");
const loader = (page) => page.locator(".morph-loader");
const curtain = (page) => page.locator("[data-curtain]");
const gone = (page) => expect(loader(page)).toHaveCount(0, { timeout: 9000 });

// Records every data-state the portrait passes through, from the first paint,
// when the state became "wave" and when the curtain started to lift.
async function recordStates(page) {
  await page.addInitScript(() => {
    window.__states = [];
    new MutationObserver(() => {
      const s = document.querySelector("[data-portrait]")?.getAttribute("data-state");
      if (s && window.__states.at(-1) !== s) {
        window.__states.push(s);
        if (s === "wave") window.__waveAt = performance.now();
      }
      if (document.querySelector("[data-curtain]")?.dataset.curtain === "lifting" && window.__liftAt === undefined) window.__liftAt = performance.now();
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-state", "data-curtain"], childList: true });
  });
}

test("the loader is in the server HTML on every page, hidden from screen readers", async ({ request }) => {
  for (const path of ["/", "/portfolio", "/services", "/privacy"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain("morph-loader");
    expect(html, path).toMatch(/<div[^>]*data-curtain="intro"[^>]*aria-hidden="true"/);
  }
});

test("the count rises to 100 and the name resolves, in regular weight", async ({ page }) => {
  await page.goto("/services");
  const count = loader(page).locator("[data-count]");
  await expect.poll(async () => Number(await count.textContent()), { timeout: 4000 }).toBeGreaterThan(0);
  await expect(count).toHaveText("100", { timeout: 6000 });
  const name = loader(page).locator("[data-name]");
  await expect(name).toHaveText("DAMIAN DE CRUZ");
  await expect(name).toHaveCSS("font-weight", "400");
  await expect(loader(page).locator("[data-coords]")).toHaveText("N 6.9271° / E 79.8612°");
  await gone(page);
  await expect(page.locator("#top").first()).toBeVisible();
});

test("the loader lifts with the middle panel", async ({ page }) => {
  await page.goto("/services");
  await expect(curtain(page)).toHaveAttribute("data-curtain", "lifting", { timeout: 8000 });
  const sample = () =>
    page.evaluate(() => ({
      loader: document.querySelector(".morph-loader [data-name]").getBoundingClientRect().top,
      panel: document.querySelector('[data-panel="2"]').getBoundingClientRect().top,
    }));
  const a = await sample();
  await page.waitForTimeout(250);
  const b = await sample();
  expect(b.panel).toBeLessThan(a.panel);
  // They move together.
  expect(Math.abs(b.loader - a.loader - (b.panel - a.panel))).toBeLessThan(4);
  await gone(page);
});

test("a reload in the same session is short; a new session is full", async ({ page, browser }) => {
  await page.goto("/services");
  await gone(page);
  await page.reload();
  await expect(loader(page)).toHaveCount(1);
  await expect(loader(page).locator("[data-orb]")).toBeHidden();
  await expect(loader(page).locator("[data-name]")).toBeVisible();
  // Short: the curtain is lifting well before a full load's 1.2 s minimum.
  const t0 = Date.now();
  await expect(curtain(page)).toHaveAttribute("data-curtain", "lifting", { timeout: 4000 });
  expect(Date.now() - t0).toBeLessThan(2000);
  await gone(page);

  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto("/services");
  await expect(other.locator(".morph-loader [data-orb]")).toBeVisible();
  await fresh.close();
});

test("a slow portrait holds the count at 96", async ({ page }) => {
  await page.route("**/hero/portrait.webp*", async (r) => {
    await new Promise((res) => setTimeout(res, 2200));
    await r.continue().catch(() => {});
  });
  await page.goto("/");
  await page.waitForFunction(() => document.querySelector(".morph-loader [data-count]") && performance.now() > 1900, null, { timeout: 8000 });
  const n = Number(await loader(page).locator("[data-count]").textContent());
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(96);
  await gone(page);
});

test("reduced motion: no curtain, no loader, no wave", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordStates(page);
  await page.goto("/");
  await expect(curtain(page)).toBeHidden();
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("forced colours: no curtain, no wave", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await recordStates(page);
  await page.goto("/");
  await expect(curtain(page)).toBeHidden();
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  expect(await page.evaluate(() => window.__states)).not.toContain("wave");
});

test("without JS there's no loader", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(curtain(page)).toBeHidden();
  await expect(page.locator("#top").getByText(KICKER, { exact: true })).toBeVisible();
  await context.close();
});

test("the first paint already has the seams' resting shadow (no pop when scripts arrive)", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    if (route.request().url().endsWith(".css")) return route.continue();
    await new Promise((r) => setTimeout(r, 4000));
    return route.continue().catch(() => {});
  });
  await page.goto("/services", { waitUntil: "domcontentloaded" });
  await expect(curtain(page)).toHaveAttribute("data-curtain", "intro");
  const before = await page.locator('[data-panel="2"] [data-drop]').evaluate((el) => getComputedStyle(el).filter);
  expect(before).toBe("drop-shadow(rgba(11, 31, 58, 0.1) 0px 0px 14px)");
});

test("the failsafe hides it if scripts never run", async ({ page }) => {
  await page.route("**/_next/static/chunks/**", async (route) => {
    if (route.request().url().endsWith(".css")) return route.continue();
    await new Promise((r) => setTimeout(r, 9000));
    return route.continue().catch(() => {});
  });
  await page.goto("/services", { waitUntil: "domcontentloaded" });
  await expect(curtain(page)).toBeVisible();
  await expect(curtain(page)).toBeHidden({ timeout: 7000 });
});

test("slow image skips the wave", async ({ page }) => {
  await page.route("**/hero/portrait.webp*", async (r) => {
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

test("/services' and /portfolio's headings wait for the lift", async ({ page }) => {
  for (const [path, sel] of [["/services", "#top h1 > *"], ["/portfolio", "h1 > *"]]) {
    await page.addInitScript((sel) => {
      new MutationObserver(() => {
        if (document.querySelector("[data-curtain]")?.dataset.curtain !== "lifting" || window.__atLift !== undefined) return;
        const el = document.querySelector(sel);
        if (el) window.__atLift = { opacity: getComputedStyle(el).opacity, transform: getComputedStyle(el).transform };
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
    }, sel);
    await page.goto(path);
    await gone(page);
    const at = await page.evaluate(() => window.__atLift);
    expect(at, path).toBeTruthy();
    expect(at.opacity === "0" || at.transform !== "none", `${path}: ${JSON.stringify(at)}`).toBe(true);
    await expect(page.locator(sel).first()).toHaveCSS("opacity", "1", { timeout: 4000 });
  }
});

// These need a prompt load: the wave is skipped by design when the portrait
// is ready later than 2.5 s into the arrival, which an unminified dev build
// under parallel workers occasionally is. Only these retry.
test.describe("every load (timing-dependent)", () => {
  test.describe.configure({ retries: 2 });

  // Until its wave starts, the portrait is skeleton only: never the finished
  // glyphs, which would flash full and then drop back as the wave begins.
  test("the portrait never shows finished before its wave, on a reload or a change to Home", async ({ page }) => {
    const sample = () => {
      window.__early = 0;
      window.__waveInk = null;
      const tick = () => {
        const p = document.querySelector("[data-portrait]");
        const cv = p?.querySelector("canvas");
        if (cv?.width) {
          const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
          let ink = 0;
          for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 20) ink++;
          if (p.dataset.state === "loading") window.__early = Math.max(window.__early, ink);
          if (p.dataset.state === "wave" && window.__waveInk === null) window.__waveInk = ink;
        }
        if (p?.dataset.state !== "static") requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const check = async () => {
      await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 12000 });
      const { early, waveInk } = await page.evaluate(() => ({ early: window.__early, waveInk: window.__waveInk }));
      expect(waveInk).not.toBeNull();
      // The skeleton blocks are faint (alpha ~0.1), so they barely register.
      expect(early).toBeLessThanOrEqual(waveInk + 20);
    };
    await page.addInitScript(sample);
    await page.goto("/");
    await gone(page);
    await page.reload();
    await check();
    await page.goto("/services");
    await expect(curtain(page)).toHaveAttribute("data-curtain", "idle", { timeout: 9000 });
    await page.evaluate(sample);
    await page.evaluate(() => document.querySelector('header nav a[href="/"]').click());
    await check();
  });

  test("the wave starts as the curtain lifts, on a first load and a reload", async ({ page }) => {
    await recordStates(page);
    for (const load of [() => page.goto("/"), () => page.reload()]) {
      await load();
      await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
      await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 5000 });
      const { waveAt, liftAt, states } = await page.evaluate(() => ({ waveAt: window.__waveAt, liftAt: window.__liftAt, states: window.__states }));
      expect(states.slice(0, 3)).toEqual(["loading", "wave", "static"]);
      // The wave starts as the panels clear, never while they still cover.
      expect(liftAt).toBeDefined();
      expect(waveAt).toBeGreaterThan(liftAt);
    }
  });

  test("the name is below its line before the lift and rises after it", async ({ page }) => {
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector("[data-curtain]")?.dataset.curtain !== "lifting" || window.__nameAtLift) return;
        const word = document.querySelector("#top h1 span.inline-block");
        if (word) window.__nameAtLift = getComputedStyle(word).transform;
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
    });
    for (const load of [() => page.goto("/"), () => page.reload()]) {
      await load();
      await gone(page);
      const t = await page.evaluate(() => window.__nameAtLift);
      expect(Number(t.match(/^matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)$/)?.[1])).toBeGreaterThan(1);
      await expect(page.locator("#top h1 span.inline-block").first()).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/, { timeout: 4000 });
      await page.evaluate(() => (window.__nameAtLift = undefined));
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
