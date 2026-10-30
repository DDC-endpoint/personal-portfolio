// Home's phone stack (Projects.jsx, stack mode) on two builds at the same scroll
// positions, settled, and the pixel diff of each pair; build A twice for the
// floor. Math.random is seeded, CSS animations are stopped by the screenshot.
// usage: node cards-diff.mjs <urlA> <urlB> <outdir> [light|dark]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");
import { mkdirSync } from "node:fs";

const [A, B, out, scheme = "light"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
// Scroll positions, in screen heights from one screen above the strip.
const STEPS = Array.from({ length: 14 }, (_, i) => +(i * 0.31).toFixed(2));

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(base, tag) {
  const ctx = await browser.newContext({ viewport: { width: 392, height: 751 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    let s = 1234567;
    Math.random = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  });
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector("[data-strip]").getBoundingClientRect().top + scrollY - innerHeight);
  const files = [];
  for (const k of STEPS) {
    // The quiet clock starts again at each stop: carried over, a stop reads
    // as settled at once and is shot mid-scroll, before the stack's rest.
    await page.evaluate((y) => { window.__calm = 0; scrollTo(0, y); }, Math.round(top + k * 751));
    // Settled: no card mid-decode for 600 ms.
    await page.waitForFunction(() => {
      const busy = [...document.querySelectorAll("[data-decode]")].some((el) => /decoding|dissolving|scrambling/.test(el.dataset.decode));
      const now = performance.now();
      if (busy || !window.__calm) window.__calm = busy ? 0 : now;
      return !busy && now - window.__calm > 600;
    }, null, { timeout: 30000, polling: 100 });
    const f = `${out}/${tag}-${scheme}-${String(k).padStart(4, "0")}.png`;
    // Only the strip: the section labels around it scramble on timers.
    const clip = await page.evaluate(() => {
      const r = document.querySelector("[data-strip]").getBoundingClientRect();
      const y = Math.max(0, Math.ceil(r.top)), h = Math.floor(Math.min(innerHeight, r.bottom)) - y;
      return h >= 8 ? { x: 0, y, width: innerWidth, height: h } : null;
    });
    if (!clip) { files.push(null); continue; }
    // Playwright's "disabled" fast-forwards every finite animation to its end,
    // a scroll-driven one too, and the screenshot's own scroll event starts
    // the stack's (Projects.jsx). ANIM=freeze stops the others here (an
    // infinite one at its start, as "disabled" does, a finite one at its end)
    // and leaves the scroll-driven ones be.
    const freeze = process.env.ANIM === "freeze";
    if (freeze)
      await page.evaluate(() => {
        for (const a of document.getAnimations()) {
          if (a.timeline && !(a.timeline instanceof DocumentTimeline)) continue;
          if (a.effect.getComputedTiming().endTime === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
        }
      });
    await page.screenshot({ path: f, clip, animations: freeze ? "allow" : "disabled", caret: "hide" });
    files.push(f);
  }
  await ctx.close();
  return files;
}

async function diff(a, b) {
  const [ia, ib] = await Promise.all([a, b].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const da = ia.data, db = ib.data;
  let px = 0, max = 0;
  const hist = [0, 0, 0, 0]; // 1-4, 5-16, 17-64, 65+
  for (let i = 0; i < da.length; i += ia.info.channels) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d) { px++; if (d > max) max = d; hist[d <= 4 ? 0 : d <= 16 ? 1 : d <= 64 ? 2 : 3]++; }
  }
  return { px, max, hist, total: da.length / ia.info.channels };
}

const fa = await capture(A, "a"), fa2 = await capture(A, "a2"), fb = await capture(B, "b");
for (let i = 0; i < fa.length; i++) {
  if (!fa[i] || !fa2[i] || !fb[i]) continue;
  const f = await diff(fa[i], fa2[i]), d = await diff(fa[i], fb[i]);
  const pct = (x) => ((100 * x.px) / x.total).toFixed(2);
  console.log(`${scheme} k=${STEPS[i]}  floor ${pct(f)}% max ${f.max}  |  A/B ${pct(d)}% max ${d.max}  [1-4 ${d.hist[0]}, 5-16 ${d.hist[1]}, 17-64 ${d.hist[2]}, 65+ ${d.hist[3]}]`);
}
await browser.close();
