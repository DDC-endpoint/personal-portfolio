import { test, expect } from "@playwright/test";

// A finished portrait: after the wave ("static"), or straight away when the
// load was too slow for one ("skipped" — a cold dev build sometimes is).
const FINISHED = /^(static|skipped)$/;

const portrait = (page) => page.locator("[data-portrait]");

// Where the face is: (0.5, 0.38) of the stage, in page coordinates.
async function face(page) {
  const b = await portrait(page).boundingBox();
  return { x: b.x + b.width * 0.5, y: b.y + b.height * 0.38 };
}

// Counts warm (skin-tone) pixels in a 10×10 block of the canvas around a
// viewport point. The blue glyphs never have r > g; the photo does.
const warmAt = (page, { x, y }) =>
  page.locator("[data-portrait] canvas").evaluate(async (c, p) => {
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    const { width, data } = await c.portraitSnapshot();
    const x0 = Math.round((p.x - r.left) * k - 5), y0 = Math.round((p.y - r.top) * k - 5);
    let n = 0;
    for (let y = y0; y < y0 + 10; y++)
      for (let x = x0; x < x0 + 10; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0 && data[i] > data[i + 1] + 10) n++;
      }
    return n;
  }, { x, y });

test("ring grows into the lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  const ring = page.locator(".cursor-ring");
  await expect(ring).toHaveClass(/is-lens/);
  await expect.poll(() => ring.evaluate((el) => getComputedStyle(el).width), { timeout: 600 }).toBe("240px");
  await page.locator("#about").scrollIntoViewIfNeeded();
  await page.mouse.move(20, 450, { steps: 5 });
  await expect(ring).not.toHaveClass(/is-lens/);
});

test("the lens waits for the intro curtain, then opens under a resting pointer", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(60000); // replaying 6 s of frames on the fake clock is slow under full load
  // Hold the intro curtain down under a paused clock: the loader, the lift
  // and the ring all run on frames, so nothing moves until the clock does,
  // however fast or slow the page loads. (The engine ships with the bundle
  // since 2026-10-29, so its chunk can't be held on its own any more.)
  await page.clock.install();
  await page.goto("/");
  // The curtain lets the pointer through, so enter the portrait under it
  // once the cursor is live.
  const curtain = page.locator("[data-curtain]");
  await expect(page.locator("html")).toHaveClass(/js-cursor/, { timeout: 15000 });
  await page.clock.pauseAt(Date.now() + 1000);
  await expect(curtain).toHaveAttribute("data-curtain", /^(intro|covered)$/); // still down
  const p = await face(page);
  await page.mouse.move(20, 450);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  const ring = page.locator(".cursor-ring");
  await page.clock.runFor(300);
  await expect(curtain).toHaveAttribute("data-curtain", /^(intro|covered)$/); // still down
  await expect(ring).not.toHaveClass(/is-lens/);
  // Revealed: the lens opens without the pointer moving.
  await page.clock.runFor(6000);
  await page.clock.resume();
  await expect(ring).toHaveClass(/is-lens/, { timeout: 8000 });
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await expect.poll(() => warmAt(page, p), { timeout: 1500 }).toBeGreaterThan(0);
});

test("lens reveals colour", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  expect(await warmAt(page, p)).toBe(0);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBeGreaterThan(0);
});

// Touch (Damian, 2026-10-29): a finger on the portrait must still scroll the
// page, so the lens opens only after a 300 ms hold with the finger still.
const touch = (page, type, x, y) =>
  page.locator("[data-portrait] canvas").dispatchEvent(type, { pointerType: "touch", clientX: x, clientY: y, isPrimary: true, bubbles: true });

test("a held touch opens the lens and drags it; lifting fades it", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await portrait(page).scrollIntoViewIfNeeded();
  // The browser must be free to scroll a touch on the portrait.
  expect(await page.locator("[data-portrait] canvas").evaluate((c) => getComputedStyle(c).touchAction)).not.toBe("none");
  const p = await face(page);
  await touch(page, "pointerdown", p.x - 30, p.y);
  await page.waitForTimeout(150);
  expect(await warmAt(page, p)).toBe(0); // not yet: still under the hold
  await page.waitForTimeout(350);
  await touch(page, "pointermove", p.x - 10, p.y);
  await touch(page, "pointermove", p.x, p.y);
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBeGreaterThan(0);
  await touch(page, "pointerup", p.x, p.y);
  await page.waitForTimeout(1000);
  expect(await warmAt(page, p)).toBe(0);
});

test("a touch that moves at once, or that becomes a scroll, never opens the lens", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await portrait(page).scrollIntoViewIfNeeded();
  const p = await face(page);
  // Moved past the slop before the hold: a scroll, even if the finger then rests.
  await touch(page, "pointerdown", p.x, p.y - 20);
  await touch(page, "pointermove", p.x, p.y);
  await page.waitForTimeout(600);
  expect(await warmAt(page, p)).toBe(0);
  await touch(page, "pointerup", p.x, p.y);
  // The browser took the touch for a scroll (pointercancel) during the hold.
  await touch(page, "pointerdown", p.x, p.y);
  await page.waitForTimeout(100);
  await touch(page, "pointercancel", p.x, p.y);
  await page.waitForTimeout(600);
  expect(await warmAt(page, p)).toBe(0);
});

test("reduced motion has no lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(500);
  await expect(page.locator(".cursor-ring")).not.toHaveClass(/is-lens/);
  expect(await warmAt(page, p)).toBe(0);
});

test("the cursor dot disappears inside the lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  const dot = page.locator(".cursor-dot");
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await expect.poll(() => dot.evaluate((el) => getComputedStyle(el).opacity), { timeout: 1000 }).toBe("0");
  await page.mouse.move(20, 450, { steps: 5 });
  await expect.poll(() => dot.evaluate((el) => getComputedStyle(el).opacity), { timeout: 1000 }).toBe("1");
});

test("hovering the cell-count label doesn't grow the ring", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  await page.locator("[data-portrait-label]").hover();
  await page.waitForTimeout(300);
  await expect(page.locator(".cursor-ring")).not.toHaveClass(/is-lens/);
});

test("with the lens off the portrait stops measuring itself", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.addInitScript(() => {
    window.__measures = 0;
    const orig = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.tagName === "CANVAS") window.__measures++;
      return orig.call(this);
    };
  });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(400);
  await page.mouse.move(20, 450, { steps: 5 });
  // The lens eases out a little each frame; a loaded machine runs fewer
  // frames, so wait for the fade to finish rather than a fixed 2 s.
  await expect
    .poll(
      async () => {
        await page.evaluate(() => (window.__measures = 0));
        await page.waitForTimeout(500);
        return page.evaluate(() => window.__measures);
      },
      { timeout: 8000, intervals: [0] }
    )
    .toBe(0);
});

test("forced colours has no lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", FINISHED, { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBe(0);
});
