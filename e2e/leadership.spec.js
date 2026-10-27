import { test, expect } from "@playwright/test";

// Rule draw is measured as its drawn width over its parent's width, so the
// test doesn't care whether it's done with `transform` or `scale`.
const state = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-role-row]")].map((row) => {
      const rule = row.querySelector("[data-role-rule]");
      const text = row.querySelector("[data-role-text]");
      return {
        rule: rule ? rule.getBoundingClientRect().width / row.getBoundingClientRect().width : null,
        text: Number(getComputedStyle(text).opacity),
      };
    })
  );

const scrollToRoles = (page) =>
  page.locator("[data-role-row]").first().evaluate((el) => el.scrollIntoView({ block: "center" }));

test("roles are unchanged", async ({ page }) => {
  await page.goto("/");
  const titles = await page.locator("[data-role-row] [data-role-text] .font-display").allTextContents();
  expect(titles).toEqual([
    "Head Prefect",
    "District Interact Representative",
    "Assistant District Interact Secretary",
    "Senior Prefect",
    "Club President",
  ]);
});

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile);

  test("rows draw then rise, in order", async ({ page }) => {
    await page.goto("/");
    const before = await state(page);
    expect(before[0].rule).toBeNull(); // the first row has no rule
    expect(before[2].rule).toBeLessThan(0.01);
    expect(before[2].text).toBe(0);

    await scrollToRoles(page);
    const shownAt = Array(5).fill(null);
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      const s = await state(page);
      s.forEach((r, i) => {
        if (shownAt[i] === null && r.text >= 0.999) shownAt[i] = Date.now() - t0;
      });
      if (shownAt.every((v) => v !== null)) break;
      await page.waitForTimeout(50);
    }
    await expect.poll(async () => (await state(page)).every((r) => r.text === 1), { timeout: 1000 }).toBe(true);
    const after = await state(page);
    for (const r of after.slice(1)) expect(r.rule).toBeGreaterThan(0.999);
    expect(shownAt[1]).toBeLessThan(shownAt[4]);
  });

  test("a rule draws before its text rises", async ({ page }) => {
    await page.goto("/");
    await scrollToRoles(page);
    let seen = null;
    const t0 = Date.now();
    while (Date.now() - t0 < 2000 && seen === null) {
      const r = (await state(page))[1];
      if (r.rule > 0.5) seen = r.text;
      await page.waitForTimeout(16);
    }
    expect(seen).not.toBeNull();
    expect(seen).toBeLessThan(0.5);
  });
});

test("reduced motion shows the finished rows", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const s = await state(page);
  expect(s).toHaveLength(5);
  for (const r of s.slice(1)) expect(r.rule).toBeGreaterThan(0.999);
  for (const r of s) expect(r.text).toBe(1);
});

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("shows the finished rows", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.goto("/");
    const s = await state(page);
    expect(s).toHaveLength(5);
    for (const r of s.slice(1)) expect(r.rule).toBeGreaterThan(0.999);
    for (const r of s) expect(r.text).toBe(1);
  });
});
