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
  const button = page.locator("#top a[href='/services']:visible");
  const ys = [await top(kicker), await top(name), await top(portrait), await top(lede), await top(button)];
  expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  // full width = the hero content width inside its 24px gutters
  expect((await button.boundingBox()).width).toBeGreaterThanOrEqual(390 - 48 - 1);
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
