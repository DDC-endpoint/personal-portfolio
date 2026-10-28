import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

// /portfolio (docs/v3/plan-phase-6.md → Task 5).
const TITLES = [
  "Aloys Travels",
  "Danella De Cruz",
  "Spades Solutions",
  "Kahatagaha Graphite",
  "This Portfolio",
  "Personal Dashboard",
  "Interact District 3220",
  "ai-studio",
];
const CHIPS = [
  ["All", 8],
  ["Client", 4],
  ["Concept", 1],
  ["Personal", 3],
  ["In progress", 2],
];

const cards = (page) => page.locator("[data-work-card]");
const shown = (page) => page.locator("[data-work-card]:not([hidden])");
const cardOf = (page, title) => cards(page).filter({ has: page.locator("h3", { hasText: title }) });
const chip = (page, name) => page.getByRole("group", { name: "Filter the work" }).getByRole("button", { name: new RegExp(`^${name}`) });
const viewButton = (page, name) => page.getByRole("group", { name: "View" }).getByRole("button", { name });
const ready = (page) => page.waitForFunction(() => document.querySelector("[data-work]")?.dataset.ready === "true");

test("the first row lands only as the curtain lifts", async ({ page }) => {
  await page.addInitScript(() => {
    new MutationObserver(() => {
      const c = document.querySelector("[data-curtain]");
      if (!c || window.__atLift !== undefined) return;
      if (c.dataset.curtain === "covered") window.__covered = [...document.querySelectorAll("[data-work-card]")].slice(0, 3).map((el) => el.hasAttribute("data-in"));
      if (c.dataset.curtain === "lifting") window.__atLift = true;
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-curtain"] });
  });
  await page.goto("/portfolio");
  await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
  expect(await page.evaluate(() => window.__covered)).toEqual([false, false, false]);
  await expect(cards(page).first()).toHaveAttribute("data-in", "", { timeout: 4000 });
});

test("rows further down still rise when reached, however long the visitor waits", async ({ page }) => {
  await page.goto("/portfolio");
  await ready(page);
  await page.waitForTimeout(6000); // past the pre-hydration failsafe
  const last = cardOf(page, "ai-studio");
  await expect(last).not.toHaveAttribute("data-in", "");
  expect(await last.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await last.scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute("data-in", "", { timeout: 4000 });
  await expect(last).toHaveCSS("opacity", "1", { timeout: 4000 });
});

test("hero: the count, the title and the lede", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.locator("[data-work-count]")).toHaveText("06 live · 02 on the way");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("All work.");
  await expect(page.getByText("Client sites, concepts and my own tools, newest first.")).toBeVisible();
});

test("eight cards, newest first, with the chips' counts", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(cards(page).locator("h3")).toHaveText(TITLES);
  for (const [name, n] of CHIPS) await expect(chip(page, name)).toHaveText(`${name}${n}`);
  await expect(chip(page, "All")).toHaveAttribute("aria-pressed", "true");
});

test("each filter shows the right cards", async ({ page }) => {
  await page.goto("/portfolio");
  await ready(page);
  const expected = {
    Client: ["Aloys Travels", "Danella De Cruz", "Spades Solutions", "Interact District 3220"],
    Concept: ["Kahatagaha Graphite"],
    Personal: ["This Portfolio", "Personal Dashboard", "ai-studio"],
    "In progress": ["Interact District 3220", "ai-studio"],
    All: TITLES,
  };
  for (const [name, titles] of Object.entries(expected)) {
    await chip(page, name).click();
    await expect(chip(page, name)).toHaveAttribute("aria-pressed", "true");
    await expect(shown(page).locator("h3")).toHaveText(titles);
    for (const [other] of CHIPS) if (other !== name) await expect(chip(page, other)).toHaveAttribute("aria-pressed", "false");
  }
});

test("List turns every card into a row, and Grid back", async ({ page, isMobile }) => {
  await page.goto("/portfolio");
  await ready(page);
  await expect(viewButton(page, "Grid")).toHaveAttribute("aria-pressed", "true");
  await viewButton(page, "List").click();
  await expect(viewButton(page, "List")).toHaveAttribute("aria-pressed", "true");
  await expect(viewButton(page, "Grid")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-work]")).toHaveAttribute("data-view", "list");
  await page.waitForTimeout(1200); // the morph
  const rows = await cards(page).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const f = el.querySelector("[data-frame]").getBoundingClientRect();
      return { w: r.width, h: r.height, fw: f.width };
    })
  );
  const width = await page.locator("[data-work]").evaluate((el) => el.clientWidth);
  for (const r of rows) {
    expect(r.w).toBeGreaterThan(width * 0.95); // full-width rows
    expect(r.fw).toBeLessThan(isMobile ? 100 : 140); // a thumbnail
  }
  // Rows: number, name, first tag (desktop), year and ↗; no blurb.
  const aloys = cardOf(page, "Aloys Travels");
  await expect(aloys.locator("[data-blurb]")).toBeHidden();
  if (!isMobile) await expect(aloys.locator("[data-tags] > :visible")).toHaveText(["Client Work"]);
  await viewButton(page, "Grid").click();
  await expect(page.locator("[data-work]")).toHaveAttribute("data-view", "grid");
  await page.waitForTimeout(1200);
  await expect(aloys.locator("[data-blurb]")).toBeVisible();
});

test("live cards open in a new tab, This Portfolio goes Home, upcoming cards aren't links", async ({ page }) => {
  await page.goto("/portfolio");
  const aloys = cardOf(page, "Aloys Travels").getByRole("link");
  await expect(aloys).toHaveAttribute("href", "https://aloys-travels.com/");
  await expect(aloys).toHaveAttribute("target", "_blank");
  await expect(aloys).toHaveAttribute("rel", /noopener/);
  const self = cardOf(page, "This Portfolio").getByRole("link");
  await expect(self).toHaveAttribute("href", "/");
  await expect(self).not.toHaveAttribute("target", /.*/);
  await expect(cardOf(page, "ai-studio").locator("a")).toHaveCount(0);
  await expect(cardOf(page, "Interact District 3220").locator("a")).toHaveCount(0);
});

test("the address bar types; the live dot only on live cards", async ({ page }) => {
  await page.goto("/portfolio");
  const address = cardOf(page, "Aloys Travels").locator("[data-address]");
  // It starts empty and types in once the card lands.
  await expect.poll(() => address.textContent(), { timeout: 4000 }).toMatch(/^.{1,16}$/);
  await expect(address).toHaveText("aloys-travels.com", { timeout: 4000 });
  for (const t of TITLES) {
    const live = !["Interact District 3220", "ai-studio"].includes(t);
    await expect(cardOf(page, t).locator("[data-status]")).toHaveAttribute("data-live", String(live));
  }
});

test("upcoming cards show the build loop", async ({ page }) => {
  await page.goto("/portfolio");
  const up = cardOf(page, "ai-studio");
  await expect(up.locator("[data-build]")).toBeAttached();
  await expect(up.getByText("loading… 2026 →")).toBeAttached();
});

test("the loops run only on screen", async ({ page }) => {
  await page.goto("/portfolio");
  await ready(page);
  const up = cardOf(page, "ai-studio");
  const state = () => up.locator("[data-build] i").first().evaluate((el) => getComputedStyle(el).animationPlayState);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(up).toHaveAttribute("data-onscreen", "false");
  expect(await state()).toBe("paused");
  await up.scrollIntoViewIfNeeded();
  await expect(up).toHaveAttribute("data-onscreen", "true");
  expect(await state()).toBe("running");
  const dot = cardOf(page, "Aloys Travels").locator("[data-status]");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(cardOf(page, "Aloys Travels")).toHaveAttribute("data-onscreen", "false");
  expect(await dot.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
});

test("a resting pointer scrolls the preview down, and leaving brings it back", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones preview the card nearest the centre");
  await page.goto("/portfolio");
  await ready(page);
  const card = cardOf(page, "Aloys Travels");
  const img = card.locator("[data-preview]");
  const y = () => img.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  const box = await card.locator("[data-frame]").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // The full capture swaps in when the preview first starts.
  await expect(img).toHaveAttribute("src", "/projects/full/aloys-travels.webp");
  await expect.poll(y, { timeout: 4000 }).toBeLessThan(-40);
  await page.mouse.move(5, 5);
  await expect.poll(y, { timeout: 4000 }).toBe(0);
});

test("phones preview the card nearest the centre once scrolling settles", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phones");
  await page.goto("/portfolio");
  await ready(page);
  const card = cardOf(page, "Danella De Cruz");
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const y = () => card.locator("[data-preview]").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  await expect.poll(y, { timeout: 5000 }).toBeLessThan(-20);
});

test("the end card types your-site.com and links to Contact", async ({ page }) => {
  await page.goto("/portfolio");
  const end = page.locator("[data-portfolio-end]");
  await end.scrollIntoViewIfNeeded();
  await expect(end.getByText("Your project next.")).toBeVisible();
  await expect(end.locator("[data-address]")).toHaveText("your-site.com", { timeout: 4000 });
  await expect(end.getByRole("link", { name: "Start a project" })).toHaveAttribute("href", "/#contact");
});

test("reduced motion: everything in place, no preview", async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/portfolio");
  await ready(page);
  await expect(cardOf(page, "Aloys Travels").locator("[data-address]")).toHaveText("aloys-travels.com");
  for (const t of TITLES) {
    await expect(cardOf(page, t)).toHaveCSS("opacity", "1");
    await expect(cardOf(page, t)).toHaveCSS("transform", "none");
  }
  expect(await cardOf(page, "Aloys Travels").locator("[data-status]").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  if (!isMobile) {
    const card = cardOf(page, "Aloys Travels");
    const box = await card.locator("[data-frame]").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(1200);
    expect(await card.locator("[data-preview]").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
  }
  // Filters change instantly.
  await chip(page, "Concept").click();
  await expect(shown(page).locator("h3")).toHaveText(["Kahatagaha Graphite"]);
});

test("without JS: all eight cards, no chips or view switch", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/portfolio");
  await expect(cards(page).locator("h3")).toHaveText(TITLES);
  for (const t of TITLES) await expect(cardOf(page, t)).toBeVisible();
  await expect(page.getByRole("group", { name: "Filter the work" })).toBeHidden();
  await expect(page.getByRole("group", { name: "View" })).toBeHidden();
  await expect(cardOf(page, "Aloys Travels").locator("[data-address]")).toHaveText("aloys-travels.com");
  await context.close();
});

test("SEO: title, canonical and the CollectionPage", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page).toHaveTitle("Portfolio: Websites by Damian De Cruz | DDC Web Services");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe("https://damiandc.com/portfolio");
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toBe(
    "Every website I’ve designed and built: client sites, concepts and my own tools, from Colombo, Sri Lanka."
  );
  const graphs = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent)));
  const page_ = graphs.flatMap((g) => g["@graph"] ?? [g]).find((n) => n["@type"] === "CollectionPage");
  expect(page_.mainEntity.itemListElement).toHaveLength(6);
});

test("no console errors", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/portfolio");
  await ready(page);
  await chip(page, "Client").click();
  await viewButton(page, "List").click();
  await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test("“See the full portfolio” on /services lands here", async ({ page }) => {
  await page.goto("/services");
  const link = page.getByRole("link", { name: /See the full portfolio/ });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("All work.");
});
