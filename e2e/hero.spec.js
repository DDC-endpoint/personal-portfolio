import { test, expect } from "@playwright/test";

const KICKER = "Creative Technologist · Freelance Web Designer";

test("hero copy and removals", async ({ page, request }) => {
  await page.goto("/");
  const hero = page.locator("#top");
  await expect(hero.getByText("Currently")).toHaveCount(0);
  await expect(hero.getByText("scroll", { exact: true })).toHaveCount(0);
  await expect(hero.locator("p")).toContainText("In my second year of");
  const html = await (await request.get("/")).text();
  expect(html).toContain("In my second year of");
  expect(html).toContain("Creative Technologist");
});

test("mobile order", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  const top = async (loc) => (await loc.boundingBox()).y;
  const kicker = page.locator("#top").getByText(KICKER, { exact: true }).first();
  const name = page.locator("#top h1");
  const portrait = page.locator("[data-portrait]");
  const lede = page.locator("#top p");
  const ys = [await top(kicker), await top(name), await top(portrait), await top(lede)];
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  // The hero ends on the lede: the SERVICES button is gone (Phase 6).
  await expect(page.locator("#top a[href='/services']")).toHaveCount(0);
});

test("desktop stage", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  const stage = await page.locator("[data-portrait]").boundingBox();
  const hero = await page.locator("#top").boundingBox();
  // h1 is block-wide; measure where its letters actually end
  const nameRight = await page.locator("#top h1 span").evaluateAll((els) => Math.max(...els.map((e) => e.getBoundingClientRect().right)));
  expect(Math.abs(stage.y + stage.height - (hero.y + hero.height))).toBeLessThanOrEqual(2);
  expect(stage.x).toBeGreaterThan(nameRight);
  expect(Math.abs(stage.width - 568)).toBeLessThanOrEqual(2);
});

// The hero's drift (lib/heroDrift.js) and the scroll progress line, on the
// page's scroll timeline where the browser has one: drawn against wanted at
// several scroll positions, moving and at rest.
const drawn = (page) =>
  page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const hero = document.querySelector("#top"), top = hero.getBoundingClientRect().top + scrollY, h = hero.offsetHeight;
    const p = Math.min(1, Math.max(0, (scrollY - top) / h));
    const off = [];
    for (const el of hero.querySelectorAll("[data-drift]")) {
      const cs = getComputedStyle(el);
      off.push(Math.abs(new DOMMatrix(cs.transform).m42 - -100 * p), Math.abs(+cs.opacity - (1 - Math.min(1, p / 0.8))));
    }
    for (const el of hero.querySelectorAll("[data-drift-meta]")) off.push(Math.abs(+getComputedStyle(el).opacity - (1 - Math.min(1, p / 0.12))));
    const line = document.querySelector(".scroll-progress");
    const share = scrollY / (document.documentElement.scrollHeight - innerHeight);
    off.push(Math.abs(new DOMMatrix(getComputedStyle(line).transform).a - share));
    return Math.max(...off);
  });

test("the hero drifts and the progress line tracks the scroll, on the page's scroll timeline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".scroll-progress")).toHaveCount(1); // the timeline line, not the frame loop's
  // The fades are always on the page's scroll timeline (each part a layer
  // throughout, as framer's kept them); the rise joins them while it scrolls.
  const props = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("#top [data-drift], #top [data-drift-meta]")].map((el) =>
        el.getAnimations().map((a) => `${a.timeline?.constructor.name}:${Object.keys(a.effect.getKeyframes()[0]).filter((k) => k === "opacity" || k === "transform")}`).sort().join(" ")
      )
    );
  const FADE = "ScrollTimeline:opacity";
  await expect.poll(async () => (await props()).every((k) => k === FADE)).toBe(true);
  const moving = await page.evaluate(
    () =>
      new Promise((resolve) => {
        addEventListener("scroll", () => setTimeout(() => resolve([...document.querySelectorAll("#top [data-drift]")].map((el) => el.getAnimations().length))), { once: true });
        scrollTo({ top: 60, behavior: "instant" });
      })
  );
  expect(moving).toEqual(moving.map(() => 2));
  for (const y of [0, 37, 120, 300, 640, 2000, 0]) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
    expect(await drawn(page)).toBeLessThan(0.01);
  }
  // At rest the rise is a plain style again, the same value.
  await page.evaluate(() => scrollTo({ top: 300, behavior: "instant" }));
  await expect.poll(async () => (await props()).every((k) => k === FADE), { timeout: 2000 }).toBe(true);
  expect(await drawn(page)).toBeLessThan(0.01);
});
