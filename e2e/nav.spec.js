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
      const look = await marked.evaluate((a) => {
        // The underline's ends against the word's letter cells (a Range over
        // the text; its right edge includes the trailing letter-spacing).
        const r = document.createRange();
        r.selectNodeContents(a);
        const text = r.getBoundingClientRect();
        const box = a.getBoundingClientRect();
        const line = getComputedStyle(a, "::after");
        const tracking = parseFloat(getComputedStyle(a).letterSpacing);
        return {
          color: getComputedStyle(a).color,
          transform: line.transform,
          inset: [box.left + parseFloat(line.left) - text.left, text.right - tracking - (box.right - parseFloat(line.right))],
        };
      });
      expect(look.color).toBe("rgb(37, 99, 235)");
      // Drawn, and inset at both ends by the side bearing (under 0.1em,
      // 1.1px) so it starts and ends on the ink, not past it.
      expect(look.transform).toBe("matrix(1, 0, 0, 1, 0, 0)");
      for (const d of look.inset) {
        expect(d).toBeGreaterThan(0.3);
        expect(d).toBeLessThan(1.1);
      }
      // In-page anchors are gone.
      await expect(header.locator('a[href*="#about"], a[href*="#faq"]')).toHaveCount(0);
    }
  });

  test(`${path}: the footer has no page links (the nav carries them)`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("footer")).toContainText("Made by hand, in Colombo.");
    await expect(page.locator("footer a")).toHaveCount(0);
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
