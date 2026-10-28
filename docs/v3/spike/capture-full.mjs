// Spike-only: full-page captures for the /portfolio scroll-through preview
// (portfolio-page.html), written to docs/v3/spike/proj/full/ (gitignored).
// Scrolls each page first so scroll-reveal sections render, then takes a
// full-page shot at 1440 wide, scales it to 720 wide and caps it at 4200 px
// tall. sharp strips all metadata. The Phase 6 build replaces this with a
// `--full` mode in scripts/capture-projects.mjs (plan-phase-6.md, Task 4).
//
// Run from the repo root: node docs/v3/spike/capture-full.mjs
// "portfolio" needs `npm run dev` running; it's skipped if it isn't.
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "docs/v3/spike/proj/full";
const SITES = {
  "aloys-travels": "https://aloys-travels.com/",
  "danella-de-cruz": "https://danelladc.com",
  "spades-solutions": "https://enderguardian25.github.io/spades-solutions/index.html",
  "kahatagaha-graphite": "https://enderguardian25.github.io/kgll-website/",
  "personal-dashboard": "https://enderguardian25.github.io/personal-dashboard/",
  portfolio: "http://localhost:3000/",
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [slug, url] of Object.entries(SITES)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    if (slug === "aloys-travels") await page.locator('button:has-text("Reject")').first().click({ timeout: 5000 }).catch(() => {});
    if (slug === "portfolio") await page.addStyleTag({ content: ".cursor-ring, .cursor-dot, nextjs-portal, .intro-stamp { display: none !important; }" });
    await page.waitForTimeout(2500);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Math.min(h, 9000); y += 600) {
      await page.evaluate((y) => scrollTo(0, y), y);
      await page.waitForTimeout(220);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(1200);
    const png = await page.screenshot({ fullPage: true });
    const scaled = await sharp(png).resize({ width: 720 }).toBuffer({ resolveWithObject: true });
    const info = await sharp(scaled.data)
      .extract({ left: 0, top: 0, width: 720, height: Math.min(scaled.info.height, 4200) })
      .webp({ quality: 70 })
      .toFile(`${OUT}/${slug}.webp`);
    console.log(slug, info.width, info.height, `${Math.round(info.size / 1024)} KB`);
  } catch (e) {
    console.log(slug, "FAILED", e.message.split("\n")[0]);
  }
  await page.close();
}
await browser.close();
