import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

// The page transition (docs/v3/plan-phase-5.md; the curtain from Phase 6).
// Every assertion waits on data-curtain / data-state, never on a fixed sleep.

const veil = (page) => page.locator("[data-curtain]");
const panels = (page) => page.locator("[data-curtain] [data-panel]");
const portrait = (page) => page.locator("[data-portrait]");

// Records every data-curtain and portrait data-state from the first paint, and
// whether the curtain was ever in the DOM after the transition started.
async function record(page) {
  await page.addInitScript(() => {
    window.__veil = [];
    window.__portrait = [];
    const log = () => {
      const v = document.querySelector("[data-curtain]")?.getAttribute("data-curtain");
      if (v && window.__veil.at(-1) !== v) window.__veil.push(v);
      const p = document.querySelector("[data-portrait]")?.getAttribute("data-state");
      if (p && window.__portrait.at(-1) !== p) window.__portrait.push(p);
      if (window.__started && document.querySelector(".morph-loader")) window.__curtainAfter = true;
    };
    new MutationObserver(log).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-curtain", "data-state"] });
  });
}

// Wait for the page to be ready to take a click: hydrated, the first-load
// loader gone and its lift finished. Then start the curtain log afresh.
async function settle(page) {
  await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
  await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
  await expect(page.locator("[data-curtain]")).toHaveAttribute("data-curtain", "idle", { timeout: 8000 });
  await page.evaluate(() => { window.__veil = ["idle"]; });
}

// Leaves a marker on window: if it survives, the page change was client-side.
const mark = (page) => page.evaluate(() => { window.__marker = 1; window.__started = true; window.__portrait = []; });
const sameDocument = (page) => page.evaluate(() => window.__marker === 1);

// A page in the nav: the header from md, the menu on phones (Phase 6).
async function clickNav(page, name) {
  if ((await page.viewportSize()).width < 768) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name, exact: true }).click();
  } else await page.locator("header nav").getByRole("link", { name, exact: true }).click();
}
const clickPortfolio = (page) => clickNav(page, "Home");

// The site has no cross-page section link right now, so the tests add one.
const addLink = (page, href) =>
  page.evaluate((href) => {
    const a = Object.assign(document.createElement("a"), { href, textContent: "section link" });
    a.dataset.testLink = "";
    document.querySelector("main").prepend(a);
  }, href);

const idle = (page) => expect(veil(page)).toHaveAttribute("data-curtain", "idle", { timeout: 8000 });

test.describe("arriving on Home", () => {
  test("from /services: the name rises and the portrait waves after the lift (Phase 6)", async ({ page }) => {
    const errors = trackErrors(page);
    await record(page);
    await page.goto("/services");
    await settle(page);
    await mark(page);
    // The hero's state the moment the reveal starts.
    await page.evaluate(() => {
      new MutationObserver(() => {
        if (document.querySelector("[data-curtain]")?.dataset.curtain !== "lifting" || window.__heroAtReveal) return;
        const word = document.querySelector("#top h1 span.inline-block");
        if (!word) return;
        const s = getComputedStyle(word);
        window.__heroAtReveal = { transform: s.transform, opacity: s.opacity };
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
    });
    await clickPortfolio(page);
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
    // No loader on a page change: the curtain is the only cover.
    expect(await page.evaluate(() => window.__curtainAfter)).toBeFalsy();
    await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
    expect(await page.evaluate(() => window.__portrait)).toContain("wave");
    // As the lift starts, the name is still below its line; it rises after.
    const hero = await page.evaluate(() => window.__heroAtReveal);
    expect(hero).toBeTruthy();
    expect(Number(hero.transform.match(/^matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)$/)?.[1])).toBeGreaterThan(1);
    await expect(page.locator("#top h1 span.inline-block").first()).toHaveCSS("transform", /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/, { timeout: 4000 });
    expect(errors).toEqual([]);
  });
});

test.describe("the curtain at rest", () => {
  test("is in the server HTML (covering, for the loader), then idle, hidden from screen readers and clicks", async ({ page, request }) => {
    const html = await (await request.get("/services")).text();
    expect(html).toMatch(/<div[^>]*data-curtain="intro"/);
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-curtain", "idle", { timeout: 9000 });
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

// ---- The curtain (Phase 6) -------------------------------------------------

test.describe("the curtain", () => {
  test.beforeEach(({ page }) => record(page));
  // Records, per panel, when its transform first changes after the click,
  // and the URL and label at full cover.
  async function watch(page) {
    await page.evaluate(() => {
      window.__moved = {};
      const t0 = performance.now();
      new MutationObserver((ms) => {
        for (const m of ms) {
          const el = m.target.closest?.("[data-panel]");
          if (el && m.attributeName === "style" && el === m.target && window.__moved[el.dataset.panel] === undefined) {
            window.__moved[el.dataset.panel] = performance.now() - t0;
          }
          if (m.attributeName === "data-curtain" && m.target.dataset.curtain === "covered" && !window.__atCover) {
            window.__atCover = { url: location.pathname, label: document.querySelector("[data-label]").textContent };
          }
          if (m.attributeName === "data-curtain" && m.target.dataset.curtain === "lifting") window.__lifted = window.__lifted ?? {};
        }
      }).observe(document.querySelector("[data-curtain]"), { subtree: true, attributes: true, attributeFilter: ["style", "data-curtain"] });
    });
  }
  // A panel's top edge, sampled every frame, to see when each one starts to rise.
  async function startOrder(page, phase) {
    return page.evaluate(
      (phase) =>
        new Promise((resolve) => {
          const first = {};
          const els = [...document.querySelectorAll("[data-curtain] [data-panel]")].filter((el) => getComputedStyle(el).display !== "none");
          const at = els.map((el) => el.getBoundingClientRect().top);
          const t0 = performance.now();
          const tick = () => {
            els.forEach((el, i) => {
              if (first[el.dataset.panel] === undefined && Math.abs(el.getBoundingClientRect().top - at[i]) > 2) first[el.dataset.panel] = performance.now() - t0;
            });
            if (document.querySelector("[data-curtain]").dataset.curtain !== phase || performance.now() - t0 > 3000) resolve(first);
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      phase
    );
  }

  test("covers centre-out, names the destination, swaps at full cover, lifts centre-out", async ({ page, isMobile }) => {
    await page.goto("/services");
    await settle(page);
    await watch(page);
    const covering = page.evaluate(() => new Promise((r) => {
      const c = document.querySelector("[data-curtain]");
      new MutationObserver((_, o) => c.dataset.curtain === "covering" && (o.disconnect(), r())).observe(c, { attributes: true });
    }));
    await page.evaluate(() => document.querySelector('header nav a[href="/portfolio"]').click());
    await covering;
    const cover = await startOrder(page, "covering");
    const ids = isMobile ? ["1", "2", "3"] : ["0", "1", "2", "3", "4"];
    for (const id of ids) expect(cover[id]).toBeDefined();
    // The middle panel moves first; the outer ones last.
    expect(cover["2"]).toBeLessThan(cover["1"]);
    expect(cover["2"]).toBeLessThan(cover["3"]);
    if (!isMobile) {
      expect(cover["1"]).toBeLessThan(cover["0"]);
      expect(cover["3"]).toBeLessThan(cover["4"]);
    }
    await expect(veil(page)).toHaveAttribute("data-curtain", /covered|lifting/, { timeout: 4000 });
    const at = await page.evaluate(() => window.__atCover);
    expect(at).toEqual({ url: "/services", label: "Portfolio" });
    await expect(veil(page)).toHaveAttribute("data-curtain", "lifting", { timeout: 6000 });
    const lift = await startOrder(page, "lifting");
    expect(lift["2"]).toBeLessThan(lift["1"]);
    expect(lift["2"]).toBeLessThan(lift["3"]);
    await idle(page);
    await expect(page).toHaveURL(/\/portfolio$/);
  });

  test("the resting shadow is there before any panel moves; panels are ivory and mist", async ({ page, isMobile }) => {
    await page.goto("/services");
    await settle(page);
    const first = page.evaluate(() => new Promise((r) => {
      const c = document.querySelector("[data-curtain]");
      new MutationObserver((_, o) => {
        if (c.dataset.curtain !== "covering") return;
        o.disconnect();
        const drops = [...c.querySelectorAll("[data-panel]")].filter((el) => getComputedStyle(el).display !== "none").map((el) => getComputedStyle(el.querySelector("[data-drop]")).filter);
        const shapes = [...c.querySelectorAll("[data-shape]")].map((el) => getComputedStyle(el).backgroundColor);
        r({ drops, shapes });
      }).observe(c, { attributes: true });
    }));
    await page.evaluate(() => document.querySelector('header nav a[href="/privacy"]').click());
    const { drops, shapes } = await first;
    for (const d of drops) expect(d).toMatch(/drop-shadow\(rgba\(11, 31, 58, 0\.1\) 0px 0px 14px\)/);
    expect(shapes.slice(0, 2)).toEqual(["rgb(246, 246, 241)", "rgb(238, 244, 253)"]);
    await idle(page);
  });

  for (const [from, href, name] of [["/", "/portfolio", "nav"], ["/portfolio", "/services", "footer"], ["/privacy", "/portfolio", "footer"]]) {
    test(`${from} → ${href} by the ${name} transitions`, async ({ page }) => {
      await page.goto(from);
      await settle(page);
      const link = name === "nav" ? `header nav a[href="${href}"]` : `footer a[href="${href}"]`;
      await transitionTo(page, () => page.evaluate((s) => document.querySelector(s).click(), link), new RegExp(`${href}$`));
    });
  }
});

// ---- Task 4: clicks, swap, arrival ----------------------------------------

const footerLink = (page, name) => page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name, exact: true });

// Click → the full sweep → idle on `url`, in the same document, with <main>
// focused. Returns the click-to-idle time (ms).
async function transitionTo(page, click, url) {
  await mark(page);
  await page.evaluate(() => {
    window.__veil = [document.querySelector("[data-curtain]").dataset.curtain];
    window.__t0 = performance.now();
  });
  await click();
  await expect(page).toHaveURL(url);
  await idle(page);
  expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covering", "covered", "lifting", "idle"]);
  expect(await sameDocument(page)).toBe(true);
  expect(await page.evaluate(() => document.activeElement === document.querySelector("main"))).toBe(true);
  return page.evaluate(() => window.__idleAt - window.__t0);
}

test.describe("transitions", () => {
  test.beforeEach(async ({ page }) => {
    await record(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        const v = document.querySelector("[data-curtain]")?.dataset.curtain;
      if (v === "idle") window.__idleAt = performance.now();
      if (v === "covered" && !window.__coveredAt) window.__coveredAt = performance.now();
      if (v === "lifting" && !window.__revealingAt) window.__revealingAt = performance.now();
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
    });
  });

  // The sweeps are timed on their own: the page fetch between them depends on
  // the dev server's load (production prefetches it). Timing-dependent, so
  // only this retries, like the loader's timing group.
  test.describe("timing", () => {
    test.describe.configure({ retries: 2 });

    test("Home → /services by the nav, at the top: a 0.94 s cover and a 1.09 s lift", async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto("/");
      await settle(page);
      await page.evaluate(() => { window.__coveredAt = window.__revealingAt = undefined; });
      // A DOM click: on phones the menu's opening would count towards the time.
      const total = await transitionTo(page, () => page.evaluate(() => document.querySelector('header nav a[href="/services"]').click()), /\/services$/);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const { cover, reveal } = await page.evaluate(() => ({
        cover: window.__coveredAt - window.__t0,
        reveal: window.__idleAt - window.__revealingAt,
      }));
      // Phones have three panels, so one stagger less each way (0.12 s).
      expect(cover).toBeGreaterThan(780);
      expect(cover).toBeLessThan(1400);
      expect(reveal).toBeGreaterThan(900);
      expect(reveal).toBeLessThan(1500);
      expect(total).toBeGreaterThan(1900);
      expect(errors).toEqual([]);
    });
  });

  test("Home → /services from the mobile menu", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "the menu is phone-only");
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await transitionTo(page, () => page.getByRole("dialog", { name: "Site menu" }).getByRole("link", { name: "Services", exact: true }).click(), /\/services$/);
    await expect(page.getByRole("dialog", { name: "Site menu" })).toHaveCount(0);
  });

  test("/services → Home by the nav, at the top", async ({ page }) => {
    await page.goto("/services");
    await settle(page);
    await transitionTo(page, () => clickPortfolio(page), /\/$/);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test("/privacy → Home's #work lands with the section under the nav", async ({ page }) => {
    await page.goto("/privacy");
    await settle(page);
    await addLink(page, "/#work");
    await transitionTo(page, () => page.locator("[data-test-link]").evaluate((a) => a.click()), /\/#work$/);
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
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(veil(page)).not.toHaveAttribute("data-curtain", "idle");
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

// ---- The first load: the morph loader on the curtain -----------------------

test.describe("first load", () => {
  // The intro is timed from hydration; a cold dev compile can make it late.
  test.describe.configure({ retries: 2 });

  for (const path of ["/services", "/privacy", "/"]) {
    test(`${path}: the loader, then the curtain lifts, on every load`, async ({ page, request }) => {
      expect(await (await request.get(path)).text()).toContain("morph-loader");
      await record(page);
      for (const load of [() => page.goto(path), () => page.reload()]) {
        await load();
        await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
        await idle(page);
        expect(await page.evaluate(() => window.__veil)).toEqual(["intro", "covered", "lifting", "idle"]);
      }
    });
  }

  test("Home keeps its entrance: the name rises and the portrait waves after the lift starts", async ({ page }) => {
    await record(page);
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.querySelector("[data-curtain]")?.dataset.curtain !== "lifting" || window.__heroAtReveal) return;
        const word = document.querySelector("#top h1 span.inline-block");
        if (word) window.__heroAtReveal = getComputedStyle(word).transform;
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
    });
    await page.goto("/");
    await expect(portrait(page)).toHaveAttribute("data-state", "wave", { timeout: 10000 });
    await idle(page);
    const t = await page.evaluate(() => window.__heroAtReveal);
    const dy = Number(t.match(/^matrix\(1, 0, 0, 1, 0, (-?[\d.]+)\)$/)?.[1]);
    expect(dy).toBeGreaterThan(1); // still below its line
  });

  test("a link clicked during the intro opens once the loader is done, under the same cover", async ({ page }) => {
    await record(page);
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-curtain", "covered", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["intro", "covered", "lifting", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test("a link clicked during the intro's reveal opens right after it", async ({ page }) => {
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-curtain", "lifting", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
  });

  test("the intro lets the pointer through, as the curtain did", async ({ page }) => {
    await page.goto("/services");
    await expect(veil(page)).toHaveAttribute("data-curtain", "covered", { timeout: 6000 });
    expect(await veil(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  for (const [name, media] of [["reduced motion", { reducedMotion: "reduce" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`${name}: no curtain and no loader`, async ({ page }) => {
      await page.emulateMedia(media);
      await record(page);
      await page.goto("/services");
      await expect(veil(page)).toBeHidden();
      await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      expect(await page.evaluate(() => window.__veil)).toEqual(["intro", "idle"]);
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
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    await page.evaluate(() => { window.__veil = ["idle"]; });
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "lifting", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(80);
    await expect(page.locator(".morph-loader")).toHaveCount(0);

    await page.evaluate(() => { window.__veil = ["idle"]; });
    await page.goForward();
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["idle", "covered", "lifting", "idle"]);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(await sameDocument(page)).toBe(true);
    expect(errors).toEqual([]);
  });
});

// ---- Task 6: link target, reduced motion, forced colours, phone menu -------

test.describe("details", () => {
  test("a section link from /services lands on Home's #work", async ({ page }) => {
    await record(page);
    await page.goto("/services");
    await settle(page);
    await addLink(page, "/#work");
    const link = page.locator("[data-test-link]");
    await mark(page);
    await link.evaluate((a) => a.click());
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
      await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      await page.evaluate(() => window.scrollTo(0, 400));
      await mark(page);
      await page.evaluate(() => { window.__veil = ["idle"]; });
      await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
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

// Aborts (or delays) the veil's code chunk: the only one naming its "lifting" state.
async function blockVeil(page, { delay } = {}) {
  await page.route("**/_next/static/chunks/**", async (route) => {
    const res = await route.fetch();
    const body = await res.text();
    if (!body.includes('"lifting"')) return route.fulfill({ response: res, body });
    if (delay === undefined) return route.abort();
    await new Promise((r) => setTimeout(r, delay));
    return route.fulfill({ response: res, body });
  });
}

test.describe("robustness", () => {
  test("if the veil's code can't load, page links still work (the browser loads them)", async ({ page }) => {
    await blockVeil(page);
    await page.goto("/");
    await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
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
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
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
    await expect(veil(page)).toHaveAttribute("data-curtain", "covered", { timeout: 4000 });
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
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await expect(veil(page)).toHaveAttribute("data-curtain", "covering");
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
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(veil(page)).toHaveAttribute("data-curtain", "covering");
    const { width, height } = page.viewportSize();
    const [x, y] = [width / 2, height / 2];
    const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.hasAttribute("data-curtain"), [x, y]);
    expect(hit).toBe(true);
    await page.mouse.click(x, y);
    await idle(page);
    await expect(page).toHaveURL(/\/services$/);
  });

  test("idle, the panels are parked below the screen and hidden", async ({ page }) => {
    await page.goto("/services");
    await settle(page);
    expect(await veil(page).evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
    const tops = await panels(page).evaluateAll((els) =>
      els.filter((el) => getComputedStyle(el).display !== "none").map((el) => el.getBoundingClientRect().top)
    );
    for (const top of tops) {
      expect(top).toBeGreaterThan(await page.evaluate(() => innerHeight));
    }
  });

  test("a resize while covered keeps the screen covered", async ({ page }) => {
    await page.route(/\/privacy/, async (route) => {
      if (!route.request().headers()["rsc"]) return route.continue();
      await new Promise((r) => setTimeout(r, 1200));
      return route.continue().catch(() => {});
    });
    await page.goto("/services");
    await settle(page);
    await page.evaluate(() => document.querySelector('footer a[href="/privacy"]').click());
    await expect(veil(page)).toHaveAttribute("data-curtain", "covered", { timeout: 4000 });
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });
    const covered = () =>
      page.evaluate(() =>
        [[4, 4], [innerWidth - 4, 4], [innerWidth / 2, innerHeight / 2], [4, innerHeight - 4], [innerWidth - 4, innerHeight - 4]].every(([x, y]) =>
          document.elementFromPoint(x, y)?.closest("[data-curtain]")
        )
      );
    await expect.poll(covered).toBe(true);
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

  test("a very late hydration lifts the curtain at once, with no count", async ({ page }) => {
    await record(page);
    // Every script arrives after 3 s: hydration lands well past the 2.5 s cut-off.
    await page.route("**/_next/static/chunks/**", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      return route.continue();
    });
    await page.goto("/services");
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 30000 });
    await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
    // Covered and lifting can land in one mutation batch: check the ends.
    const log = await page.evaluate(() => window.__veil);
    expect(log[0]).toBe("intro");
    expect(log).toContain("lifting");
    expect(log.at(-1)).toBe("idle");
  });

  test("a link clicked during the intro, before the curtain's code arrives, opens under the same cover", async ({ page }) => {
    await record(page);
    await blockVeil(page, { delay: 1500 });
    await page.goto("/services");
    await expect(page.locator(".morph-loader")).toHaveCount(1);
    await page.evaluate(() => { window.__marker = 1; document.querySelector('footer a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 10000 });
    await idle(page);
    expect(await page.evaluate(() => window.__veil)).toEqual(["intro", "covered", "lifting", "idle"]);
    expect(await sameDocument(page)).toBe(true);
  });
});
