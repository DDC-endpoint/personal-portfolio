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

// § 03 Recent work: skeleton browser cards, activated like Projects.
const workCards = (page) => page.locator("#recent [data-card]");

test("recent work: four cards in order with the right links", async ({ page }) => {
  await page.goto("/services");
  const cards = workCards(page);
  await expect(cards).toHaveCount(4);
  await expect(cards.locator("[data-card-label]")).toHaveText([
    "01 — This Portfolio — 2026",
    "02 — Spades Solutions — 2026",
    "03 — Aloys Travels — 2026",
    "04 — Danella De Cruz — 2026",
  ]);
  const hrefs = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(hrefs).toEqual(["/", "https://enderguardian25.github.io/spades-solutions/index.html", "https://aloys-travels.com/", "https://danelladc.com"]);
  await expect(cards.first()).not.toHaveAttribute("target", /.*/);
  for (const i of [1, 2, 3]) {
    await expect(cards.nth(i)).toHaveAttribute("target", "_blank");
    await expect(cards.nth(i)).toHaveAttribute("rel", /noopener/);
  }
  await expect(cards.first()).toHaveAttribute("aria-label", "This Portfolio, 2026 (portfolio home)");
});

test("recent work: reduced motion shows the screenshots", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/services");
  const ops = await workCards(page).locator("img").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
  expect(ops).toEqual(["1", "1", "1", "1"]);
});

test.describe("recent work (desktop)", () => {
  test.skip(({ isMobile }) => isMobile);

  test("hover decodes the card under a still pointer", async ({ page }) => {
    await page.goto("/services");
    const card = workCards(page).nth(2);
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 3);
    await expect(card).toHaveAttribute("data-decode", "shot", { timeout: 2500 });
    await expect.poll(() => card.locator("p").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    for (const i of [0, 1, 3]) await expect(workCards(page).nth(i)).toHaveAttribute("data-active", "false");
  });

  test("keyboard reaches every card in order, and Enter opens it", async ({ page }) => {
    await page.goto("/services");
    await workCards(page).first().locator("[data-decode]").or(workCards(page).first()).first().waitFor();
    await page.locator("#recent a.link-line").focus();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press("Tab");
      await expect(workCards(page).nth(i)).toBeFocused();
      await expect(workCards(page).nth(i)).toHaveAttribute("data-active", "true");
    }
    await workCards(page).first().focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });
});

test("on touch the centred card decodes", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/services");
  const card = workCards(page).nth(1);
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.mouse.wheel(0, 1); // a scroll event to re-pick
  await expect(card).toHaveAttribute("data-active", "true", { timeout: 2000 });
  await expect(workCards(page).first()).toHaveAttribute("data-active", "false");
});

// § 05 Start a project: the growing electric card, like Contact.
const startCard = (page) => page.locator("#start [data-electric-card]");
const clipOf = (page) => startCard(page).evaluate((el) => getComputedStyle(el).clipPath);

test.describe("start card (desktop)", () => {
  test.skip(({ isMobile }) => isMobile);

  test("grows with scroll", async ({ page }) => {
    await page.goto("/services");
    await page.waitForTimeout(800);
    await startCard(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 0.9 * innerHeight));
    await expect.poll(async () => Number((await clipOf(page)).match(/inset\([\d.]+px ([\d.]+)px/)?.[1] ?? 0)).toBeGreaterThan(500);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => clipOf(page)).toBe("inset(0px round 8px)");
  });

  test("focus opens it fully", async ({ page }) => {
    await page.goto("/services");
    await page.waitForTimeout(800);
    await startCard(page).evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 0.9 * innerHeight));
    await expect.poll(async () => (await clipOf(page)) !== "inset(0px round 8px)").toBe(true);
    const wa = startCard(page).locator("a[href^='https://wa.me']");
    await wa.focus();
    await expect.poll(() => clipOf(page)).toBe("inset(0px round 8px)");
    const card = await startCard(page).boundingBox();
    const b = await wa.boundingBox();
    expect(b.x).toBeGreaterThanOrEqual(card.x);
    expect(b.x + b.width).toBeLessThanOrEqual(card.x + card.width);
  });

  test("reduced motion: the full card", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/services");
    await startCard(page).scrollIntoViewIfNeeded();
    expect(await clipOf(page)).toBe("none");
  });
});

test.describe("start card without JS", () => {
  test.use({ javaScriptEnabled: false });
  test("is the full card", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.goto("/services");
    expect(await clipOf(page)).toBe("none");
  });
});

test("the start card keeps the copy", async ({ page }) => {
  await page.goto("/services");
  const sr = await startCard(page).locator("h2").evaluate((el) => (el.querySelector(":scope > .sr-only") ?? el).textContent.replace(/\s+/g, " ").trim());
  expect(sr).toBe("Let’s build your site.");
  await expect(startCard(page).locator("p")).toHaveText(
    "Tell me what you have in mind and I’ll come back with a scope, a fixed starting price and a timeline, usually within a day. No obligation."
  );
});

for (const theme of ["light", "dark"]) {
  test(`start card text passes AA (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/services");
    const ratio = await startCard(page).evaluate((card) => {
      const lum = (c) => {
        const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const bg = lum(getComputedStyle(card).backgroundColor);
      return ["h2", "p"].map((s) => {
        const fg = lum(getComputedStyle(card.querySelector(s)).color);
        const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg];
        return (hi + 0.05) / (lo + 0.05);
      });
    });
    expect(await startCard(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(37, 99, 235)");
    for (const r of ratio) expect(r).toBeGreaterThanOrEqual(4.5);
  });
}

// The trading name on the business page (docs/v3/seo-geo.md).
test.describe("DDC Web Services on /services", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");

  test("the H1 names the service and the place", async ({ page }) => {
    await page.goto("/services");
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    const name = (await h1.textContent()).replace(/\s+/g, " ");
    expect(name).toContain("Freelance web designer · Colombo, Sri Lanka");
    expect(name).toContain("Clean, fast websites, built in days.");
  });

  test("the hero names the business, by Damian, and the lead says so", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("#top")).toContainText("DDC Web Services");
    await expect(page.locator("#top")).toContainText("by Damian De Cruz");
    await expect(page.locator("#top p").first()).toContainText("freelance web designer in Colombo, working as DDC Web Services.");
  });

  test("prices carry their date, and FAQ questions are headings", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("#what-i-do")).toContainText("Prices updated October 2026.");
    await expect(page.locator("#faq summary h3")).toHaveCount(7);
  });

  test("Spades is labelled a client design that hasn't launched", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("#recent [data-card]").nth(1)).toContainText("Client design · not launched");
  });
});
