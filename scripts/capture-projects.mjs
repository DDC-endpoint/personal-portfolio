// Project screenshots for the project cards: each live site at 1440×900,
// top of the page, saved as public/projects/<slug>.webp. sharp strips all
// metadata unless withMetadata() is called, so the output carries none. The
// "portfolio" shot comes from local dev, so `npm run dev` must be running for
// it.
//
// Usage: node scripts/capture-projects.mjs [slug…]   (no slugs = every live card)

import { chromium } from "@playwright/test";
import sharp from "sharp";
import { PROJECTS } from "../lib/projects.js";

const OUT = "public/projects";
const LOCAL = "http://localhost:3000/";

// Per-site preparation before the shot.
const PREP = {
  "aloys-travels": async (page) => {
    await page.locator('button:has-text("Reject")').first().click({ timeout: 5000 });
    // The hero is a crossfading slideshow: wait for the next slide change,
    // then for its fade and text entrance to finish.
    const active = () => page.evaluate(() => [...document.querySelectorAll(".hero-slide")].findIndex((s) => s.classList.contains("active")));
    const start = await active();
    await page.waitForFunction(
      (i) => [...document.querySelectorAll(".hero-slide")].findIndex((s) => s.classList.contains("active")) !== i,
      start,
      { timeout: 20000 }
    );
    await page.waitForTimeout(2500);
  },
  portfolio: async (page) => {
    // No custom cursor ring, first-load cover or Next dev badge in the shot.
    await page.addStyleTag({
      content: ".cursor-ring, .cursor-dot, nextjs-portal, .intro-stamp, .morph-loader { display: none !important; }",
    });
    await page.waitForSelector('[data-portrait][data-state="static"], [data-portrait][data-state="skipped"]', {
      timeout: 20000,
    });
    await page.waitForTimeout(500);
  },
};

const wanted = process.argv.slice(2);
const targets = PROJECTS.filter((p) => p.status === "live" && (!wanted.length || wanted.includes(p.slug)));

const browser = await chromium.launch();
try {
  for (const p of targets) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: "light" });
    await page.goto(p.self ? LOCAL : p.href, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4000);
    await PREP[p.slug]?.(page);
    const name = `${p.slug}.webp`;
    const info = await sharp(await page.screenshot()).webp({ quality: 78 }).toFile(`${OUT}/${name}`);
    console.log(`${name}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
}
