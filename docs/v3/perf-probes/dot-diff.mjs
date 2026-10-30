// /portfolio's live dot: the box-shadow glow (the build at <url>, as served)
// against the compositor glow (the same page with the new rules injected),
// frozen at the same points of the 2.6 s cycle, and the pixel diff of each
// pair; the old twice for the floor. The animations are held at playback rate
// 0 rather than paused, so they stay running and the compositor draws them as
// it would live. usage: node dot-diff.mjs <url> <outdir> [dpr=2.75] [light|dark]
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const sharp = createRequire(import.meta.url)("sharp");

const [base, out, dprA = "2.75", scheme = "light"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const NEW = `
.live-dot { position: relative; animation-name: live-breathe-n !important; }
.live-dot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; background: rgb(var(--c-live)); animation: live-glow-n 2.6s ease-in-out infinite paused; }
[data-onscreen="true"] .live-dot::after { animation-play-state: running; }
@keyframes live-breathe-n { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes live-glow-n { 0%, 100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(2.333333); opacity: 0; } }`;
const TIMES = Array.from({ length: 27 }, (_, i) => i * 100);
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(tag, css) {
  const ctx = await browser.newContext({ viewport: { width: 392, height: 751 }, deviceScaleFactor: +dprA, colorScheme: scheme });
  const page = await ctx.newPage();
  await page.goto(base + "/portfolio", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  if (css) await page.addStyleTag({ content: css });
  await page.evaluate(() => document.querySelector(".live-dot").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(4000); // the address types and its caret goes
  const clip = await page.evaluate(() => {
    const r = document.querySelector(".live-dot").getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2 - 12), y: Math.round(r.y + r.height / 2 - 12), width: 24, height: 24 };
  });
  const files = [];
  for (const t of TIMES) {
    await page.evaluate((t) => {
      const dot = document.querySelector(".live-dot");
      for (const a of document.getAnimations()) if (a.effect?.target === dot) { a.playbackRate = 0; a.play(); a.currentTime = t; }
    }, t);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const f = `${out}/${tag}-${scheme}-${dprA}-${String(t).padStart(4, "0")}.png`;
    await page.screenshot({ path: f, clip, animations: "allow" });
    files.push(f);
  }
  const n = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.target === document.querySelector(".live-dot")).length);
  await ctx.close();
  return { files, n };
}

async function diff(a, b) {
  const [x, y] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  let px = 0, max = 0;
  for (let i = 0; i < x.data.length; i += 4) {
    const d = Math.max(...[0, 1, 2].map((k) => Math.abs(x.data[i + k] - y.data[i + k])));
    if (d) px++;
    max = Math.max(max, d);
  }
  return { share: px / (x.info.width * x.info.height), max };
}

const A1 = await capture("old1"), A2 = await capture("old2"), B = await capture("new", NEW);
console.log(`animations on the dot: old ${A1.n}, new ${B.n}`);
let worst = { share: 0, max: 0 }, floor = { share: 0, max: 0 };
for (let i = 0; i < TIMES.length; i++) {
  const f = await diff(A1.files[i], A2.files[i]), d = await diff(A1.files[i], B.files[i]);
  floor = { share: Math.max(floor.share, f.share), max: Math.max(floor.max, f.max) };
  worst = { share: Math.max(worst.share, d.share), max: Math.max(worst.max, d.max) };
  console.log(`t=${TIMES[i]}ms floor ${(f.share * 100).toFixed(1)}% max ${f.max} | new ${(d.share * 100).toFixed(1)}% max ${d.max}`);
}
console.log(`worst: floor ${(floor.share * 100).toFixed(1)}% max ${floor.max}; new ${(worst.share * 100).toFixed(1)}% px max ${worst.max}/255`);
await browser.close();
