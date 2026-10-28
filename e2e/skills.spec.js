import { test, expect } from "@playwright/test";

// The terminal marks itself once its observer is attached.
const hydrated = (page) => page.locator("[data-terminal][data-armed]").waitFor({ state: "attached" });

const ITEMS = ["JavaScript", "Python", "Java", "HTML / CSS", "React (learning)", "Git & GitHub", "Figma", "Photoshop", "Type & layout", "Colour systems", "Motion basics", "VS Code", "Vercel", "Notion", "Linear", "GitHub Pages", "AI / LLMs", "Generative art", "Web 3D", "Audio & music tech", "Hardware"];

// Each typed string clips to its typed width; "visible" compares the
// clipped box with the full text width.
const clipState = (page) =>
  page.evaluate(() => {
    const layout = [...document.querySelectorAll("[data-terminal] [data-layout]")].find((l) => l.offsetParent !== null);
    const items = [...layout.querySelectorAll('[data-k*=":item:"]')];
    return {
      layout: layout.dataset.layout,
      items: items.map((el) => ({ text: el.textContent, shown: el.clientWidth / el.scrollWidth })),
    };
  });
const allVisible = async (page) => (await clipState(page)).items.every((i) => i.shown >= 0.999);

const toTerminal = (page, ratio = 0.5) =>
  page.locator("[data-terminal]").evaluate((el, ratio) => {
    const r = el.getBoundingClientRect();
    // put `ratio` of the panel (or of the viewport, if taller) on screen
    const visible = Math.min(r.height, innerHeight) * ratio;
    window.scrollTo(0, window.scrollY + r.top - innerHeight + visible);
  }, ratio);

test.describe("no JS", () => {
  test.use({ javaScriptEnabled: false });
  test("server HTML has the whole stack", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("[data-terminal]").textContent();
    expect(text).toContain("damian@colombo ~ $");
    for (const d of ["code/", "design/", "tooling/", "curious-about/"]) expect(text).toContain(d);
    for (const it of ITEMS) expect(text).toContain(it);
    expect(await allVisible(page)).toBe(true);
  });
});

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile);

  test("types once in view and ends on a blinking prompt", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    const before = await clipState(page);
    expect(before.layout).toBe("columns");
    expect(before.items[0].shown).toBe(0);

    await toTerminal(page, 0.5);
    await expect.poll(() => allVisible(page), { timeout: 6000 }).toBe(true);
    await expect(page.locator("[data-terminal]")).toHaveAttribute("data-term", "done");
    const blink = await page
      .locator('[data-terminal] [data-layout="columns"] [data-cursor]')
      .evaluate((el) => el.getAnimations().some((a) => a.playState === "running"));
    expect(blink).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await toTerminal(page, 0.5);
    await page.waitForTimeout(100);
    expect(await allVisible(page)).toBe(true);
  });

  test("scrolled away mid-typing, it still finishes", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await toTerminal(page, 0.5);
    await page.waitForTimeout(300);
    expect(await allVisible(page)).toBe(false);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(5000);
    await toTerminal(page, 0.5);
    expect(await allVisible(page)).toBe(true);
  });

  test("resized across lg mid-typing, it shows finished", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await toTerminal(page, 0.5);
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 390, height: 844 });
    await toTerminal(page, 0.5);
    await expect.poll(() => allVisible(page), { timeout: 6000 }).toBe(true);
    expect((await clipState(page)).layout).toBe("folders");
  });

  test("a theme toggle mid-typing doesn't stop it", async ({ page }) => {
    await page.goto("/");
    await hydrated(page);
    await toTerminal(page, 0.5);
    await page.waitForTimeout(300);
    // Typed progress so far, in px; a toggle must neither reset nor freeze it.
    const typed = () => page.evaluate(() => [...document.querySelectorAll('[data-terminal] [data-layout="columns"] [data-k]')].reduce((s, el) => s + el.clientWidth, 0));
    const before = await typed();
    expect(before).toBeGreaterThan(0);
    await page.evaluate(() => document.documentElement.classList.toggle("dark"));
    await expect(page.locator("[data-terminal]")).not.toHaveAttribute("data-term", "idle");
    expect(await typed()).toBeGreaterThanOrEqual(before);
    await expect.poll(() => allVisible(page), { timeout: 6000 }).toBe(true);
  });
});

test("phones list one folder at a time", async ({ page, isMobile }) => {
  test.skip(!isMobile);
  await page.goto("/");
  const layout = page.locator('[data-terminal] [data-layout="folders"]');
  await expect(layout).toBeVisible();
  const cmds = await layout.locator('[data-k^="f:cmd:"]').allTextContents();
  expect(cmds).toEqual(["ls tools/code/", "ls tools/design/", "ls tools/tooling/", "ls tools/curious-about/"]);
  await toTerminal(page, 0.5);
  await expect.poll(() => allVisible(page), { timeout: 8000 }).toBe(true);
  // no sideways scroll inside the panel
  const overflow = await page.locator("[data-terminal]").evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("reduced motion is fully typed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await allVisible(page)).toBe(true);
  const blink = await page
    .locator("[data-terminal] [data-layout] [data-cursor]")
    .evaluateAll((els) => els.some((el) => el.getAnimations().length > 0));
  expect(blink).toBe(false);
});

// WCAG relative luminance contrast, from computed rgb() colours.
const contrast = (page, sel) =>
  page.evaluate((sel) => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const panel = document.querySelector("[data-terminal]");
    const bg = lum(getComputedStyle(panel).backgroundColor);
    const fg = lum(getComputedStyle(panel.querySelector(sel)).color);
    const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg];
    return (hi + 0.05) / (lo + 0.05);
  }, sel);

for (const theme of ["light", "dark"]) {
  test(`terminal text passes AA (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
    await page.goto("/");
    for (const sel of ['[data-k$=":p"], [data-k^="f:p:"]', '[data-k*=":dir:"], [data-k^="f:cmd:"]', '[data-k*=":item:"]']) {
      expect(await contrast(page, sel), sel).toBeGreaterThanOrEqual(4.5);
    }
  });
}

// Four columns need about 950 px; narrower screens list folder by folder.
test("the terminal never overlaps its columns or clips text", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.emulateMedia({ reducedMotion: "reduce" }); // finished at once
  for (const [width, layout] of [[800, "folders"], [1000, "folders"], [1024, "columns"], [1280, "columns"]]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const r = await page.evaluate(() => {
      const panel = document.querySelector("[data-terminal]").getBoundingClientRect();
      const layout = [...document.querySelectorAll("[data-terminal] [data-layout]")].find((l) => l.offsetParent !== null);
      const cols = [...layout.querySelectorAll("ul")].map((u) => u.getBoundingClientRect());
      const overlaps = [];
      layout.querySelectorAll("[data-k]").forEach((el) => {
        const b = el.getBoundingClientRect();
        if (b.right > panel.right + 0.5 || el.scrollWidth > el.clientWidth + 0.5) overlaps.push(el.textContent);
        // an item in a column must end before the next column starts
        if (!el.closest("ul")) return;
        cols.forEach((c) => {
          if (c.left > b.left + 1 && b.right > c.left + 0.5) overlaps.push(`${el.textContent} → column at ${c.left}`);
        });
      });
      return { layout: layout.dataset.layout, overlaps };
    });
    expect(r.layout, `${width}px`).toBe(layout);
    expect(r.overlaps, `${width}px`).toEqual([]);
  }
});

// Damian: the stack fills the section's full width, not just the nine
// columns right of the label.
test("the terminal spans the section's full width", async ({ page }) => {
  await page.goto("/");
  const term = await page.locator("[data-terminal]").boundingBox();
  const vw = page.viewportSize().width;
  const gutter = vw >= 768 ? 40 : 24;
  expect(Math.round(term.x)).toBe(gutter);
  expect(Math.round(term.width)).toBe(vw - 2 * gutter);
});
