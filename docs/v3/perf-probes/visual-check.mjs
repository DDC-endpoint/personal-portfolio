// The merge's visual check: each page on two builds (golden path desktop,
// mobile, dark, reduced motion), at the top, the middle and the bottom,
// settled, as side-by-side sheets (A left, B right) for a person to look at.
// usage: node visual-check.mjs <urlA> <urlB> <outdir>
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const sharp = createRequire(import.meta.url)("sharp");

const [A, B, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const PAGES = ["/", "/services", "/portfolio", "/privacy"];
const CONFIGS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  dark: { viewport: { width: 1440, height: 900 }, colorScheme: "dark" },
  reduced: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: "reduce" },
};
const STOPS = [0, 0.5, 1]; // share of the page's scroll
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function shots(base, config, path) {
  const ctx = await browser.newContext({ colorScheme: "light", ...CONFIGS[config] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const list = [];
  for (const k of STOPS) {
    await page.evaluate((k) => scrollTo({ top: k * (document.documentElement.scrollHeight - innerHeight), behavior: "instant" }), k);
    await page.waitForTimeout(2200);
    list.push(await sharp(await page.screenshot()).resize({ width: 520 }).toBuffer());
  }
  await ctx.close();
  return { list, errors };
}

for (const config of Object.keys(CONFIGS)) {
  for (const path of PAGES) {
    const [a, b] = [await shots(A, config, path), await shots(B, config, path)];
    const tiles = a.list.flatMap((t, i) => [t, b.list[i]]);
    const metas = await Promise.all(tiles.map((t) => sharp(t).metadata()));
    const H = Math.max(...metas.map((m) => m.height));
    const W = 520, gap = 6, pair = 2 * W + gap, sep = 24;
    const composite = tiles.map((input, i) => ({ input, left: Math.floor(i / 2) * (pair + sep) + (i % 2) * (W + gap), top: 0 }));
    const name = `${out}/${config}${path === "/" ? "-home" : path.replace("/", "-")}.png`;
    await sharp({ create: { width: STOPS.length * (pair + sep) - sep, height: H, channels: 3, background: "#ff00ff" } }).composite(composite).png().toFile(name);
    console.log(`${name}${a.errors.length || b.errors.length ? `  page errors A ${a.errors.length} B ${b.errors.length}: ${[...a.errors, ...b.errors].slice(0, 2).join(" | ")}` : ""}`);
  }
}
await browser.close();
