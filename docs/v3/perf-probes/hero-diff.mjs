// Home's hero (its scroll drift) and the scroll progress line on two builds,
// at rest at the same scroll positions, and the pixel diff of each pair;
// build A twice for the floor. Reduced motion, so the hero's entrance, the
// portrait and the blobs hold still (the drift and the line still follow the
// scroll there). usage: node hero-diff.mjs <urlA> <urlB> [dpr=2.75] [light|dark] [width=392]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");

const [A, B, dprA = "2.75", scheme = "light", widthA = "392"] = process.argv.slice(2);
const width = +widthA, height = width < 768 ? 751 : 900;
const STOPS = [0, 40, 150, 320, 560, 900];
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(base) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: +dprA, colorScheme: scheme, reducedMotion: "reduce", isMobile: width < 768, hasTouch: width < 768 });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForFunction(() => /^(static|skipped)$/.test(document.querySelector("[data-portrait]")?.dataset.state || ""), null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const shots = [];
  for (const y of STOPS) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: "instant" }), y);
    await page.waitForTimeout(700); // past the drift's rest (150 ms) and the line's ease
    // Playwright's "disabled" fast-forwards a scroll-driven animation (the
    // line's, the drift's) to its end: stop the others here instead (an
    // infinite one at its start, a finite one at its end).
    await page.evaluate(() => {
      for (const a of document.getAnimations()) {
        if (a.timeline && !(a.timeline instanceof DocumentTimeline)) continue;
        if (a.effect.getComputedTiming().endTime === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
      }
    });
    // MASK=1: blank the portrait's canvas and the progress line (the line's
    // top 4 px), to see the drift alone.
    const mask = process.env.MASK
      ? await page.evaluate(() => {
          const r = document.querySelector("[data-portrait] canvas").getBoundingClientRect();
          return [{ x: r.x, y: r.y, width: r.width, height: r.height }, { x: 0, y: 0, width: innerWidth, height: 4 }];
        })
      : [];
    shots.push(await page.screenshot({ animations: "allow", caret: "hide", mask: mask.map((m) => page.locator("body")).slice(0, 0), clip: undefined }));
    if (mask.length) shots[shots.length - 1] = { buf: shots.at(-1), mask, dpr: +dprA };
  }
  await ctx.close();
  return shots;
}

async function diff(a, b) {
  const masks = a.mask || [];
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f.buf || f).raw().toBuffer({ resolveWithObject: true })));
  for (const m of masks) for (const img of [x, y]) {
    const k = a.dpr, w = img.info.width, c = img.info.channels;
    for (let j = Math.max(0, Math.floor(m.y * k)); j < Math.min(img.info.height, Math.ceil((m.y + m.height) * k)); j++)
      for (let i = Math.max(0, Math.floor(m.x * k)); i < Math.min(w, Math.ceil((m.x + m.width) * k)); i++) for (let q = 0; q < 3; q++) img.data[(j * w + i) * c + q] = 0;
  }
  let px = 0, max = 0;
  for (let i = 0; i < x.data.length; i += x.info.channels) {
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs(x.data[i + c] - y.data[i + c])));
    if (d) { px++; max = Math.max(max, d); }
  }
  return `${((100 * px) / (x.data.length / x.info.channels)).toFixed(3)}% max ${max}`;
}

const a1 = await capture(A), a2 = await capture(A), b = await capture(B);
for (let i = 0; i < STOPS.length; i++) console.log(`${scheme} dpr ${dprA} ${width}px y=${STOPS[i]}  floor ${await diff(a1[i], a2[i])}  |  A/B ${await diff(a1[i], b[i])}`);
if (process.env.OUT) for (let i = 0; i < STOPS.length; i++) for (const [t, s] of [["a", a1], ["b", b]]) await sharp(s[i].buf || s[i]).toFile(`${process.env.OUT}/hero-${t}-${scheme}-${width}-${STOPS[i]}.png`);
await browser.close();
