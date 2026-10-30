// Frame-matched screenshots of a page change on two builds, under a fake
// clock, then a pixel diff of each pair. Web Animations don't follow the fake
// clock, so every animation is driven by hand: Element.animate is patched to
// stamp each animation with the fake time it was made, and at each moment
// every animation is paused at (now − made) or finished if past its end.
// usage: node curtain-diff2.mjs <urlA> <urlB> <outdir>
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");
import { mkdirSync } from "node:fs";

const [A, B, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const MOMENTS = [160, 304, 448, 608, 800, 1008, 1200, 1408, 1600, 1808, 2000, 2208]; // multiples of the fake clock's 16 ms frame

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(base, tag, dark) {
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
  await ctx.addInitScript(() => {
    // The engine's per-frame loop places each frame from the move's start on
    // document.timeline, which the fake clock doesn't drive: read it from the
    // fake clock too, or each run picks different frames.
    Object.defineProperty(document.timeline, "currentTime", { get: () => performance.now(), configurable: true });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const a = animate.apply(this, args);
      a.__made = performance.now();
      return a;
    };
    window.__sync = () => {
      const now = performance.now();
      for (const a of document.getAnimations()) {
        if (a.__made === undefined || !(a.timeline instanceof DocumentTimeline)) continue;
        const ct = now - a.__made;
        const end = a.effect.getComputedTiming().endTime;
        if (ct >= end) {
          if (a.playState !== "finished") a.finish();
        } else {
          try { a.pause(); a.currentTime = ct; } catch {}
        }
      }
    };
  });
  const page = await ctx.newPage();
  await page.goto(base + "/services", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 5000);
  await page.evaluate(() => document.querySelector('header a[href="/"]').click());
  let at = 0;
  const files = [];
  for (const m of MOMENTS) {
    // small steps, so animations made along the way (the lift) are synced too
    while (at < m) {
      const step = Math.min(50, m - at);
      await page.clock.runFor(step);
      at += step;
      await page.evaluate(() => window.__sync());
    }
    await page.waitForTimeout(120);
    const f = `${out}/${tag}-${dark ? "dark" : "light"}-${String(m).padStart(4, "0")}.png`;
    await page.screenshot({ path: f });
    files.push(f);
  }
  await ctx.close();
  return files;
}

async function diff(a, b) {
  const [ia, ib] = await Promise.all([a, b].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const da = ia.data, db = ib.data;
  let px = 0, max = 0;
  for (let i = 0; i < da.length; i += ia.info.channels) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d) { px++; if (d > max) max = d; }
  }
  return { px, max, total: da.length / ia.info.channels };
}

for (const dark of [false, true]) {
  const fa = await capture(A, "a", dark), fb = await capture(B, "b", dark);
  for (let i = 0; i < fa.length; i++) {
    const d = await diff(fa[i], fb[i]);
    console.log(`${dark ? "dark " : "light"} t=${MOMENTS[i]}ms  differing px ${d.px} (${((100 * d.px) / d.total).toFixed(2)}%)  max ${d.max}`);
  }
}
await browser.close();
