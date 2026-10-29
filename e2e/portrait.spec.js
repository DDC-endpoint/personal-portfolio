import { test, expect } from "@playwright/test";

// A finished portrait: after the wave ("static"), or straight away when the
// load was too slow for one ("skipped" — a cold dev build sometimes is).
const FINISHED = /^(static|skipped)$/;
import { trackErrors } from "./helpers";

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "portrait rendering checks run on desktop");
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
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await expect(page.locator("[data-portrait-label]")).toHaveText(/^PORTRAIT · \d+ × \d+ CELLS$/i);
  expect((await paint(page)).n).toBeGreaterThan(1000);
});

// Android has no Arial, so next/font's fallback face for the mono
// (src: local(Arial)) can't load there, and document.fonts.load() rejects
// for the whole family list. The portrait stayed blank, with no label, on
// every Android phone (2026-10-29). A face that can't load must not stop it.
test("a fallback font face that can't load still draws the portrait", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = '@font-face{font-family:"JetBrains Mono Fallback";font-weight:700;src:local("No Such Font Anywhere")}';
      document.head.appendChild(style);
    });
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
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

// Delays createImageBitmap's resized (field) bitmap, holding the first layout open.
// Sets window.__inLayout while the delay is running.
const slowFieldBitmap = () => {
  const orig = window.createImageBitmap;
  window.createImageBitmap = (src, opts) => {
    if (!opts?.resizeWidth) return orig(src, opts);
    window.__inLayout = true;
    return new Promise((r) => setTimeout(r, 800)).then(() => {
      window.__inLayout = false;
      return orig(src, opts);
    });
  };
};

// A 32×40 block-average of the canvas (premultiplied RGB), for comparing
// two renders of the same layout.
const signature = (page) =>
  page.locator("[data-portrait] canvas").evaluate((c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const BX = 32, BY = 40, out = new Array(BX * BY * 3).fill(0), cnt = new Array(BX * BY).fill(0);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4, a = d[i + 3] / 255, b = ((y * BY / c.height) | 0) * BX + ((x * BX / c.width) | 0);
      out[b * 3] += d[i] * a; out[b * 3 + 1] += d[i + 1] * a; out[b * 3 + 2] += d[i + 2] * a; cnt[b]++;
    }
    return out.map((v, k) => v / cnt[(k / 3) | 0]);
  });
const distance = (p, q) => p.reduce((s, v, i) => s + Math.abs(v - q[i]), 0) / p.length;

async function reference(browser, theme) {
  const ref = await browser.newPage({ viewport: { width: 1440, height: 900 }, forcedColors: "active" });
  await ref.addInitScript((t) => localStorage.setItem("theme", t), theme);
  await ref.goto("/");
  await expect(portrait(ref)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await ref.waitForTimeout(300);
  const sig = await signature(ref);
  await ref.close();
  return sig;
}

test("a theme switch during the first layout still recolours", async ({ page, browser }) => {
  // Forced colours keeps the custom cursor off: its later js-cursor class
  // change on <html> would otherwise wake the theme observer and mask a miss.
  // (Not reduced motion: that currently hits a SplitLines hydration error
  // which resets <html> classes, theme included.)
  await page.emulateMedia({ forcedColors: "active" });
  await page.addInitScript(slowFieldBitmap);
  await page.goto("/");
  await page.waitForFunction(() => window.__inLayout === true); // inside the delayed first layout
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await page.waitForTimeout(300);
  const toggled = await signature(page);
  const dark = await reference(browser, "dark");
  const light = await reference(browser, "light");
  expect(distance(toggled, dark)).toBeLessThan(distance(toggled, light) / 2);
});

test("a browser that ignores resize options still draws the portrait", async ({ page, browser }) => {
  await page.addInitScript(() => {
    const orig = window.createImageBitmap;
    window.createImageBitmap = (src) => orig(src); // drops resizeWidth/Height
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await page.waitForTimeout(300);
  const ignored = await paint(page);

  const ref = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await ref.goto("/");
  await expect(portrait(ref)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await ref.waitForTimeout(300);
  const normal = await paint(ref);
  await ref.close();
  expect(Math.abs(ignored.n - normal.n) / normal.n).toBeLessThan(0.15);
});

test("the lens photo is released when a mount is abandoned", async ({ page }) => {
  // Dev StrictMode mounts, unmounts and remounts: the abandoned mount's
  // full-size photo bitmap must be closed, leaving exactly one live.
  await page.addInitScript(() => {
    window.__photos = [];
    const orig = window.createImageBitmap;
    window.createImageBitmap = async (src, opts) => {
      const b = await orig(src, opts);
      if (!opts) window.__photos.push(b);
      return b;
    };
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await page.waitForTimeout(300);
  const live = await page.evaluate(() => window.__photos.filter((b) => b.width > 0).length);
  expect(live).toBe(1);
});
