import { test, expect } from "@playwright/test";

const squash = (s) => s.replace(/\s+/g, " ").trim();

test("FAQ JSON-LD matches the page", async ({ page }) => {
  await page.goto("/services");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = blocks.map((b) => JSON.parse(b)).find((d) => d["@type"] === "FAQPage");
  expect(faq).toBeTruthy();

  const items = page.locator("#faq details");
  await expect(items).toHaveCount(faq.mainEntity.length);
  for (let i = 0; i < faq.mainEntity.length; i++) {
    // The summary also holds the "+" toggle; the question is its text node.
    const q = await items.nth(i).locator("summary").evaluate((el) => el.firstChild.textContent);
    const a = await items.nth(i).locator("p").textContent();
    expect(faq.mainEntity[i].name).toBe(squash(q));
    expect(faq.mainEntity[i].acceptedAnswer.text).toBe(squash(a));
  }
});

// Scrambling text lives in an aria-hidden span; a static sr-only copy carries the name.
const scrambling = (el) => el.locator('[aria-hidden="true"]').first();

test.describe("motion basics (desktop)", () => {
  test.skip(({ isMobile }) => isMobile);

  test("section labels decode", async ({ page }) => {
    await page.goto("/services");
    const labels = page.locator(".section-label", { hasText: "§" });
    await expect(labels).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      const label = labels.nth(i);
      const final = (await label.locator(".sr-only").textContent()) ?? "";
      await expect(label.locator("[data-letters]")).toHaveCount(1);
      await label.scrollIntoViewIfNeeded();
      await expect(label.locator("[data-letters]")).toHaveText(final, { timeout: 3000 });
    }
  });

  test("a section label scrambles before it settles", async ({ page }) => {
    await page.goto("/services");
    const label = page.locator("#faq .section-label");
    await label.scrollIntoViewIfNeeded();
    await expect.poll(() => label.getAttribute("aria-busy"), { timeout: 3000 }).toBe("true");
    await expect(label.locator("[data-letters]")).toHaveText("§ 04 — FAQ", { timeout: 1500 });
  });

  test("mono buttons scramble without moving", async ({ page }) => {
    await page.goto("/services");
    await page.waitForTimeout(1200); // the corner button floats in
    const buttons = [
      page.locator("#top a[href^='https://wa.me']"),
      page.locator("#top a[href^='mailto:']"),
      page.locator("#top a[href='/']"),
    ];
    for (const b of buttons) {
      await expect(b).toBeVisible();
      const label = scrambling(b);
      const final = await label.innerText();
      const widths = [];
      await b.hover();
      let changed = false;
      for (let i = 0; i < 10; i++) {
        widths.push((await b.boundingBox()).width);
        if ((await label.innerText()) !== final) changed = true;
        await page.waitForTimeout(20);
      }
      expect(changed, final).toBe(true);
      expect(Math.max(...widths) - Math.min(...widths), final).toBeLessThanOrEqual(0.5);
      // the arrow sits outside the scrambling span
      expect(await label.innerText()).not.toMatch(/[→↗]/);
      await page.mouse.move(0, 0);
    }
  });

  test("underlined links don't scramble", async ({ page }) => {
    await page.goto("/services");
    const links = [page.locator('header nav a[href="#faq"]'), page.locator("#recent a.link-line")];
    for (const l of links) {
      await l.scrollIntoViewIfNeeded();
      await l.hover();
      const seen = new Set();
      for (let i = 0; i < 10; i++) {
        seen.add(await l.innerText());
        await page.waitForTimeout(30);
      }
      expect(seen.size).toBe(1);
    }
  });
});

test("the mobile menu's Portfolio button scrambles", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/services");
  await page.getByRole("button", { name: /menu/i }).click();
  const b = page.getByRole("dialog", { name: "Services menu" }).locator("a[href='/']");
  await expect(b).toBeVisible();
  await expect(b.locator(".sr-only")).toHaveText("Portfolio");
});

// § 02 How it works: the four steps on a mini circuit.
const steps = (page) => page.locator("#process [data-milestone]");
const litSteps = (page) => page.locator('#process [data-milestone][data-lit="true"]');

// Scrolls so the circuit's raw scroll progress is p ("start 0.7" → "end 0.55").
async function stepsProgress(page, p) {
  await page.evaluate((pp) => {
    const r = document.querySelector("#process [data-circuit-list]").getBoundingClientRect();
    const top = r.top + window.scrollY, vh = innerHeight;
    const y0 = top - 0.7 * vh, y1 = top + r.height - 0.55 * vh;
    window.scrollTo(0, y0 + pp * (y1 - y0));
  }, p);
}

test.describe("How it works (desktop)", () => {
  test.skip(({ isMobile }) => isMobile);

  test("steps light as you scroll", async ({ page }) => {
    await page.goto("/services");
    await expect(steps(page)).toHaveCount(4);
    await stepsProgress(page, 0);
    await page.waitForTimeout(600);
    expect(await litSteps(page).count()).toBeLessThanOrEqual(1);
    await stepsProgress(page, 1);
    await expect(litSteps(page)).toHaveCount(4, { timeout: 4000 });
    const pad = steps(page).nth(3).locator("[data-dot]");
    await expect.poll(() => pad.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(37, 99, 235)");
    await stepsProgress(page, 0);
    await expect.poll(() => litSteps(page).count(), { timeout: 4000 }).toBeLessThanOrEqual(1);
  });

  test("every step lights by the bottom of a tall page", async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1600 });
    await page.goto("/services");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(litSteps(page)).toHaveCount(4, { timeout: 4000 });
  });
});

test("steps sit in one column", async ({ page }) => {
  await page.goto("/services");
  const lefts = await steps(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
  expect(lefts).toHaveLength(4);
  for (const x of lefts) expect(Math.abs(x - lefts[0])).toBeLessThanOrEqual(1);
});

test("pad labels P01–P04 show on desktop only", async ({ page, isMobile }) => {
  await page.goto("/services");
  const labels = page.locator("#process [data-pad-label]");
  await expect(labels).toHaveText(["P01", "P02", "P03", "P04"]);
  if (isMobile) for (const l of await labels.all()) await expect(l).toBeHidden();
  else for (const l of await labels.all()) await expect(l).toBeVisible();
});

test("reduced motion is the finished circuit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services");
  await page.locator("#process").scrollIntoViewIfNeeded();
  await expect(litSteps(page)).toHaveCount(4);
  await expect(page.locator("#process [data-head]")).toBeHidden();
  await expect(page.locator("#process [data-flow]")).toBeHidden();
});

test.describe("How it works without JS", () => {
  test.use({ javaScriptEnabled: false });
  test("shows the finished line", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.goto("/services");
    await expect(page.locator("#process [data-trace-fallback]")).toBeVisible();
    const pads = await page.locator("#process [data-dot]").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(pads).toEqual(Array(4).fill("rgb(37, 99, 235)"));
  });
});
