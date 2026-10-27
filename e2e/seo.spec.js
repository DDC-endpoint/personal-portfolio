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

test.describe("metadata", () => {
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");

  const meta = (page, sel, attr = "content") => page.locator(sel).first().getAttribute(attr);

  test("Home: title, description, canonical and og:url", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Damian De Cruz — Freelance Web Designer & Developer");
    expect(await meta(page, 'meta[name="description"]')).toBe(
      "Freelance web designer and developer in Colombo, Sri Lanka. Custom, fast websites for businesses and creatives, often live in 2–3 days. See work and prices."
    );
    expect(await meta(page, 'link[rel="canonical"]', "href")).toBe("https://damiandc.com");
    expect(await meta(page, 'meta[property="og:url"]')).toBe("https://damiandc.com");
    expect(await meta(page, 'meta[property="og:title"]')).toBe("Damian De Cruz — Freelance Web Designer & Developer");
  });

  test("/services: the business title, a price-first description, canonical", async ({ page }) => {
    await page.goto("/services");
    await expect(page).toHaveTitle("Web Design Services in Colombo | DDC Web Services");
    const d = await meta(page, 'meta[name="description"]');
    expect(d.startsWith("Websites in Sri Lanka from LKR 18,000")).toBe(true);
    expect(await meta(page, 'link[rel="canonical"]', "href")).toBe("https://damiandc.com/services");
    expect(await meta(page, 'meta[property="og:url"]')).toBe("https://damiandc.com/services");
    expect(await meta(page, 'meta[property="og:site_name"]')).toBe("DDC Web Services");
  });

  test("a 404 has no canonical", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res.status()).toBe(404);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test("the sitemap lists real content dates", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).not.toContain("changefreq");
    expect(xml).not.toContain("priority");
    const dates = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(dates.length).toBeGreaterThanOrEqual(2);
    // content dates, not the build's timestamp
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("no X-Powered-By header", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});

test.describe("snippet hygiene and alt text", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");

  test("Home: every image has alt text", async ({ page }) => {
    await page.goto("/");
    const imgs = page.locator("main img");
    expect(await imgs.count()).toBeGreaterThan(10);
    const empty = await imgs.evaluateAll((els) => els.filter((el) => !el.getAttribute("alt")?.trim()).map((el) => el.getAttribute("src")));
    expect(empty).toEqual([]);
  });

  test("decorative text can't become a snippet", async ({ page }) => {
    await page.goto("/");
    // the scrambled curtain, the ASCII mini portrait, the year counter, "loading…"
    await expect(page.locator(".intro-stamp")).toHaveAttribute("data-nosnippet", "");
    await expect(page.locator('[data-card="0"] [data-nosnippet] svg')).toHaveCount(1);
    for (const c of await page.locator("[data-counter]").all()) await expect(c).toHaveAttribute("data-nosnippet", "");
    const loading = page.locator("[data-card]", { hasText: "loading…" }).locator("[data-nosnippet]", { hasText: "loading…" });
    expect(await loading.count()).toBeGreaterThan(0);
  });

  test("the name in the H1 is spelt as the entity", async ({ page }) => {
    await page.goto("/");
    expect((await page.locator("h1").textContent()).replace(/\s+/g, " ")).toContain("De Cruz");
  });
});
