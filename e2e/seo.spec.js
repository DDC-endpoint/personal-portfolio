import { test, expect } from "@playwright/test";

// SEO and GEO (docs/v3/seo-geo.md): structured data, metadata, snippet
// hygiene. Server HTML only where it matters, so these run with JS off.

const ldNodes = (page) =>
  page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((els) => els.flatMap((el) => {
      const d = JSON.parse(el.textContent);
      return d["@graph"] ?? [d];
    }));

function refs(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => refs(x, out));
  else if (v && typeof v === "object") {
    if (Object.keys(v).length === 1 && v["@id"]) out.push(v["@id"]);
    else Object.values(v).forEach((x) => refs(x, out));
  }
  return out;
}

test.describe("server HTML", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");

  for (const path of ["/", "/services"]) {
    test(`${path}: every @id reference resolves on the page`, async ({ page }) => {
      await page.goto(path);
      const nodes = await ldNodes(page);
      const ids = new Set(nodes.map((n) => n["@id"]).filter(Boolean));
      for (const r of refs(nodes)) expect(ids.has(r), r).toBe(true);
      expect(nodes.filter((n) => n["@type"] === "Person")).toHaveLength(1);
    });
  }

  test("/services: every offer's price is on the page", async ({ page }) => {
    await page.goto("/services");
    const text = (await page.locator("main").textContent()).replace(/\s+/g, " ");
    const service = (await ldNodes(page)).find((n) => n["@type"] === "Service");
    for (const o of service.hasOfferCatalog.itemListElement) {
      expect(text).toContain(o.itemOffered.name);
      for (const p of o.priceSpecification) {
        const shown = p.priceCurrency === "LKR" ? `LKR ${p.minPrice.toLocaleString("en-US")}` : `$${p.minPrice}`;
        expect(text, shown).toContain(shown);
      }
    }
  });
});
