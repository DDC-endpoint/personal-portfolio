// Home's hero portrait drawn by two builds, and the pixel diff: the finished
// portrait (reduced motion: drawn once, no loop, nothing random), clipped to
// the stage; build A twice for the floor. For the portrait moved into a worker
// (lib/portrait.worker.js) against the page-drawn one.
// usage: node portrait-diff.mjs <urlA> <urlB> [dpr=2.75] [light|dark] [width=392]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");

const [A, B, dprA = "2.75", scheme = "light", widthA = "392"] = process.argv.slice(2);
const width = +widthA, height = width < 768 ? 751 : 900;
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(base) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: +dprA, colorScheme: scheme, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForFunction(() => /^(static|skipped)$/.test(document.querySelector("[data-portrait]")?.dataset.state || ""), null, { timeout: 60000 });
  await page.waitForTimeout(800);
  const buf = await page.locator("[data-portrait] canvas").screenshot({ animations: "disabled" });
  const worker = await page.locator("[data-portrait] canvas").evaluate((c) => {
    try {
      return !c.getContext("2d");
    } catch {
      return true;
    }
  });
  await ctx.close();
  return { buf, worker };
}

async function diff(a, b) {
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return `size ${x.info.width}×${x.info.height} vs ${y.info.width}×${y.info.height}`;
  let px = 0, max = 0;
  for (let i = 0; i < x.data.length; i += x.info.channels) {
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs(x.data[i + c] - y.data[i + c])));
    if (d) { px++; max = Math.max(max, d); }
  }
  return `${((100 * px) / (x.data.length / x.info.channels)).toFixed(3)}% px, max ${max}/255`;
}

const a1 = await capture(A), a2 = await capture(A), b = await capture(B);
// OUT=dir: keep the two images.
if (process.env.OUT) for (const [t, x] of [["a", a1], ["b", b]]) await sharp(x.buf).toFile(`${process.env.OUT}/portrait-${t}-${scheme}-${dprA}-${width}.png`);
console.log(`${scheme} dpr ${dprA} ${width}px  A in a worker: ${a1.worker}, B in a worker: ${b.worker}  |  floor ${await diff(a1.buf, a2.buf)}  |  A/B ${await diff(a1.buf, b.buf)}`);
await browser.close();
