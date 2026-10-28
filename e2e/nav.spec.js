import { test, expect } from "@playwright/test";

// Phase 6 Task 2: one nav on every page (docs/v3/plan-phase-6.md).
const PAGES = [
  ["/", "Home"],
  ["/services", "Services"],
  ["/privacy", "Privacy"],
];
const LINKS = ["Home", "Portfolio", "Services", "Privacy"];
const HREFS = ["/", "/portfolio", "/services", "/privacy"];

const hrefs = (loc) => loc.evaluateAll((els) => els.map((a) => a.getAttribute("href")));

for (const [path, current] of PAGES) {
  test(`${path}: the four pages, ${current} marked`, async ({ page, isMobile }) => {
    await page.goto(path);
    const header = page.locator("header").first();
    const logo = header.locator("a").first();
    await expect(logo).toHaveText("DDC / Damian De Cruz");
    await expect(logo).toHaveAttribute("href", path === "/" ? "#top" : "/");

    if (isMobile) {
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("dialog", { name: "Site menu" });
      const links = menu.locator("nav a");
      await expect(links).toHaveText(LINKS);
      expect(await hrefs(links)).toEqual(HREFS);
      await expect(menu.locator('[aria-current="page"]')).toHaveText(current);
      // No Services (or Portfolio) button under the links any more.
      await expect(menu.locator("a")).toHaveCount(4);
    } else {
      const links = header.locator("nav a");
      await expect(links).toHaveText(LINKS);
      expect(await hrefs(links)).toEqual(HREFS);
      const marked = header.locator('nav a[aria-current="page"]');
      await expect(marked).toHaveText(current);
      // Marked: electric text and the underline drawn.
      const look = await marked.evaluate((a) => ({
        color: getComputedStyle(a).color,
        line: getComputedStyle(a).backgroundSize,
      }));
      expect(look.color).toBe("rgb(37, 99, 235)");
      expect(look.line).toBe("100% 1px");
      // In-page anchors are gone.
      await expect(header.locator('a[href*="#about"], a[href*="#faq"]')).toHaveCount(0);
    }
  });

  test(`${path}: the footer lists the four pages`, async ({ page }) => {
    await page.goto(path);
    const links = page.locator("footer nav a");
    await expect(links).toHaveText(LINKS);
    expect(await hrefs(links)).toEqual(HREFS);
  });
}

test("the logo goes Home", async ({ page }) => {
  await page.goto("/privacy");
  await page.locator("header a").first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("the hero has no SERVICES button", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('#top a[href="/services"]')).toHaveCount(0);
});

test("/services has no Portfolio button and links to /portfolio", async ({ page }) => {
  await page.goto("/services");
  await expect(page.locator('#top a[href="/"]')).toHaveCount(0);
  const full = page.getByRole("link", { name: /See the full portfolio/ });
  await expect(full).toHaveAttribute("href", "/portfolio");
});
