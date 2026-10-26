import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Lens checks, not loader checks: run as a repeat visit (no wave).
  await page.addInitScript(() => sessionStorage.setItem("ddc:loader-played", "1"));
});

const portrait = (page) => page.locator("[data-portrait]");

// Where the face is: (0.5, 0.38) of the stage, in page coordinates.
async function face(page) {
  const b = await portrait(page).boundingBox();
  return { x: b.x + b.width * 0.5, y: b.y + b.height * 0.38 };
}

// Counts warm (skin-tone) pixels in a 10×10 block of the canvas around a
// viewport point. The blue glyphs never have r > g; the photo does.
const warmAt = (page, { x, y }) =>
  page.locator("[data-portrait] canvas").evaluate((c, p) => {
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    const d = c.getContext("2d").getImageData((p.x - r.left) * k - 5, (p.y - r.top) * k - 5, 10, 10).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i] > d[i + 1] + 10) n++;
    return n;
  }, { x, y });

test("ring grows into the lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
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

test("lens reveals colour", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  const p = await face(page);
  expect(await warmAt(page, p)).toBe(0);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBeGreaterThan(0);
});

test("touch drag moves the lens", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  await portrait(page).scrollIntoViewIfNeeded();
  const p = await face(page);
  const fire = (type, x, y) =>
    page.locator("[data-portrait] canvas").dispatchEvent(type, { pointerType: "touch", clientX: x, clientY: y, isPrimary: true, bubbles: true });
  await fire("pointerdown", p.x - 30, p.y);
  await fire("pointermove", p.x - 10, p.y);
  await fire("pointermove", p.x, p.y);
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBeGreaterThan(0);
  await fire("pointerup", p.x, p.y);
  await page.waitForTimeout(1000);
  expect(await warmAt(page, p)).toBe(0);
});

test("reduced motion has no lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
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
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(400);
  await page.mouse.move(20, 450, { steps: 5 });
  await page.waitForTimeout(2000); // lens fades out
  await page.evaluate(() => (window.__measures = 0));
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__measures)).toBe(0);
});

test("forced colours has no lens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");
  await expect(portrait(page)).toHaveAttribute("data-state", "static", { timeout: 10000 });
  const p = await face(page);
  await page.mouse.move(p.x - 40, p.y);
  await page.mouse.move(p.x, p.y, { steps: 5 });
  await page.waitForTimeout(500);
  expect(await warmAt(page, p)).toBe(0);
});
