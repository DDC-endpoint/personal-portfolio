import { test, expect } from "@playwright/test";
import { ENTRIES } from "../lib/timeline.js";

const lit = (page) => page.locator('#timeline [data-milestone][data-lit="true"]');
const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop");
const ELECTRIC = "rgb(37, 99, 235)";

// Scrolls so the circuit's scroll progress is p (offsets "start 0.7" → "end 0.55").
async function scrollToProgress(page, p) {
  await page.evaluate((pp) => {
    const r = document.querySelector("[data-timeline-list]").getBoundingClientRect();
    const top = r.top + window.scrollY, vh = innerHeight;
    const y0 = top - 0.7 * vh, y1 = top + r.height - 0.55 * vh;
    window.scrollTo(0, y0 + pp * (y1 - y0));
  }, p);
}

// The fraction of the list at which milestone i's pad sits.
const dotAt = (page, i) =>
  page.evaluate((k) => {
    const list = document.querySelector("[data-timeline-list]").getBoundingClientRect();
    const d = document.querySelectorAll("#timeline [data-dot]")[k].getBoundingClientRect();
    return (d.top + d.height / 2 - list.top) / list.height;
  }, i);

// Milestones whose pad sits at or above the head of the current.
const dotsAboveHead = (page) =>
  page.evaluate(() => {
    const r = document.querySelector("[data-head]").getBoundingClientRect();
    const tip = r.top + r.height / 2;
    return [...document.querySelectorAll("#timeline [data-dot]")].filter((d) => {
      const b = d.getBoundingClientRect();
      return b.top + b.height / 2 <= tip + 1;
    }).length;
  });

const padColour = (page, i) =>
  page.locator("#timeline [data-dot]").nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);

const counter = (page, info) => page.locator(info.project.name === "desktop" ? "[data-counter=side]" : "[data-counter=strip]");
const caption = (page, info) => counter(page, info).locator("[data-counter-caption]");
const count = (page, info) => counter(page, info).locator("[data-counter-count]");

test("entries run oldest first", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#timeline h3")).toHaveText(ENTRIES.map((e) => e.title));
});

test("the circuit lights pads as you scroll", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 0);
  await page.waitForTimeout(800);
  expect(await lit(page).count()).toBeLessThanOrEqual(1);
  await scrollToProgress(page, 1);
  await expect(lit(page)).toHaveCount(10, { timeout: 4000 });
  await expect.poll(() => padColour(page, 9)).toBe(ELECTRIC);
});

test("scrolling back runs the current back", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  await scrollToProgress(page, 1);
  await expect(lit(page)).toHaveCount(10, { timeout: 4000 });
  await scrollToProgress(page, 0);
  await expect.poll(() => lit(page).count(), { timeout: 4000 }).toBeLessThanOrEqual(1);
  const headTop = (await page.locator("[data-head]").boundingBox()).y;
  const third = (await page.locator("#timeline [data-dot]").nth(2).boundingBox()).y;
  expect(headTop).toBeLessThan(third);
  await expect.poll(() => padColour(page, 2)).not.toBe(ELECTRIC);

  // the current passes the third milestone again: its year decodes again
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
  expect(await lit(page).count()).toBe(await dotsAboveHead(page));
  expect(await lit(page).count()).toBeGreaterThan(0);
});

test("the trace and every pad share one axis", async ({ page }) => {
  await page.goto("/");
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(1200);
  const centres = await page.evaluate(() => {
    const mid = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    // both trace layers are drawn symmetric about the axis
    return {
      trace: mid(document.querySelector("[data-trace]")),
      lit: mid(document.querySelector("[data-trace-lit]")),
      pads: [...document.querySelectorAll("#timeline [data-dot]")].map(mid),
    };
  });
  for (const x of [centres.lit, ...centres.pads]) expect(Math.abs(x - centres.trace)).toBeLessThanOrEqual(0.1);
});

test("the head rides the trace", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  // halfway between the first two pads the trace is out in its side lane
  await scrollToProgress(page, ((await dotAt(page, 0)) + (await dotAt(page, 1))) / 2);
  await page.waitForTimeout(1500);
  const dx = await page.evaluate(() => {
    const mid = (el) => {
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2;
    };
    return mid(document.querySelector("[data-head]")) - mid(document.querySelector("[data-trace]"));
  });
  expect(Math.abs(dx)).toBeGreaterThan(6);
});

test("current flows along the lit trace at rest, and only while on screen", async ({ page }, info) => {
  desktopOnly(info);
  await page.goto("/");
  const state = () => page.locator("[data-flow]").evaluate((el) => getComputedStyle(el).animationPlayState);
  await scrollToProgress(page, 0.5);
  await expect.poll(state).toBe("running");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(state).toBe("paused");
});

test("pad labels show on desktop only", async ({ page }, info) => {
  await page.goto("/");
  const label = page.locator("#timeline [data-pad-label]").first();
  await expect(label).toHaveText("P01");
  if (info.project.name === "desktop") await expect(label).toBeVisible();
  else await expect(label).toBeHidden();
});

test("the year counter follows the lit milestone", async ({ page }, info) => {
  await page.goto("/");
  await scrollToProgress(page, 0);
  await page.waitForTimeout(800);
  await scrollToProgress(page, (await dotAt(page, 5)) + 0.01);
  await expect(counter(page, info)).toHaveAttribute("data-value", "2025", { timeout: 4000 });
  await expect(caption(page, info)).toHaveText("Began BSc (Hons) Computer Science", { timeout: 2000 });
  await expect(count(page, info)).toHaveText("06 / 10");
  await scrollToProgress(page, 1);
  await expect(counter(page, info)).toHaveAttribute("data-value", "2026", { timeout: 4000 });
  await expect(caption(page, info)).toHaveText("This portfolio", { timeout: 2000 });
});

// Damian: a caption that wrapped to two lines made the counter jump.
test("the counter keeps its height on every entry", async ({ page }, info) => {
  await page.goto("/");
  const heights = new Set();
  for (const i of [0, 2, 5, 9]) {
    await scrollToProgress(page, (await dotAt(page, i)) + 0.01);
    await expect(count(page, info)).toHaveText(`${String(i + 1).padStart(2, "0")} / 10`, { timeout: 4000 });
    await page.waitForTimeout(600);
    heights.add(await counter(page, info).evaluate((el) => el.offsetHeight));
  }
  expect(heights.size).toBe(1);
});

test("on phones the counter sticks under the nav", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "mobile");
  await page.goto("/");
  await scrollToProgress(page, 0.5);
  await page.waitForTimeout(800);
  const strip = await page.locator("[data-counter=strip]").boundingBox();
  const nav = await page.locator("header").first().boundingBox();
  expect(Math.abs(strip.y - (nav.y + nav.height))).toBeLessThanOrEqual(2);
  await expect(page.locator("[data-counter=side]")).toBeHidden();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("reduced motion is the finished circuit, with no moving current", async ({ page }) => {
    await page.goto("/");
    await page.locator("#timeline").scrollIntoViewIfNeeded();
    await expect(lit(page)).toHaveCount(10);
    await expect(page.locator("[data-head]")).toBeHidden();
    await expect(page.locator("[data-flow]")).toBeHidden();
    expect(await page.locator("[data-trace-lit]").evaluate((el) => getComputedStyle(el).clipPath)).toBe("none");
  });
});

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("no-JS shows full ink and the finished line", async ({ page }, info) => {
    desktopOnly(info);
    await page.goto("/");
    const looks = await page.locator("#timeline [data-milestone]").evaluateAll((els) =>
      els.map((el) => [getComputedStyle(el).opacity, getComputedStyle(el.querySelector("h3")).color])
    );
    expect(looks).toEqual(Array(10).fill(["1", "rgb(11, 31, 58)"]));
    await expect(page.locator("[data-trace-fallback]")).toBeVisible();
    await expect(page.locator("[data-head]")).toHaveCount(0);
    await expect(page.locator("[data-counter=side]")).toBeHidden();
    expect(await padColour(page, 0)).toBe(ELECTRIC);
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
  expect(await lit(page).count()).toBe(await dotsAboveHead(page));
});
