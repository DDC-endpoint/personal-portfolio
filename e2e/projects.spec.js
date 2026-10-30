import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";
import {
  card,
  endCard,
  decodeState,
  hydrated,
  settled,
  scrollToCard,
  scrollToProgress,
  trackInfo,
  boxCentre,
  visibleCentre,
  filterOf,
  CARD_COUNT,
} from "./projectsHelpers";

// § 04 Selected Work: Damian's five, strongest first (Phase 6 Task 3).
const LABELS = [
  "01 — Aloys Travels — 2026",
  "02 — Danella De Cruz — 2026",
  "03 — Kahatagaha Graphite — 2026",
  "04 — Spades Solutions — 2026",
  "05 — Personal Dashboard — 2026",
];
const INTRO = "Five favourites from a growing shelf. The rest, and what’s on the way, is on the portfolio page.";
const TAN = Math.tan((12 * Math.PI) / 180);

const inViewport = (box, vw, vh) =>
  box.x >= -1 && box.y >= -1 && box.x + box.width <= vw + 1 && box.y + box.height <= vh + 1;

test("five cards then the end card, the intro and the All work link", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#work [data-card-label]")).toHaveText(LABELS);
  await expect(page.locator("#work [data-strip] > *").last()).toHaveAttribute("data-end-card", "");
  await expect(page.locator("#work [data-strip] > *")).toHaveCount(CARD_COUNT);
  await expect(page.locator("#work").getByText(INTRO)).toBeVisible();
  const all = page.locator('#work a[href="/portfolio"]');
  await expect(all).toHaveText(/^All work\s*→$/);
  await expect(all).toHaveClass(/link-line/);
});

test.describe("desktop", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop strip"));

  test("section pins and the strip glides along 12°", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0.1);
    const a = await boxCentre(card(page, 0));
    expect((await page.locator("[data-strip-viewport]").boundingBox()).y).toBeCloseTo(0, 0);
    await scrollToProgress(page, 0.3);
    const b = await boxCentre(card(page, 0));
    expect((await page.locator("[data-strip-viewport]").boundingBox()).y).toBeCloseTo(0, 0);
    const dx = b.x - a.x, dy = b.y - a.y;
    expect(dx).toBeLessThan(0);
    expect(dy).toBeGreaterThan(0);
    expect(Math.abs(Math.abs(dy / dx) - TAN)).toBeLessThan(0.02);
  });

  test("each card is centred at its step, the end card last", async ({ page }) => {
    await page.goto("/");
    const { vw, vh } = await trackInfo(page);
    for (let i = 0; i < CARD_COUNT; i++) {
      await scrollToCard(page, i);
      const item = i < CARD_COUNT - 1 ? card(page, i) : endCard(page);
      const c = await boxCentre(item.locator("[data-shot-area]"));
      expect(Math.abs(c.x - vw / 2)).toBeLessThan(2);
      expect(inViewport(await item.boundingBox(), vw, vh)).toBe(true);
    }
    // At the end, the previous card's centre is on the left edge.
    const prev = await boxCentre(card(page, CARD_COUNT - 2).locator("[data-shot-area]"));
    expect(Math.abs(prev.x)).toBeLessThan(2);
  });

  test("the centred card decodes under any pointer position", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await scrollToCard(page, 1);
    // Park the pointer over the next card, half in from the right edge.
    const { vw, vh } = await trackInfo(page);
    await page.mouse.move(vw - 60, vh / 2);
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
    await expect(card(page, 1)).toHaveAttribute("data-active", "true");
    await expect(card(page, 2)).toHaveAttribute("data-active", "false");
    await page.mouse.move(60, vh / 2);
    await page.waitForTimeout(800);
    await expect(card(page, 1)).toHaveAttribute("data-active", "true");
    expect(await decodeState(card(page, 0))).toBe("skeleton");
  });

  test("a card 0.3 of a step off centre is still sharp; neighbours blur", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 2, 0.3);
    expect(await filterOf(card(page, 2))).toBe("none");
    await expect(card(page, 2)).toHaveAttribute("data-active", "true");
    expect(await filterOf(card(page, 3))).toMatch(/blur\(/);
    expect(await filterOf(card(page, 1))).toMatch(/blur\(/);
    await scrollToCard(page, 2);
    const one = await card(page, 1).evaluate((el) => ({ f: getComputedStyle(el).filter, o: +getComputedStyle(el).opacity }));
    expect(one.f).toBe("blur(3.2px) saturate(0.65)");
    expect(one.o).toBeCloseTo(0.68, 2);
  });

  test("halfway between two cards, neither is active", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 1, 0.5);
    // Exactly half a step: the rounding picks one, but never both.
    const actives = await page.locator('#work [data-card][data-active="true"]').count();
    expect(actives).toBeLessThanOrEqual(1);
  });

  test("the strip eases after the scroll", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 0);
    const { top, height, vh } = await trackInfo(page);
    await page.evaluate((y) => window.scrollTo(0, y), top + 0.4 * (height - vh));
    await page.waitForTimeout(40);
    expect(await page.locator("[data-strip]").getAttribute("data-settled")).toBe("false");
    await settled(page);
  });

  test("Tab brings each card to the centre, then the end card", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await card(page, 0).focus();
    const { vw } = await trackInfo(page);
    const offCentre = async (item) => Math.abs((await boxCentre(item.locator("[data-shot-area]"))).x - vw / 2);
    for (let i = 1; i < CARD_COUNT - 1; i++) {
      await page.keyboard.press("Tab");
      await expect(card(page, i)).toBeFocused();
      await expect.poll(() => offCentre(card(page, i)), { timeout: 3000 }).toBeLessThan(2);
      await expect.poll(() => decodeState(card(page, i)), { timeout: 5000 }).toBe("shot");
    }
    await page.keyboard.press("Tab");
    const link = page.locator('[data-end-card] a[href="#contact"]');
    await expect(link).toBeFocused();
    await expect.poll(() => offCentre(endCard(page)), { timeout: 3000 }).toBeLessThan(2);
    expect(await page.locator("[data-strip-viewport]").evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test("live cards open in a new tab", async ({ page }) => {
    await page.goto("/");
    await expect(card(page, 0)).toHaveAttribute("target", "_blank");
    await expect(card(page, 0)).toHaveAttribute("rel", /noopener/);
  });

  test("clicking a card that isn't centred opens it without moving the strip", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 1);
    const before = await page.evaluate(() => window.scrollY);
    const { x, y } = await visibleCentre(card(page, 0).locator("[data-shot-area]"));
    const [popup] = await Promise.all([page.context().waitForEvent("page"), page.mouse.click(x, y)]);
    await popup.waitForURL(/^https:\/\/aloys-travels\.com/, { timeout: 20000 });
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("without JS the strip is a plain list", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
    expect(pos).not.toBe("sticky");
    await expect(page.locator("#work [data-card-label]")).toHaveText(LABELS);
    await context.close();
  });

  test("screen readers get the blurb as the card's description", async ({ page }) => {
    await page.goto("/");
    const id = await card(page, 0).getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    await expect(page.locator(`[id="${id}"]`)).toHaveText(
      "Website for a travel company: clean booking flows and a design that sells the journey."
    );
  });

  test("enter opens the site", async ({ page }) => {
    await page.goto("/");
    await card(page, 3).focus();
    const [popup] = await Promise.all([page.context().waitForEvent("page"), page.keyboard.press("Enter")]);
    await popup.waitForURL(/^https:\/\/enderguardian25\.github\.io\/spades-solutions/, { timeout: 20000 });
  });

  test("end card types and links", async ({ page }) => {
    await page.goto("/");
    await scrollToProgress(page, 1);
    const end = endCard(page);
    await expect(end.locator("[data-address]")).toHaveText("your-site.com", { timeout: 4000 });
    await expect(end.locator('a[href="#contact"]')).toHaveCount(1);
    // Nothing is active once the end card is centred.
    await expect(page.locator('#work [data-card][data-active="true"]')).toHaveCount(0);
  });

  test("end card button keeps its width and arrow while scrambling", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await scrollToProgress(page, 1);
    const link = page.locator('[data-end-card] a[href="#contact"]');
    await expect(link).toHaveAccessibleName("Start a project");
    const arrow = link.locator("[data-arrow]");
    await expect(arrow).toHaveText("→");
    const width = (await link.boundingBox()).width;
    await link.hover();
    let scrambled = false;
    for (let i = 0; i < 10; i++) {
      const box = await link.boundingBox();
      expect(box.width).toBeCloseTo(width, 0);
      await expect(arrow).toHaveText("→");
      if ((await link.locator('[aria-hidden="true"]').first().textContent()) !== "Start a project") scrambled = true;
      await page.waitForTimeout(40);
    }
    expect(scrambled).toBe(true);
  });

  test("no hit-testing for the strip", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await page.evaluate(() => {
      window.__hits = 0;
      const orig = document.elementFromPoint.bind(document);
      document.elementFromPoint = (x, y) => (window.__hits++, orig(x, y));
    });
    await scrollToProgress(page, 0.3);
    for (let i = 0; i < 6; i++) await page.mouse.move(300 + i * 100, 400);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__hits)).toBe(0);
  });

  test("resize mid-pin keeps the focused card centred", async ({ page }) => {
    await page.goto("/");
    await scrollToCard(page, 2);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);
    await scrollToCard(page, 3);
    const c = await boxCentre(card(page, 3).locator("[data-shot-area]"));
    expect(Math.abs(c.x - 640)).toBeLessThan(2);
    expect(inViewport(await card(page, 3).boundingBox(), 1280, 720)).toBe(true);
  });

  test("no console errors through the pin", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    for (let i = 0; i <= 10; i++) await scrollToProgress(page, i / 10);
    expect(errors).toEqual([]);
  });
});

test.describe("mobile", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "mobile", "mobile stack"));

  test("stacked, no pin, alternating offset", async ({ page }) => {
    await page.goto("/");
    const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
    expect(pos).not.toBe("sticky");
    const a = await card(page, 0).boundingBox();
    const b = await card(page, 1).boundingBox();
    expect(b.x).toBeGreaterThan(a.x);
  });

  test("card nearest centre decodes; the others dim and shrink, with no blur", async ({ page }) => {
    await page.goto("/");
    await card(page, 1).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("shot");
    const look = (i) =>
      card(page, i).evaluate((el) => {
        const s = getComputedStyle(el);
        return { o: +s.opacity, f: s.filter, t: s.transform };
      });
    await expect.poll(async () => (await look(2)).o, { timeout: 2000 }).toBeLessThan(0.9);
    const centred = await look(1), next = await look(2);
    expect(centred.o).toBeGreaterThan(0.95);
    expect(next.f).toBe("none");
    expect(next.t).not.toBe("none");
    await card(page, 2).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(() => decodeState(card(page, 2)), { timeout: 5000 }).toBe("shot");
    await expect.poll(() => decodeState(card(page, 1)), { timeout: 5000 }).toBe("skeleton");
  });

  test("the stack's cards are layers only while it scrolls", async ({ page }) => {
    await page.goto("/");
    const willChange = () =>
      page.locator("[data-strip]").evaluate((s) => [...s.children].map((el) => el.style.willChange));
    await card(page, 1).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect.poll(async () => (await willChange()).every((w) => w === ""), { timeout: 2000 }).toBe(true);
    // Every card that became a layer after the scroll, as the frame loop wrote it.
    const during = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const cards = [...document.querySelector("[data-strip]").children];
          const seen = new Set();
          const mo = new MutationObserver(() => {
            for (const el of cards) if (el.style.willChange === "transform, opacity") seen.add(el);
          });
          mo.observe(document.querySelector("[data-strip]"), { attributes: true, subtree: true, attributeFilter: ["style"] });
          scrollBy({ top: 300, behavior: "instant" });
          setTimeout(() => {
            mo.disconnect();
            resolve(cards.map((el) => seen.has(el)));
          }, 500);
        })
    );
    expect(during).toEqual(during.map(() => true));
    // At rest they repaint at their own scale, so their text is as sharp as without a layer.
    await expect.poll(willChange, { timeout: 3000 }).toEqual(during.map(() => ""));
  });

  test("centring the end card leaves no project card active", async ({ page }) => {
    await page.goto("/");
    await card(page, 4).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(card(page, 4)).toHaveAttribute("data-active", "true");
    await endCard(page).evaluate((el) => el.scrollIntoView({ block: "center" }));
    await expect(card(page, 4)).toHaveAttribute("data-active", "false");
  });
});

test("reduced motion keeps the skeleton when a screenshot fails", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/projects/aloys-travels.webp*", (r) => r.abort());
  await page.goto("/");
  await card(page, 0).scrollIntoViewIfNeeded();
  await expect(card(page, 0).locator("[data-skeleton]")).toBeVisible();
});

test("reduced motion is a plain decoded list, with no depth of field", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const pos = await page.locator("[data-strip-viewport]").evaluate((el) => getComputedStyle(el).position);
  expect(pos).not.toBe("sticky");
  for (let i = 0; i < CARD_COUNT - 1; i++) {
    await expect(card(page, i).locator("img")).toHaveCSS("opacity", "1");
    await expect(card(page, i)).toHaveAttribute("data-decode", "static");
    expect(await filterOf(card(page, i))).toBe("none");
    await expect(card(page, i)).toHaveCSS("opacity", "1");
  }
  await card(page, 2).scrollIntoViewIfNeeded();
  const { x, y } = await visibleCentre(card(page, 2));
  await page.mouse.move(x, y);
  await page.waitForTimeout(800);
  await expect(card(page, 2)).toHaveAttribute("data-decode", "static");
});
