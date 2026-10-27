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
