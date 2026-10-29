import { test, expect } from "@playwright/test";
import { trackErrors, blockCurtain } from "./helpers";

// The page transition (docs/v3/plan-phase-5.md; the curtain from Phase 6).
// Every assertion waits on data-curtain / data-state, never on a fixed sleep.

const curtain = (page) => page.locator("[data-curtain]");
const panels = (page) => page.locator("[data-curtain] [data-panel]");
const portrait = (page) => page.locator("[data-portrait]");

// Records every data-curtain and portrait data-state from the first paint, and
// whether the curtain was ever in the DOM after the transition started.
async function record(page) {
  await page.addInitScript(() => {
    window.__curtain = [];
    window.__portrait = [];
    const log = () => {
      const v = document.querySelector("[data-curtain]")?.getAttribute("data-curtain");
      if (v && window.__curtain.at(-1) !== v) window.__curtain.push(v);
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
  await page.evaluate(() => { window.__curtain = ["idle"]; });
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

const idle = (page) => expect(curtain(page)).toHaveAttribute("data-curtain", "idle", { timeout: 8000 });

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
    await expect(curtain(page)).toHaveAttribute("data-curtain", "idle", { timeout: 9000 });
    await expect(curtain(page)).toHaveAttribute("aria-hidden", "true");
    expect(await curtain(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });


  test("is hidden without JS", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/services");
    await expect(curtain(page)).toHaveCount(1);
    await expect(curtain(page)).toBeHidden();
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
            const now = document.querySelector("[data-curtain]").dataset.curtain;
            if (!phase.includes(now) || performance.now() - t0 > 8000) resolve(first);
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
    const cover = await startOrder(page, ["covering"]);
    const ids = isMobile ? ["1", "2", "3"] : ["0", "1", "2", "3", "4"];
    for (const id of ids) expect(cover[id]).toBeDefined();
    // The middle panel moves first; the outer ones last.
    expect(cover["2"]).toBeLessThan(cover["1"]);
    expect(cover["2"]).toBeLessThan(cover["3"]);
    if (!isMobile) {
      expect(cover["1"]).toBeLessThan(cover["0"]);
      expect(cover["3"]).toBeLessThan(cover["4"]);
    }
    // Sampled on from full cover, so the first panel to lift is caught moving.
    const lift = await startOrder(page, ["covered", "lifting"]);
    const at = await page.evaluate(() => window.__atCover);
    expect(at).toEqual({ url: "/services", label: "Portfolio" });
    expect(lift["2"]).toBeLessThan(lift["1"]);
    expect(lift["2"]).toBeLessThan(lift["3"]);
    await idle(page);
    await expect(page).toHaveURL(/\/portfolio$/);
  });

  // Under the full curtain nothing of Home shows, so its portrait's loop
  // stops (lib/motion.js → onCover): on a mid-range phone one of its frames
  // there cost 134 ms while the next page was being built (2026-10-29).
  test("the departing portrait stops drawing under the full curtain", async ({ page }) => {
    await page.addInitScript(() => {
      window.__blits = 0;
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args) {
        if (this.canvas?.hasAttribute("data-lens")) window.__blits++;
        return draw.apply(this, args);
      };
    });
    await page.goto("/");
    await settle(page);
    await expect(page.locator("[data-portrait]")).toHaveAttribute("data-state", /^(static|skipped)$/, { timeout: 10000 });
    await page.evaluate(() => {
      window.__at = {};
      new MutationObserver(() => {
        const s = document.querySelector("[data-curtain]").dataset.curtain;
        if (s === "covered" && window.__at.covered === undefined) window.__at.covered = window.__blits;
        if (s === "lifting" && window.__at.lifting === undefined) window.__at.lifting = window.__blits;
      }).observe(document.querySelector("[data-curtain]"), { attributes: true, attributeFilter: ["data-curtain"] });
    });
    await clickNav(page, "Services");
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    const at = await page.evaluate(() => window.__at);
    expect(at.covered).toBeGreaterThan(0); // it was drawing up to the cover
    expect(at.lifting).toBe(at.covered); // and not once under it
  });

  test("the cursor stays behind the curtain and lives through the page change", async ({ page, isMobile }) => {
    test.skip(isMobile, "the custom cursor is desktop only");
    await page.goto("/");
    await settle(page);
    await page.mouse.move(700, 500);
    await page.mouse.move(720, 520, { steps: 3 });
    await page.evaluate(() => {
      window.__ring = document.querySelector(".cursor-ring");
      window.__cursorLost = false;
      new MutationObserver(() => {
        if (!document.documentElement.classList.contains("js-cursor") || !window.__ring.isConnected) window.__cursorLost = true;
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    });
    // Behind the curtain: it stacks above the cursor (the native cursor is
    // hidden, so nothing shows while it covers).
    const z = await page.evaluate(() => [".curtain", ".cursor-ring", ".cursor-dot"].map((q) => Number(getComputedStyle(document.querySelector(q)).zIndex)));
    expect(z[0]).toBeGreaterThan(z[1]);
    expect(z[0]).toBeGreaterThan(z[2]);
    await page.locator('header nav a[href="/services"]').click();
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    // The same cursor, never unmounted, never handing back to the native one.
    expect(await page.evaluate(() => [window.__ring === document.querySelector(".cursor-ring"), window.__cursorLost])).toEqual([true, false]);
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

  for (const [from, href, name] of [["/", "/portfolio", "nav"], ["/portfolio", "/services", "nav"], ["/privacy", "/portfolio", "nav"]]) {
    test(`${from} → ${href} by the ${name} transitions`, async ({ page }) => {
      await page.goto(from);
      await settle(page);
      const link = `header nav a[href="${href}"]`;
      await transitionTo(page, () => page.evaluate((s) => document.querySelector(s).click(), link), new RegExp(`${href}$`));
    });
  }
});

// ---- Task 4: clicks, swap, arrival ----------------------------------------

// A plain page link, fixed in view on every screen size, for tests that need
// a real (visible) click: the footer has no page links (Phase 6 gate). Clear
// of the corners: next dev's tools button sits in the bottom-right corner
// (bottom-left before Next 16) and would take the click.
const PATHS = { Home: "/", Portfolio: "/portfolio", Services: "/services", Privacy: "/privacy" };
async function pageLink(page, name) {
  await page.evaluate((href) => {
    document.querySelector("[data-test-page-link]")?.remove();
    const a = Object.assign(document.createElement("a"), { href, textContent: "test link" });
    a.dataset.testPageLink = "";
    a.style.cssText = "position:fixed;right:12px;bottom:72px;z-index:65;padding:8px;background:white";
    document.querySelector("main").append(a);
  }, PATHS[name]);
  return page.locator("[data-test-page-link]");
}

// Click → the full sweep → idle on `url`, in the same document, with <main>
// focused. Returns the click-to-idle time (ms).
async function transitionTo(page, click, url) {
  await mark(page);
  await page.evaluate(() => {
    window.__curtain = [document.querySelector("[data-curtain]").dataset.curtain];
    window.__t0 = performance.now();
  });
  await click();
  await expect(page).toHaveURL(url);
  await idle(page);
  expect(await page.evaluate(() => window.__curtain)).toEqual(["idle", "covering", "covered", "lifting", "idle"]);
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

  // Home's portrait is prepared well before the lift; the curtain mustn't
  // wait for its wave (which itself waits for the lift). Timed from the new
  // page's arrival, so the dev server's fetch doesn't count.
  test("a change to Home doesn't wait on the portrait's wave", async ({ page }) => {
    await page.goto("/services");
    await settle(page);
    await page.evaluate(() => {
      window.__coveredAt = window.__revealingAt = window.__arrivedAt = undefined;
      const watch = () => {
        if (location.pathname === "/" && document.querySelector("[data-portrait]")) window.__arrivedAt ??= performance.now();
        if (window.__arrivedAt === undefined) requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    });
    await transitionTo(page, () => page.evaluate(() => document.querySelector('header nav a[href="/"]').click()), /\/$/);
    const wait = await page.evaluate(() => window.__revealingAt - window.__arrivedAt);
    expect(wait).toBeLessThan(330); // was the full 400 ms portrait wait, plus frames
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

  test("a Privacy link from Home and from /services", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await transitionTo(page, async () => (await pageLink(page, "Privacy")).click(), /\/privacy$/);
    await page.goto("/services");
    await settle(page);
    await transitionTo(page, async () => (await pageLink(page, "Privacy")).click(), /\/privacy$/);
  });

  // The 404 is its own document (app/global-not-found.jsx), so its link home
  // can't be client-side: the curtain covers, Home loads under it, and Home's
  // loader lifts it (Damian, 2026-10-28: keep the loader beat).
  test("the 404 page's link home covers, then loads Home under the curtain", async ({ page }) => {
    await page.goto("/no-such-page");
    await settle(page);
    await mark(page);
    await page.getByRole("link", { name: "Back to damiandc.com" }).click();
    await expect(curtain(page)).toHaveAttribute("data-curtain", /^cover/, { timeout: 8000 });
    await page.waitForURL(/\/$/, { waitUntil: "load" });
    expect(await sameDocument(page)).toBe(false);
    await settle(page);
  });

  test("a modified or middle click is left to the browser", async ({ page, context }) => {
    await page.goto("/");
    await settle(page);
    const link = await pageLink(page, "Services");
    await link.scrollIntoViewIfNeeded();
    const popup = context.waitForEvent("page");
    await link.click({ modifiers: ["Control"] });
    await (await popup).close();
    await link.click({ button: "middle" });
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["idle"]);
  });

  test("a new-tab link is left to the browser", async ({ page, context }) => {
    await context.route(/policies\.google\.com/, (r) => r.fulfill({ body: "ok" }));
    await page.goto("/privacy");
    await settle(page);
    const popup = context.waitForEvent("page");
    await page.getByRole("link", { name: /Google’s privacy policy/ }).click();
    await (await popup).close();
    await expect(page).toHaveURL(/\/privacy$/);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["idle"]);
  });

  test("a second click while the curtain runs does nothing", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const before = await page.evaluate(() => history.length);
    await mark(page);
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(curtain(page)).not.toHaveAttribute("data-curtain", "idle");
    await page.evaluate(() => document.querySelector('header nav a[href="/privacy"]').click());
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
    await (await pageLink(page, "Privacy")).click();
    await page.waitForURL(/\/privacy$/, { waitUntil: "load", timeout: 15000 });
    await expect.poll(() => page.evaluate(() => window.__marker), { timeout: 15000 }).toBeUndefined();
    expect(Date.now() - t0).toBeGreaterThan(3500);
  });

  test("a link to the page you're on scrolls instead", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await mark(page);
    const home = await pageLink(page, "Home");
    await home.scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.__curtain = ["idle"]; });
    await home.click();
    await expect.poll(() => page.evaluate(() => scrollY), { timeout: 5000 }).toBe(0);
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["idle"]);
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
        expect(await page.evaluate(() => window.__curtain)).toEqual(["intro", "covered", "lifting", "idle"]);
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

  // On a phone, a vh is the largest viewport (the URL bar hidden) while
  // innerHeight is the current one. The curtain's edges were placed from
  // innerHeight on a 130vh panel, so with the bar shown the bottom edge sat
  // above the screen's bottom and a strip of the page showed under the
  // curtain (Android Chrome, 2026-10-29). The mismatch is faked here.
  test("the curtain covers the screen's bottom when innerHeight is less than a vh", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "innerHeight", { get: () => Math.round(window.outerHeight * 0.85) || 700, configurable: true });
    });
    await page.goto("/services");
    await settle(page);
    // At full cover (a 220 ms hold, so probed from an observer) the middle
    // panel's clip-path must reach past both ends of the screen, whichever
    // of innerHeight and the layout viewport is the taller.
    await page.evaluate(() => {
      window.__edges = null;
      new MutationObserver(() => {
        if (document.querySelector("[data-curtain]").dataset.curtain !== "covered" || window.__edges) return;
        try {
          const panel = document.querySelector('[data-panel="2"]');
          const [, top, bot] = panel.querySelector("[data-shape]").style.clipPath.match(/M ?0 ([\d.-]+) .* L [\d.]+ ([\d.-]+)/).map(Number);
          const y = panel.getBoundingClientRect().top;
          window.__edges = { top: y + top, bottom: y + bot, screen: Math.max(innerHeight, document.documentElement.clientHeight) };
        } catch (e) {
          window.__edges = { error: String(e), clip: document.querySelector('[data-panel="2"] [data-shape]')?.style.clipPath };
        }
      }).observe(document.querySelector("[data-curtain]"), { attributes: true, attributeFilter: ["data-curtain"] });
      document.querySelector('header nav a[href="/privacy"]').click();
    });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    const edges = await page.evaluate(() => window.__edges);
    expect([edges.error, edges.clip]).toEqual([undefined, undefined]);
    expect(edges.top).toBeLessThanOrEqual(0.1); // 130vh lays out in 1/64 px steps
    expect(edges.bottom).toBeGreaterThanOrEqual(edges.screen - 0.1);
  });

  test("a link clicked during the intro opens once the loader is done, under the same cover", async ({ page }) => {
    await record(page);
    await page.goto("/services");
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covered", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('header nav a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["intro", "covered", "lifting", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test("a link clicked during the intro's reveal opens right after it", async ({ page }) => {
    await page.goto("/services");
    await expect(curtain(page)).toHaveAttribute("data-curtain", "lifting", { timeout: 6000 });
    await page.evaluate(() => { window.__marker = 1; document.querySelector('header nav a[href="/privacy"]').click(); });
    await expect(page).toHaveURL(/\/privacy$/, { timeout: 6000 });
    await idle(page);
    expect(await sameDocument(page)).toBe(true);
  });

  test("the intro lets the pointer through, as the curtain did", async ({ page }) => {
    await page.goto("/services");
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covered", { timeout: 6000 });
    expect(await curtain(page).evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  for (const [name, media] of [["reduced motion", { reducedMotion: "reduce" }], ["forced colours", { forcedColors: "active" }]]) {
    test(`${name}: no curtain and no loader`, async ({ page }) => {
      await page.emulateMedia(media);
      await record(page);
      await page.goto("/services");
      await expect(curtain(page)).toBeHidden();
      await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      expect(await page.evaluate(() => window.__curtain)).toEqual(["intro", "idle"]);
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
    await page.evaluate(() => { window.__curtain = ["idle"]; });
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["idle", "covered", "lifting", "idle"]);
    expect(await sameDocument(page)).toBe(true);
    expect(Math.abs((await page.evaluate(() => scrollY)) - y)).toBeLessThan(80);
    await expect(page.locator(".morph-loader")).toHaveCount(0);

    await page.evaluate(() => { window.__curtain = ["idle"]; });
    await page.goForward();
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    expect(await page.evaluate(() => window.__curtain)).toEqual(["idle", "covered", "lifting", "idle"]);
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
    test(`${name}: client-side and instant, no curtain`, async ({ page }) => {
      await page.emulateMedia(media);
      await record(page);
      await page.goto("/");
      await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
      await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
      await page.evaluate(() => window.scrollTo(0, 400));
      await mark(page);
      await page.evaluate(() => { window.__curtain = ["idle"]; });
      await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
      await expect(page).toHaveURL(/\/services$/);
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      expect(await sameDocument(page)).toBe(true);
      expect(await page.evaluate(() => window.__curtain)).toEqual(["idle"]);
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

test.describe("robustness", () => {
  // The engine ships with the first-load bundle (2026-10-29), so blocking it
  // blocks hydration: the page is the server HTML, the CSS failsafe uncovers
  // it at 5 s, and its links are plain.
  test("if the site's code can't load, page links still work (the browser loads them)", async ({ page }) => {
    await blockCurtain(page);
    await page.goto("/");
    await expect(page.locator("[data-curtain]")).toBeHidden({ timeout: 9000 });
    await mark(page);
    await (await pageLink(page, "Services")).click();
    await page.waitForURL(/\/services$/, { timeout: 10000 });
    await expect.poll(() => page.evaluate(() => window.__marker), { timeout: 10000 }).toBeUndefined();
  });

  // The next page hasn't committed yet, so /services is still the current
  // history entry and Back goes to the one before it (Home), as Back during a
  // normal page load would.
  test("Back while the curtain covers: reveals the page the visitor went back to, in the same document", async ({ page }) => {
    await record(page);
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(page).toHaveURL(/\/services$/);
    await idle(page);
    await mark(page);
    // Hold the next page back so the curtain is still covering when Back comes.
    await page.route(/\/privacy/, async (route) => {
      if (!route.request().headers()["rsc"]) return route.continue();
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue().catch(() => {});
    });
    await page.evaluate(() => document.querySelector('header nav a[href="/privacy"]').click());
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covered", { timeout: 4000 });
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
    await page.evaluate(() => document.querySelector('header nav a[href="/privacy"]').click());
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covering");
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await idle(page);
    await page.waitForTimeout(800);
    await expect(page).toHaveURL(/\/$/);
    expect(await sameDocument(page)).toBe(true);
  });

  test("the running curtain takes a real click, so nothing lands on the page underneath", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covering");
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
    expect(await curtain(page).evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
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
    await page.evaluate(() => document.querySelector('header nav a[href="/privacy"]').click());
    await expect(curtain(page)).toHaveAttribute("data-curtain", "covered", { timeout: 4000 });
    const size = page.viewportSize();
    await page.setViewportSize({ width: size.height, height: size.width });
    // The right edge is the curtain's, not innerWidth: the scrollbar's room
    // (globals.css → scrollbar-gutter) is never under it, and headless
    // Chromium leaves that room unpainted.
    const covered = () =>
      page.evaluate(() => {
        const w = document.querySelector("[data-curtain]").getBoundingClientRect().right;
        return [[4, 4], [w - 4, 4], [w / 2, innerHeight / 2], [4, innerHeight - 4], [w - 4, innerHeight - 4]].every(([x, y]) =>
          document.elementFromPoint(x, y)?.closest("[data-curtain]")
        );
      });
    await expect.poll(covered).toBe(true);
    await idle(page);
  });

  test("reduced motion: a link to the page you're on jumps instead of gliding", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 15000 });
    const home = await pageLink(page, "Home");
    await home.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => {
      document.querySelector('header nav a[href="/"]').click();
      return new Promise((r) => requestAnimationFrame(() => r(scrollY)));
    });
    expect(y).toBe(0);
  });

  test("a very late hydration: no count, at most one lift, and the page ends uncovered", async ({ page }) => {
    await record(page);
    // Every change of data-curtain with the value it left: a second lift
    // shows up as lifting → lifting.
    await page.addInitScript(() => {
      window.__left = [];
      document.addEventListener("DOMContentLoaded", () => {
        new MutationObserver((ms) => ms.forEach((m) => window.__left.push(m.oldValue))).observe(document.querySelector("[data-curtain]"), {
          attributes: true,
          attributeFilter: ["data-curtain"],
          attributeOldValue: true,
        });
      });
    });
    // Every script arrives after 3 s: hydration lands well past the 2.5 s cut-off.
    await page.route("**/_next/static/chunks/**", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      return route.continue();
    });
    await page.goto("/services");
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 30000 });
    await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
    // It lifts at once, or, if the curtain's own code arrives after the CSS
    // failsafe (each chunk here is 3 s late), it stands down: either way it
    // ends idle. Let the loader finish too: it must never lift a second time.
    await page.waitForTimeout(1500);
    const log = await page.evaluate(() => window.__curtain);
    expect(log[0]).toBe("intro");
    expect(log.at(-1)).toBe("idle");
    expect((await page.evaluate(() => window.__left)).filter((v) => v === "lifting").length).toBeLessThanOrEqual(1);
  });

  test("hydration after the CSS failsafe never covers the readable page again", async ({ page }) => {
    await record(page);
    await page.route("**/_next/static/chunks/**", async (route) => {
      if (route.request().url().endsWith(".css")) return route.continue();
      await new Promise((r) => setTimeout(r, 6500));
      return route.continue().catch(() => {});
    });
    await page.goto("/services", { waitUntil: "domcontentloaded" });
    await expect(curtain(page)).toBeHidden({ timeout: 7000 });
    await page.waitForFunction(() => document.documentElement.dataset.transitions === "ready", null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const log = await page.evaluate(() => window.__curtain);
    expect(log).not.toContain("covered");
    expect(log.at(-1)).toBe("idle");
    await expect(page.locator("#top h1")).toBeVisible();
  });

  // A link clicked during the intro before the engine arrived used to be its
  // own case; the engine arrives with hydration now (2026-10-29), so that is
  // "a link clicked during the intro opens once the loader is done" above.
});
