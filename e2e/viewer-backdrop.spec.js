import { test, expect } from "@playwright/test";

// The Lens viewer's backdrop follows the theme (frosted ivory in light mode,
// frosted navy in dark), and opening it never shifts the page (Damian, Phase 5
// gate). Real scrollbars are shown here: Playwright hides them by default,
// which would hide the snap.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop has a classic scrollbar"));

const frame = (page, n) => page.locator(`[data-frame="${n}"]`);
const dialog = (page) => page.getByRole("dialog", { name: "Photo viewer" });

// Where the page's content and the fixed header's right-hand controls sit.
const measure = () => ({
  tile: document.querySelector('[data-frame="04"]').getBoundingClientRect().left,
  header: document.querySelector("header > div").lastElementChild.getBoundingClientRect().right,
});

async function openViewer(page) {
  await page.goto("/");
  await expect(page.locator(".morph-loader")).toHaveCount(0, { timeout: 9000 });
  await expect(frame(page, "03")).toHaveAttribute("data-develop", /.+/);
  await frame(page, "03").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const before = await page.evaluate(measure);
  await frame(page, "03").click();
  await expect(dialog(page)).toBeVisible();
  await page.waitForTimeout(500); // the open flight
  return before;
}

// Canvas round-trips can be a unit off.
const near = (got, want) => got.every((v, i) => Math.abs(v - want[i]) <= (i === 3 ? 0 : 2));

const backdrop = (page) =>
  dialog(page).evaluate((d) => {
    const s = getComputedStyle(d.querySelector("[data-viewer-backdrop]"));
    // Tailwind mixes colours in oklab: read the colour back as rgba.
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = s.backgroundColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { colour: [r, g, b, Math.round((a / 255) * 10) / 10], filter: s.backdropFilter };
  });

test("light mode: a frosted ivory backdrop", async ({ page }) => {
  await openViewer(page);
  const b = await backdrop(page);
  expect(near(b.colour, [246, 246, 241, 0.8]), `got ${b.colour}`).toBe(true);
  expect(b.filter).toContain("blur");
  await expect(dialog(page).locator("[data-viewer-caption]")).toHaveCSS("color", "rgb(11, 31, 58)");
});

test("dark mode: a frosted navy backdrop", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openViewer(page);
  const b = await backdrop(page);
  expect(near(b.colour, [11, 31, 58, 0.8]), `got ${b.colour}`).toBe(true);
  expect(b.filter).toContain("blur");
});

test("opening it never shifts the page", async ({ page }) => {
  const before = await openViewer(page);
  const after = await page.evaluate(measure);
  expect(after.tile).toBe(before.tile);
  expect(after.header).toBe(before.header);
});
