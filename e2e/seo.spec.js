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
        const shown = p.priceCurrency === "LKR" ? `LKR ${p.minPrice.toLocaleString("en-US")}` : `$${p.minPrice.toLocaleString("en-US")}`;
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
    expect(d.startsWith("Websites in Sri Lanka from LKR 30,000 (intl from $300)")).toBe(true);
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
    // the scrambled curtain, the skeletons' decorative text, the year counter
    await expect(page.locator(".morph-loader")).toHaveAttribute("data-nosnippet", "");
    await expect(page.locator('[data-card="0"] [data-nosnippet]')).toHaveCount(1);
    for (const c of await page.locator("[data-counter]").all()) await expect(c).toHaveAttribute("data-nosnippet", "");
    // /portfolio's upcoming cards: "loading…"
    await page.goto("/portfolio");
    const loading = page.locator("[data-build] [data-nosnippet]", { hasText: "loading…" });
    await expect(loading).toHaveCount(2);
  });

  test("the name in the H1 is spelt as the entity", async ({ page }) => {
    await page.goto("/");
    expect((await page.locator("h1").textContent()).replace(/\s+/g, " ")).toContain("De Cruz");
  });
});

test.describe("footer and privacy", () => {
  for (const path of ["/", "/services", "/privacy"]) {
    test(`${path}: footer B with the trading name, no page links`, async ({ page, isMobile }) => {
      await page.goto(path);
      const footer = page.locator("footer");
      await expect(footer).toContainText("© 2026 Damian De Cruz");
      await expect(footer).toContainText("Trading as DDC Web Services");
      await expect(footer).toContainText("Made by hand, in Colombo.");
      await expect(footer).toContainText("v:04 / Always evolving");
      // The nav carries the pages (Damian, Phase 6 gate).
      await expect(footer.locator("a")).toHaveCount(0);
      // centred on phones; the three columns read left, centre, right on desktop
      const aligns = await footer.locator("[data-footer-col]").evaluateAll((els) => els.map((el) => getComputedStyle(el).textAlign));
      expect(aligns).toEqual(isMobile ? ["center", "center", "center"] : ["left", "center", "right"]);
    });
  }

  test("the privacy page", async ({ page, request }) => {
    const res = await page.goto("/privacy");
    expect(res.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText("Privacy");
    await expect(page).toHaveTitle("Privacy | Damian De Cruz");
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toBe("https://damiandc.com/privacy");
    const text = await page.locator("main").textContent();
    for (const s of ["Google Analytics", "hello@damiandc.com", "WhatsApp", "DDC Web Services"]) expect(text).toContain(s);
    expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>https://damiandc.com/privacy</loc>");
  });
});

// Static files in public/ only: a dynamic /opengraph-image route gave 502s
// behind nginx + PM2 (HANDOFF.md → "DO NOT RE-BREAK" 2).
test.describe("share images", () => {
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");
  const HOME = ["/og.jpg", "Damian De Cruz, creative technologist and freelance web designer in Colombo, Sri Lanka"];
  const SERVICES = ["/og-services.jpg", "DDC Web Services by Damian De Cruz: clean, fast websites built in days, from LKR 30,000"];
  for (const [path, [file, alt]] of [["/", HOME], ["/services", SERVICES], ["/privacy", HOME]]) {
    test(`${path} shares ${file}`, async ({ page, request }) => {
      await page.goto(path);
      const og = page.locator('meta[property="og:image"]');
      await expect(og).toHaveCount(1);
      expect(new URL(await og.getAttribute("content")).pathname).toBe(file);
      expect(await page.locator('meta[property="og:image:width"]').getAttribute("content")).toBe("1200");
      expect(await page.locator('meta[property="og:image:height"]').getAttribute("content")).toBe("630");
      expect(await page.locator('meta[property="og:image:alt"]').getAttribute("content")).toBe(alt);
      expect(new URL(await page.locator('meta[name="twitter:image"]').getAttribute("content")).pathname).toBe(file);
      // the page's own title, not Home's
      expect(await page.locator('meta[name="twitter:title"]').getAttribute("content")).toBe(await page.title());
      const res = await request.get(file);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/jpeg");
    });
  }
});

test("the lab's title says Lab once", async ({ page, isMobile }) => {
  test.skip(isMobile);
  await page.goto("http://lab.localhost:3000/");
  await expect(page).toHaveTitle("Lab — Damian De Cruz");
});

// The lab host gets its own robots.txt (allow all, no Disallow, which would
// advertise it; the lab is noindex by meta) and no sitemap. The main host
// keeps the main site's (seo-geo.md → server items, done in proxy.js).
test.describe("robots and sitemap per host", () => {
  test.skip(({ isMobile }) => isMobile, "same responses on both projects");

  // Through the browser: Node can't resolve lab.localhost, Chromium can.
  test("lab host: its own robots.txt, no sitemap", async ({ page }) => {
    const robots = await page.goto("http://lab.localhost:3000/robots.txt");
    expect(robots.status()).toBe(200);
    expect(robots.headers()["content-type"]).toContain("text/plain");
    const body = await robots.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).not.toMatch(/sitemap|disallow/i);
    expect((await page.goto("http://lab.localhost:3000/sitemap.xml")).status()).toBe(404);
  });

  test("main host: the main site's robots.txt and sitemap", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Sitemap: https://damiandc.com/sitemap.xml");
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("https://damiandc.com/services");
  });
});

// Without JS nothing may start hidden (plan → Global Constraints): no-JS
// visitors, and crawlers that don't run scripts, see the whole page.
test.describe("no JS: every text is visible", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(({ isMobile }) => isMobile, "markup is the same on both projects");
  for (const path of ["/", "/services", "/privacy"]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const hidden = await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!n.textContent.trim() || el.closest('[aria-hidden="true"], .sr-only, script, template')) continue;
          let o = 1;
          for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity);
          if (o < 0.99) out.push(`${n.textContent.trim().slice(0, 40)} (${o.toFixed(2)})`);
        }
        return out;
      });
      expect(hidden).toEqual([]);
    });
  }
});

test("no JS: the Home name isn't left below its line mask", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/");
  const clipped = await page.locator("h1 > div > span").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().top >= el.parentElement.getBoundingClientRect().bottom - 1).map((el) => el.textContent)
  );
  expect(clipped).toEqual([]);
  await ctx.close();
});
