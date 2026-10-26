import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "portrait rendering checks run on desktop");
  // Rendering checks, not loader checks: run as a repeat visit (no wave).
  await page.addInitScript(() => sessionStorage.setItem("ddc:loader-played", "1"));
});

const portrait = (page) => page.locator("[data-portrait]");

// Counts painted pixels and averages their colour over the whole canvas.
const paint = (page) =>
  page.locator("[data-portrait] canvas").evaluate((c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0, r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) { n++; r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    }
    return { n, rgb: n ? [r / n, g / n, b / n].map(Math.round) : null };
  });

test("portrait draws and labels itself", async ({ page }) => {
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  await expect(page.locator("[data-portrait-label]")).toHaveText(/^PORTRAIT · \d+ × \d+ CELLS$/i);
  expect((await paint(page)).n).toBeGreaterThan(1000);
});

test("image failure leaves hero intact", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/hero/portrait.webp", (r) => r.abort());
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "error", { timeout: 10000 });
  await expect(page.locator("[data-portrait-label]")).toHaveText("");
  await expect(page.locator("h1")).toContainText("Damian");
  expect(errors).toEqual([]);
});

test("theme toggle recolours", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  const before = await paint(page);
  await page.getByRole("button", { name: /Switch to (dark|light) mode/ }).click();
  await page.waitForTimeout(300);
  const after = await paint(page);
  expect(after.n).toBeGreaterThan(1000);
  expect(after.rgb).not.toEqual(before.rgb);
  expect(errors).toEqual([]);
});

test("resize relays out", async ({ page }) => {
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  const label = page.locator("[data-portrait-label]");
  const first = await label.textContent();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(label).not.toHaveText(first);
  await expect(label).toHaveText(/^PORTRAIT · \d+ × \d+ CELLS$/i);
});

test("portrait builds once per load", async ({ page }) => {
  // Perf guard: a full load creates exactly 4 canvases (field sample, fade
  // mask, rest, lens) and samples pixels once. A resize-observer first fire
  // or the cursor's html class must not trigger a rebuild.
  await page.addInitScript(() => {
    window.__canvases = 0;
    window.__samples = 0;
    const create = Document.prototype.createElement;
    Document.prototype.createElement = function (tag, ...rest) {
      if (String(tag).toLowerCase() === "canvas") window.__canvases++;
      return create.call(this, tag, ...rest);
    };
    const get = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...a) {
      window.__samples++;
      return get.apply(this, a);
    };
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  await page.mouse.move(700, 450);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => [window.__canvases, window.__samples])).toEqual([4, 1]);
});

test("a zero-size stage never kills the loop", async ({ page }) => {
  // At md+ with a viewport under 190px tall the stage width computes to 0.
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1024, height: 170 });
  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("[data-portrait-label]")).toHaveText(/^PORTRAIT · \d+ × \d+ CELLS$/i, { timeout: 5000 });
  // the idle loop is alive: the flicker changes pixels frame to frame
  const frame = () => page.locator("[data-portrait] canvas").evaluate((c) => c.toDataURL());
  const a = await frame();
  await page.waitForTimeout(400);
  expect(await frame()).not.toEqual(a);
  expect(errors).toEqual([]);
});
