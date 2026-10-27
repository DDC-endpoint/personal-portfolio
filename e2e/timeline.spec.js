import { test, expect } from "@playwright/test";
import { ENTRIES } from "../lib/timeline.js";

const lit = (page) => page.locator('#timeline [data-milestone][data-lit="true"]');
const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop");

// Scrolls so the stitch's scroll progress is p (offsets "start 0.7" → "end 0.55").
async function scrollToProgress(page, p) {
  await page.evaluate((pp) => {
    const r = document.querySelector("[data-timeline-list]").getBoundingClientRect();
    const top = r.top + window.scrollY, vh = innerHeight;
    const y0 = top - 0.7 * vh, y1 = top + r.height - 0.55 * vh;
    window.scrollTo(0, y0 + pp * (y1 - y0));
  }, p);
}

// The fraction of the list at which milestone i's dot sits.
const dotAt = (page, i) =>
  page.evaluate((k) => {
    const list = document.querySelector("[data-timeline-list]").getBoundingClientRect();
    const d = document.querySelectorAll("#timeline [data-dot]")[k].getBoundingClientRect();
    return (d.top + d.height / 2 - list.top) / list.height;
  }, i);

// Milestones whose dot sits at or above the needle's tip.
const dotsAboveNeedle = (page) =>
  page.evaluate(() => {
    const tip = document.querySelector("[data-needle]").getBoundingClientRect().bottom;
    return [...document.querySelectorAll("#timeline [data-dot]")].filter((d) => {
      const r = d.getBoundingClientRect();
      return r.top + r.height / 2 <= tip + 1;
    }).length;
  });

test("entries run oldest first", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline h3")).toHaveText(ENTRIES.map((e) => e.title));
});

test("stitch draws and milestones light as you scroll", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 0);
  await page.waitForTimeout(800);
  expect(await lit(page).count()).toBeLessThanOrEqual(1);
  await scrollToProgress(page, 1);
  await expect(lit(page)).toHaveCount(10, { timeout: 4000 });
  await expect(page.locator("#timeline [data-stitch]")).toHaveCount(10);
  for (const s of await page.locator("#timeline [data-stitch]").all()) await expect(s).toBeVisible();
});

test("scrolling back unstitches", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 1);
  await expect(lit(page)).toHaveCount(10, { timeout: 4000 });
  await scrollToProgress(page, 0);
  await expect.poll(() => lit(page).count(), { timeout: 4000 }).toBeLessThanOrEqual(1);
  const needleTop = (await page.locator("[data-needle]").boundingBox()).y;
  const third = (await page.locator("#timeline [data-dot]").nth(2).boundingBox()).y;
  expect(needleTop).toBeLessThan(third);
  expect(await page.locator("#timeline [data-stitch]").nth(2).isVisible()).toBe(false);

  // the needle passes the third milestone again: its year decodes again
  const year = page.locator("#timeline [data-milestone]").nth(2).locator("[data-year]");
  await expect(year).toHaveText("2022–2024");
  await scrollToProgress(page, (await dotAt(page, 2)) + 0.04);
  await page.waitForFunction(
    () => document.querySelectorAll("#timeline [data-milestone]")[2].querySelector("[data-year]").textContent !== "2022–2024",
    null,
    { timeout: 1500, polling: 16 }
  );
  await expect(year).toHaveText("2022–2024", { timeout: 1000 });
});

test("resize keeps milestones in step", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(400);
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  expect(await lit(page).count()).toBe(await dotsAboveNeedle(page));
  expect(await lit(page).count()).toBeGreaterThan(0);
});

test("needle, thread and milestones share one axis", async ({ page }) => {
  await page.goto("/");
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  const centres = await page.evaluate(() => {
    const mid = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    const [rule, thread] = document.querySelectorAll("[data-timeline-list] > div");
    return {
      rule: mid(rule),
      thread: mid(thread),
      needle: mid(document.querySelector("[data-needle] path")),
      dot: mid(document.querySelector("#timeline [data-dot]")),
      stitch: mid(document.querySelector("#timeline [data-stitch]")),
    };
  });
  for (const [name, x] of Object.entries(centres)) {
    expect(Math.abs(x - centres.thread), `${name} at ${x}, thread at ${centres.thread}`).toBeLessThanOrEqual(0.1);
  }
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion is fully stitched", async ({ page }) => {
    await page.goto("/");
    await page.locator("#timeline").scrollIntoViewIfNeeded();
    await expect(lit(page)).toHaveCount(10);
    await expect(page.locator("[data-needle]")).toBeHidden();
    for (const s of await page.locator("#timeline [data-stitch]").all()) await expect(s).toBeVisible();
  });
});

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("no-JS shows full ink", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    const looks = await page.locator("#timeline [data-milestone]").evaluateAll((els) =>
      els.map((el) => [getComputedStyle(el).opacity, getComputedStyle(el.querySelector("h3")).color])
    );
    expect(looks).toEqual(Array(10).fill(["1", "rgb(11, 31, 58)"]));
    await expect(page.locator("[data-needle]")).toBeHidden();
  });
});

test("a reflow without a window resize keeps milestones in step", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  await page.evaluate(() => (document.querySelector("[data-timeline-list]").style.maxWidth = "420px"));
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  const h = await page.evaluate(() => {
    const w = document.querySelector("[data-timeline-list]");
    return [parseFloat(w.style.getPropertyValue("--h")), w.offsetHeight];
  });
  expect(h[0]).toBe(h[1]);
  expect(await lit(page).count()).toBe(await dotsAboveNeedle(page));
});
