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

// Wait for the page to be ready to take a click: hydrated, curtain gone.
async function settle(page) {
  await expect(page.locator(".intro-stamp")).toHaveCount(0, { timeout: 6000 });
  await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
}

// Leaves a marker on window: if it survives, the page change was client-side.
const mark = (page) => page.evaluate(() => { window.__marker = 1; window.__started = true; window.__portrait = []; });
const sameDocument = (page) => page.evaluate(() => window.__marker === 1);

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
    await page.getByRole("link", { name: "Portfolio" }).first().click();
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

  test("never leaves idle on a plain load or a reload", async ({ page }) => {
    await record(page);
    await page.goto("/");
    await settle(page);
    await page.reload();
    await settle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle"]);
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
        if (document.querySelector("[data-veil]")?.dataset.veil === "idle") window.__idleAt = performance.now();
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-veil"] });
    });
  });

  test("Home → /services by the hero button, at the top, in about 1.3 s", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await settle(page);
    const ms = await transitionTo(page, () => page.locator('#top a[href="/services"]:visible').click(), /\/services$/);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(ms).toBeGreaterThan(1200);
    expect(ms).toBeLessThan(2500);
    expect(errors).toEqual([]);
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
    await transitionTo(page, () => page.getByRole("link", { name: "Portfolio" }).first().click(), /\/$/);
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
