import { test, expect } from "@playwright/test";

const frame = (page, n) => page.locator(`[data-frame="${n}"]`);
const dialog = (page) => page.getByRole("dialog", { name: "Photo viewer" });
const caption = (page) => dialog(page).locator("[data-viewer-caption]");
const desktopOnly = (info) => test.skip(info.project.name !== "desktop", "desktop");
const mobileOnly = (info) => test.skip(info.project.name !== "mobile", "touch");

// The tiles' click handlers are live once the develop hook has marked them.
async function toLens(page, n) {
  await page.goto("/");
  await expect(frame(page, n)).toHaveAttribute("data-develop", /.+/);
  await frame(page, n).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}

test("click opens the viewer on that photo", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "03");
  await frame(page, "03").click();
  await expect(dialog(page)).toBeVisible();
  await expect(caption(page)).toContainText("Architecture at nightfall");
  await expect(caption(page)).toContainText("FRAME 03");
});

test("arrows step and wrap", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "10");
  await frame(page, "10").click();
  await expect(caption(page)).toContainText("FRAME 10");
  await page.keyboard.press("ArrowRight");
  await expect(caption(page)).toContainText("FRAME 01");
  await expect(caption(page)).toContainText("Sigiriya, from Pidurangala");
  await page.keyboard.press("ArrowLeft");
  await expect(caption(page)).toContainText("FRAME 10");
});

test("esc closes and returns focus", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "06");
  await frame(page, "06").focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Close viewer" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(frame(page, "06")).toBeFocused();
});

test("tab stays inside the dialog", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "02");
  await frame(page, "02").click();
  await expect(dialog(page)).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"))).toBe(true);
  }
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => !!document.activeElement.closest("[role=dialog]"))).toBe(true);
  }
});

test("page does not scroll while open", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "02");
  await frame(page, "02").click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(500);
  const y = await page.evaluate(() => window.scrollY);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
});

test("backdrop click closes", async ({ page }, info) => {
  desktopOnly(info);
  await toLens(page, "02");
  await frame(page, "02").click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(500);
  await page.mouse.click(40, 120); // clear of the arrows and Close
  await expect(dialog(page)).toHaveCount(0);
});

test("swipe steps", async ({ page }, info) => {
  mobileOnly(info);
  await toLens(page, "02");
  await frame(page, "02").tap();
  await page.waitForTimeout(400);
  await expect(dialog(page)).toBeVisible();
  await expect(caption(page)).toContainText("FRAME 02");
  await page.waitForTimeout(500);
  const photo = await dialog(page).locator("[data-viewer-photo]").boundingBox();
  const y = photo.y + photo.height / 2;
  await page.mouse.move(300, y);
  await page.mouse.down();
  await page.mouse.move(200, y, { steps: 4 });
  await page.mouse.move(100, y, { steps: 4 });
  await page.mouse.up();
  await expect(caption(page)).toContainText("FRAME 03");
  await expect(dialog(page)).toBeVisible(); // a swipe is not a click
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("opens without the expand", async ({ page }, info) => {
    desktopOnly(info);
    await toLens(page, "05");
    await frame(page, "05").click();
    await expect(dialog(page)).toBeVisible();
    const anims = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target?.closest?.("[role=dialog]")).length);
    expect(anims).toBe(0);
  });
});

test("a real touch swipe steps, and the next tap still closes", async ({ page }, info) => {
  mobileOnly(info);
  await toLens(page, "02");
  await frame(page, "02").tap();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(500);
  const photo = await dialog(page).locator("[data-viewer-photo]").boundingBox();
  const y = Math.round(photo.y + photo.height / 2);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", 300);
  for (const x of [260, 220, 180, 140, 100]) await touch("touchMove", x);
  await touch("touchEnd");
  await expect(caption(page)).toContainText("FRAME 03");
  await page.waitForTimeout(300);
  await page.touchscreen.tap(195, y);
  await expect(dialog(page)).toHaveCount(0);
});
