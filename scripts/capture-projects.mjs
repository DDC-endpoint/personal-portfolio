// Project screenshots for the project cards: each live site at 1440×900,
// top of the page, saved as public/projects/<slug>.webp. With --full, the
// whole page instead, for /portfolio's scroll-through preview: the page is
// scrolled through first so scroll reveals render, shot full-page at 1440
// wide, scaled to 720 wide, capped at 4200 px tall and saved as
// public/projects/full/<slug>.webp. sharp strips all metadata unless
// withMetadata() is called, so the output carries none. The "portfolio" shots
// come from local dev, so `npm run dev` must be running for them.
//
// Usage: node scripts/capture-projects.mjs [--full] [slug…]   (no slugs = every live card)

import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { PROJECTS } from "../lib/projects.js";

const OUT = "public/projects";
const LOCAL = "http://localhost:3000/";
const FULL = { width: 720, maxHeight: 4200, maxScroll: 9000 };

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

const args = process.argv.slice(2);
const full = args.includes("--full");
const wanted = args.filter((a) => a !== "--full");
const targets = PROJECTS.filter((p) => p.status === "live" && (!wanted.length || wanted.includes(p.slug)));

// Scrolls the page through so scroll-triggered reveals render, then back up.
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Math.min(h, FULL.maxScroll); y += 600) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(220);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1200);
}

async function fullShot(page, slug) {
  await scrollThrough(page);
  const png = await page.screenshot({ fullPage: true });
  const scaled = await sharp(png).resize({ width: FULL.width }).toBuffer({ resolveWithObject: true });
  return sharp(scaled.data)
    .extract({ left: 0, top: 0, width: FULL.width, height: Math.min(scaled.info.height, FULL.maxHeight) })
    .webp({ quality: 70 })
    .toFile(`${OUT}/full/${slug}.webp`);
}

await mkdir(`${OUT}/full`, { recursive: true });
const browser = await chromium.launch();
try {
  for (const p of targets) {
    // This site's full capture runs under reduced motion: the pinned Projects
    // strip becomes a plain list instead of a tall empty pin.
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      reducedMotion: full && p.self ? "reduce" : "no-preference",
    });
    await page.goto(p.self ? LOCAL : p.href, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4000);
    await PREP[p.slug]?.(page);
    const name = full ? `full/${p.slug}.webp` : `${p.slug}.webp`;
    const info = full ? await fullShot(page, p.slug) : await sharp(await page.screenshot()).webp({ quality: 78 }).toFile(`${OUT}/${name}`);
    console.log(`${name}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
    await page.close();
  }
} finally {
  await browser.close();
}
