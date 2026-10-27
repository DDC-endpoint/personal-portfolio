import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

// The page transition (docs/v3/plan-phase-5.md). Every assertion waits on
// data-veil / data-state, never on a fixed sleep.

const veil = (page) => page.locator("[data-veil]");
const portrait = (page) => page.locator("[data-portrait]");

// Records every data-veil and portrait data-state from the first paint, and
// whether the curtain was ever in the DOM after the transition started.
async function record(page) {
  await page.addInitScript(() => {
    window.__veil = [];
    window.__portrait = [];
    const log = () => {
      const v = document.querySelector("[data-veil]")?.getAttribute("data-veil");
      if (v && window.__veil.at(-1) !== v) window.__veil.push(v);
      const p = document.querySelector("[data-portrait]")?.getAttribute("data-state");
      if (p && window.__portrait.at(-1) !== p) window.__portrait.push(p);
      if (window.__started && document.querySelector(".intro-stamp")) window.__curtainAfter = true;
    };
    new MutationObserver(log).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-veil", "data-state"] });
  });
}

// Wait for the page to be ready to take a click: hydrated, the first-load
// stamp gone and its reveal finished. Then start the veil log afresh.
async function settle(page) {
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 6000 });
  await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
  await expect(page.locator("[data-veil]")).toHaveAttribute("data-veil", "idle", { timeout: 8000 });
  await page.evaluate(() => { window.__veil = ["idle"]; });
}

// Leaves a marker on window: if it survives, the page change was client-side.
const mark = (page) => page.evaluate(() => { window.__marker = 1; window.__started = true; window.__portrait = []; });
const sameDocument = (page) => page.evaluate(() => window.__marker === 1);

// /services' Portfolio button: in the hero corner from md, in the menu on phones.
async function clickPortfolio(page) {
  const portfolio = page.locator('a[href="/"]').filter({ hasText: /^Portfolio/ });
  if ((await page.viewportSize()).width < 768) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").locator('a[href="/"]').filter({ hasText: /^Portfolio/ }).click();
  } else await portfolio.locator("visible=true").click();
}

const idle = (page) => expect(veil(page)).toHaveAttribute("data-veil", "idle", { timeout: 8000 });

test.describe("arriving on Home", () => {
  test("from /services: no curtain, no wave, the hero already in place", async ({ page }) => {
    const errors = trackErrors(page);
    await record(page);
    await page.goto("/services");
    await settle(page);
    await mark(page);
    // The hero's state the moment the reveal starts.
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (document.querySelector("[data-veil]")?.dataset.veil !== "revealing" || window.__heroAtReveal) return;
        const word = document.querySelector("#top h1 span.inline-block");
        if (!word) return;
        const s = getComputedStyle(word);
        window.__heroAtReveal = { transform: s.transform, opacity: s.opacity };
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-veil"] });
    });
    await clickPortfolio(page);
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
    await expect(page.locator(".intro-stamp")).toHaveCount(0);
    expect(await page.evaluate(() => window.__curtainAfter)).toBeFalsy();
    await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
    expect(await page.evaluate(() => window.__portrait)).not.toContain("wave");
    const hero = await page.evaluate(() => window.__heroAtReveal);
    expect(hero).toBeTruthy();
    expect(hero.opacity).toBe("1");
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(hero.transform);
    expect(errors).toEqual([]);
  });
});

test.describe("the veil at rest", () => {
  test("is in the server HTML, idle, hidden from screen readers and clicks", async ({ page, request }) => {
    const html = await (await request.get("/services")).text();
    expect(html).toMatch(/<canvas[^>]*data-veil="idle"/);
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-veil", "idle");
    await expect(veil(page)).toHaveAttribute("aria-hidden", "true");
    expect(await veil(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });


  test("is hidden without JS", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/services");
    await expect(veil(page)).toHaveCount(1);
    await expect(veil(page)).toBeHidden();
    await context.close();
  });
});

// ---- Task 4: clicks, swap, arrival ----------------------------------------

const footerLink = (page, name) => page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name, exact: true });

// Click → the full sweep → idle on `url`, in the same document, with <main>
// focused. Returns the click-to-idle time (ms).
async function transitionTo(page, click, url) {
  await mark(page);
  await page.evaluate(() => {
    window.__veil = [document.querySelector("[data-veil]").dataset.veil];
    window.__t0 = performance.now();
  });
  await click();
  await expect(page).toHaveURL(url);
  await idle(page);
  expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covering", "covered", "revealing", "idle"]);
  expect(await sameDocument(page)).toBe(true);
  expect(await page.evaluate(() => document.activeElement === document.querySelector("main"))).toBe(true);
  return page.evaluate(() => window.__idleAt - window.__t0);
}

test.describe("transitions", () => {
  test.beforeEach(async ({ page }) => {
    await record(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const v = document.querySelector("[data-veil]")?.dataset.veil;
      if (v === "idle") window.__idleAt = performance.now();
      if (v === "covered" && !window.__coveredAt) window.__coveredAt = performance.now();
      if (v === "revealing" && !window.__revealingAt) window.__revealingAt = performance.now();
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-veil"] });
    });
  });

  // The sweeps are timed on their own: the page fetch between them depends on
  // the dev server's load (production prefetches it). Timing-dependent, so
  // only this retries, like the loader's timing group.
  test.describe("timing", () => {
    test.describe.configure({ retries: 2 });

    test("Home → /services by the hero button, at the top: a 0.52 s cover and a 0.64 s reveal", async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto("/");
      await settle(page);
      await page.evaluate(() => { window.__coveredAt = window.__revealingAt = undefined; });
      const total = await transitionTo(page, () => page.locator('#top a[href="/services"]:visible').click(), /\/services$/);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const { cover, reveal } = await page.evaluate(() => ({
        cover: window.__coveredAt - window.__t0,
        reveal: window.__idleAt - window.__revealingAt,
      }));
      expect(cover).toBeGreaterThan(480);
      expect(cover).toBeLessThan(900);
      expect(reveal).toBeGreaterThan(600);
      expect(reveal).toBeLessThan(1000);
      expect(total).toBeGreaterThan(1200);
      expect(errors).toEqual([]);
    });
  });

  test("Home → /services from the mobile menu", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "the menu is phone-only");
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await transitionTo(page, () => page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: /Services/ }).click(), /\/services$/);
    await expect(page.getByRole("dialog", { name: "Site menu" })).toHaveCount(0);
  });

  test("/services → Home by Portfolio, at the top", async ({ page }) => {
    await page.goto("/services");
    await settle(page);
    await transitionTo(page, () => clickPortfolio(page), /\/$/);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test("/privacy → Home's #work lands with the section under the nav", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "the section links are in the desktop nav");
    await page.goto("/privacy");
    await settle(page);
    await transitionTo(page, () => page.locator('header nav a[href="/#work"]').click(), /\/#work$/);
    const top = await page.locator("#work").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 80)).toBeLessThan(4);
  });

  test("footer Privacy from Home and from /services", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await transitionTo(page, () => footerLink(page, "Privacy").click(), /\/privacy$/);
    await page.goto("/services");
    await settle(page);
    await transitionTo(page, () => footerLink(page, "Privacy").click(), /\/privacy$/);
  });

  test("the 404 page's link home", async ({ page }) => {
    await page.goto("/no-such-page");
    await settle(page);
    await transitionTo(page, () => page.getByRole("link", { name: "Back to damiandc.com" }).click(), /\/$/);
  });

  test("a modified or middle click is left to the browser", async ({ page, context }) => {
    await page.goto("/");
    await settle(page);
    const link = footerLink(page, "Services");
    await link.scrollIntoViewIfNeeded();
    const popup = context.waitForEvent("page");
    await link.click({ modifiers: ["Control"] });
    await (await popup).close();
    await link.click({ button: "middle" });
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
  });

  test("a new-tab link is left to the browser", async ({ page, context }) => {
    await context.route(/policies\.google\.com/, (r) => r.fulfill({ body: "ok" }));
    await page.goto("/privacy");
    await settle(page);
    const popup = context.waitForEvent("page");
    await page.getByRole("link", { name: /Google’s privacy policy/ }).click();
    await (await popup).close();
    await expect(page).toHaveURL(/\/privacy$/);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
  });

  test("a second click while the veil runs does nothing", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const before = await page.evaluate(() => history.length);
    await mark(page);
    await page.locator('#top a[href="/services"]:visible').click();
    await expect(veil(page)).not.toHaveAttribute("data-veil", "idle");
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await idle(page);
    await expect(page).toHaveURL(/\/services$/);
    expect(await page.evaluate(() => history.length)).toBe(before + 1);
    expect(await sameDocument(page)).toBe(true);
  });

  test("if the next page never arrives, the browser loads it after about 4 s", async ({ page }) => {
    // Hang the client-side fetch of /privacy (it carries an RSC header); the
    // normal document request still goes through.
    await page.route(/\/privacy/, (route) => {
      if (route.request().headers()["rsc"]) return; // never answered
      return route.continue();
    });
    await page.goto("/");
    await settle(page);
    await mark(page);
    const t0 = Date.now();
    await footerLink(page, "Privacy").click();
    await page.waitForURL(/\/privacy$/, { waitUntil: "load", timeout: 15000 });
    await expect.poll(() => page.evaluate(() => window.__marker), { timeout: 15000 }).toBeUndefined();
    expect(Date.now() - t0).toBeGreaterThan(3500);
  });

  test("a link to the page you're on scrolls instead", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await mark(page);
    const home = footerLink(page, "Home");
    await home.scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__veil = ["idle"]; });
    await home.click();
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBe(0);
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
    expect(await sameDocument(page)).toBe(true);
  });
});

// ---- Task 4b: the first load reveals with the sweep ------------------------

test.describe("first load", () => {
  // The intro is timed from hydration; a cold dev compile can make it late.
  test.describe.configure({ retries: 2 });

  for (const path of ["/services", "/privacy", "/"]) {
    test(`${path}: the stamp, then the sweep reveals the page, on every load`, async ({ page, request }) => {
      expect(await (await request.get(path)).text()).toContain("intro-stamp");
      await record(page);
      for (const load of [() => page.goto(path), () => page.reload()]) {
        await load();
        await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 6000 });
        await idle(page);
        expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "revealing", "idle"]);
      }
    });
  }

  test("Home keeps its entrance: the name rises and the portrait waves after the sweep starts", async ({ page }) => {
    await record(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector("[data-veil]")?.dataset.veil !== "revealing" || window.__heroAtReveal) return;
        const word = document.querySelector("#top h1 span.inline-block");
        if (word) window.__heroAtReveal = getComputedStyle(word).transform;
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-veil"] });
    });
    await page.goto("/");
    await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
    await idle(page);
    const t = await page.evaluate(() => window.__heroAtReveal);
    const dy = Number(t.match(/^matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)$/)?.[1]);
    expect(dy).toBeGreaterThan(1); // still below its line
  });

  test("a link clicked during the intro opens once the stamp is done, under the same cover", async ({ page }) => {
    await record(page);
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-veil", "covered", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/);
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "revealing", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test("a link clicked during the intro's reveal opens right after it", async ({ page }) => {
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-veil", "revealing", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
  });

  test("the intro lets the pointer through, as the curtain did", async ({ page }) => {
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-veil", "covered", { timeout: 6000 });
    expect(await veil(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  for (const [name, media] of [["reduced motion", { reducedMotion: "reduce" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`${name}: the veil stays idle`, async ({ page }) => {
      await page.emulateMedia(media);
      await record(page);
      await page.goto("/services");
      await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 6000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
    });
  }
});

// ---- Task 5: Back and Forward ----------------------------------------------

test.describe("back and forward", () => {
  test("Back covers at once, then reveals Home where the visitor left it; Forward returns", async ({ page }) => {
    const errors = trackErrors(page);
    await record(page);
    await page.goto("/");
    await settle(page);
    await page.locator("#timeline").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect.poll(() => page.evaluate(() => Math.round(scrollY)), { timeout: 3000 }).toBeGreaterThan(1000);
    const y = await page.evaluate(() => scrollY);
    await page.evaluate(() => document.querySelector('#top a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    await page.evaluate(() => { window.__veil = ["idle"]; });
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "revealing", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(80);
    await expect(page.locator(".intro-stamp")).toHaveCount(0);
    expect(await page.evaluate(() => window.__portrait)).not.toContain("wave");

    await page.evaluate(() => { window.__veil = ["idle"]; });
    await page.goForward();
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "revealing", "idle"]);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await sameDocument(page)).toBe(true);
    expect(errors).toEqual([]);
  });
});

// ---- Task 6: link target, reduced motion, forced colours, phone menu -------

test.describe("details", () => {
  test("“See the full portfolio” lands on Home's #work", async ({ page }) => {
    await record(page);
    await page.goto("/services");
    await settle(page);
    const link = page.getByRole("link", { name: /See the full portfolio/ });
    await expect(link).toHaveAttribute("href", "/#work");
    await link.scrollIntoViewIfNeeded();
    await mark(page);
    await link.click();
    await expect(page).toHaveURL(/\/#work$/);
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
    const top = await page.locator("#work").evaluate((el) => el.getBoundingClientRect().top);
    expect(Math.abs(top - 80)).toBeLessThan(4);
  });

  for (const [name, media] of [["reduced motion", { reducedMotion: "reduce" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`${name}: client-side and instant, no veil`, async ({ page }) => {
      await page.emulateMedia(media);
      await record(page);
      await page.goto("/");
      await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 6000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      await page.evaluate(() => window.scrollTo(0, 400));
      await mark(page);
      await page.evaluate(() => { window.__veil = ["idle"]; });
      await page.evaluate(() => document.querySelector('#top a[href="/services"]').click());
      await expect(page).toHaveURL(/\/services$/);
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      expect(await sameDocument(page)).toBe(true);
      expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
      expect(await page.evaluate(() => document.activeElement === document.querySelector("main"))).toBe(true);
    });
  }

  test("phone menu: gone on arrival, the page scrolls and isn't inert", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "the menu is phone-only");
    await page.goto("/privacy");
    await settle(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: /Services/ }).click();
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    expect(await page.evaluate(() => document.querySelector("main").hasAttribute("inert"))).toBe(false);
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });
});

// ---- Review fixes ------------------------------------------------------------

// Aborts (or delays) the veil's code chunk: the only one naming its "revealing" state.
async function blockVeil(page, { delay } = {}) {
  await page.route("**/_next/static/chunks/**", async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes('"revealing"')) return route.fulfill({ response: res, body });
    if (delay === undefined) return route.abort();
    await new Promise((r) => setTimeout(r, delay));
    return route.fulfill({ response: res, body });
  });
}

test.describe("robustness", () => {
  test("if the veil's code can't load, page links still work (the browser loads them)", async ({ page }) => {
    await blockVeil(page);
    await page.goto("/");
    await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
    await mark(page);
    await footerLink(page, "Services").click();
    await page.waitForURL(/\/services$/, { timeout: 10000 });
    await expect.poll(() => page.evaluate(() => window.__marker), { timeout: 10000 }).toBeUndefined();
  });

  // The next page hasn't committed yet, so /services is still the current
  // history entry and Back goes to the one before it (Home), as Back during a
  // normal page load would.
  test("Back while the veil covers: reveals the page the visitor went back to, in the same document", async ({ page }) => {
    await record(page);
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => document.querySelector('#top a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    // Hold the next page back so the veil is still covering when Back comes.
    await page.route(/\/privacy/, async (route) => {
      if (!route.request().headers()["rsc"]) return route.continue();
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue().catch(() => {});
    });
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await expect(veil(page)).toHaveAttribute("data-veil", "covered", { timeout: 4000 });
    const t0 = Date.now();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(Date.now() - t0).toBeLessThan(2500);
    expect(await sameDocument(page)).toBe(true);
    await page.waitForTimeout(4500); // past the 4 s fallback: nothing reloads
    await expect(page).toHaveURL(/\/$/);
    expect(await sameDocument(page)).toBe(true);
  });

  test("Back during the cover sweep: the transition is called off", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => document.querySelector('#top a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await expect(veil(page)).toHaveAttribute("data-veil", "covering");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/\/$/);
    expect(await sameDocument(page)).toBe(true);
  });

  test("the running veil takes a real click, so nothing lands on the page underneath", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.locator('#top a[href="/services"]:visible').click();
    await expect(veil(page)).toHaveAttribute("data-veil", "covering");
    const { width, height } = page.viewportSize();
    const [x, y] = [width / 2, height / 2];
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.hasAttribute("data-veil"), [x, y]);
    expect(hit).toBe(true);
    await page.mouse.click(x, y);
    await idle(page);
    await expect(page).toHaveURL(/\/services$/);
  });

  test("the canvas gives its memory back when idle", async ({ page }) => {
    await page.goto("/services");
    await settle(page);
    expect(await veil(page).evaluate((c) => c.width * c.height)).toBe(0);
  });

  test("a resize while covered redraws the grid at the new size", async ({ page }) => {
    await page.route(/\/privacy/, async (route) => {
      if (!route.request().headers()["rsc"]) return route.continue();
      await new Promise((r) => setTimeout(r, 1200));
      return route.continue().catch(() => {});
    });
    await page.goto("/services");
    await settle(page);
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await expect(veil(page)).toHaveAttribute("data-veil", "covered", { timeout: 4000 });
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });
    await expect.poll(() => veil(page).evaluate((c) => Math.round(c.width / (c.height / innerHeight)) - innerWidth)).toBe(0);
    await idle(page);
  });

  test("reduced motion: a link to the page you're on jumps instead of gliding", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
    const home = footerLink(page, "Home");
    await home.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => {
      document.querySelector('footer a[href="/"]').click();
      return new Promise((r) => requestAnimationFrame(() => r(scrollY)));
    });
    expect(y).toBe(0);
  });

  test("a very late hydration doesn't cover the readable page again", async ({ page }) => {
    await record(page);
    // Every script arrives after 3 s: hydration lands well past the 2.5 s cut-off.
    await page.route("**/_next/static/chunks/**", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      return route.continue();
    });
    await page.goto("/services");
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 30000 });
    await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
  });

  test("a link clicked during the intro, before the veil could draw, covers under the stamp (no wipe-and-sweep)", async ({ page }) => {
    await record(page);
    await blockVeil(page, { delay: 1500 });
    await page.goto("/services");
    await expect(page.locator(".intro-stamp")).toHaveCount(1);
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 10000 });
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "revealing", "idle"]);
    expect(await sameDocument(page)).toBe(true);
  });
});

// ---- Gate changes: the halo, the first frame, the shimmer --------------------

test.describe("the stamp (gate changes)", () => {
  test("sits in a soft halo over the glyphs, not a box", async ({ page }) => {
    await page.goto("/services");
    await page.locator(".intro-stamp[data-glyphs]").waitFor({ timeout: 6000 });
    const look = await page.evaluate(() => {
      const s = document.querySelector(".intro-stamp");
      return {
        image: getComputedStyle(s).backgroundImage,
        box: getComputedStyle(s.firstElementChild).backgroundColor,
      };
    });
    expect(look.image).toContain("radial-gradient");
    expect(look.box).toBe("rgba(0, 0, 0, 0)");
  });

  test("before any script runs, frame one shows the glow and the letters shimmer", async ({ page }) => {
    // Hold every script back (not the stylesheet), so the page sits at its
    // server-HTML first paint.
    await page.route("**/_next/static/chunks/**", async (route) => {
      if (route.request().url().endsWith(".css")) return route.continue();
      await new Promise((r) => setTimeout(r, 3000));
      return route.continue().catch(() => {});
    });
    await page.goto("/services", { waitUntil: "domcontentloaded" });
    const stamp = page.locator(".intro-stamp");
    await expect(stamp).toHaveAttribute("data-shimmer", "");
    await expect.poll(() => stamp.evaluate((s) => getComputedStyle(s).backgroundImage)).toContain("radial-gradient");
    await expect.poll(() => stamp.evaluate((s) => s.querySelector("[data-ch]").getAnimations().length)).toBeGreaterThan(0);
  });

  test("if the veil arrives late, the reveal still waits for the glyphs to bloom out", async ({ page }) => {
    // Find the veil's chunk on a first visit, then delay only that request:
    // proxying every chunk would make hydration itself late.
    let veilUrl;
    page.on("response", async (res) => {
      if (res.url().includes("/_next/static/chunks/") && (await res.text().catch(() => "")).includes('"revealing"')) veilUrl = res.url();
    });
    await page.goto("/services");
    await expect.poll(() => veilUrl, { timeout: 10000 }).toBeTruthy();
    await page.route(veilUrl, async (route) => {
      await new Promise((r) => setTimeout(r, 450));
      return route.continue();
    });
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector(".intro-stamp[data-glyphs]") && !window.__glyphsAt) window.__glyphsAt = performance.now();
        if (document.querySelector("[data-veil]")?.dataset.veil === "revealing" && !window.__revealAt) window.__revealAt = performance.now();
      }).observe(document, { subtree: true, attributes: true, childList: true });
    });
    await page.goto("/services");
    await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 8000 });
    await idle(page);
    const gap = await page.evaluate(() => window.__revealAt - window.__glyphsAt);
    expect(gap).toBeGreaterThanOrEqual(380);
  });

  test("once the decode starts, the shimmer stops", async ({ page }) => {
    await page.goto("/services");
    await page.locator(".intro-stamp[data-glyphs]").waitFor({ timeout: 6000 });
    const moving = await page.evaluate(() => [...document.querySelectorAll(".intro-stamp [data-ch]")].reduce((n, el) => n + el.getAnimations().length, 0));
    expect(moving).toBe(0);
  });
});
