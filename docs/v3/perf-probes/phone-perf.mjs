// Frame times on the USB phone (Chrome over CDP): first load, idle hero, a
// page change to /services and back. usage: node phone-perf.mjs <base-url>
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
await ctx.addInitScript(() => {
  window.__frames = [];
  const loop = (t) => { window.__frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__loaf = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__loaf.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), scripts: e.scripts.slice(0, 3).map((s) => `${Math.round(s.duration)}ms ${(s.sourceURL || "").split("/").pop().slice(0, 18)}:${s.sourceFunctionName || ""}@${s.sourceCharPosition} ${s.invoker || ""}`) });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
});
function summarise(label, frames, from, to) {
  const f = frames.filter((t) => t >= from && t <= to);
  const d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  if (!d.length) return console.log(label, "no frames");
  d.sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(1);
  const over = d.filter((x) => x > 25).length, over50 = d.filter((x) => x > 50).length;
  console.log(`${label}: ${d.length} frames over ${((to - from) / 1000).toFixed(2)}s, ~${(1000 * d.length / (to - from)).toFixed(0)} fps, median ${q(0.5)}ms p90 ${q(0.9)}ms, >25ms: ${over}, >50ms: ${over50}, worst ${d.slice(-4).map((x) => x.toFixed(0)).join(",")}`);
}
const loafs = async (n = 5) => { const l = await page.evaluate(() => window.__loaf); for (const x of l.sort((a, b) => b.dur - a.dur).slice(0, n)) console.log("   ", JSON.stringify(x)); await page.evaluate(() => (window.__loaf = [])); };
console.log(base);
await page.goto(base + "/", { waitUntil: "commit", timeout: 60000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(2500);
let frames = await page.evaluate(() => window.__frames);
summarise("first load (all)", frames, frames[0], frames.at(-1));
await loafs();
let t = await page.evaluate(() => performance.now());
await page.waitForTimeout(3000);
frames = await page.evaluate(() => window.__frames);
summarise("hero idle", frames, t, t + 3000);
await loafs(3);
// page change through the menu
await page.evaluate(() => document.querySelector("button[aria-label='Open menu']")?.click());
await page.waitForTimeout(700);
t = await page.evaluate(() => performance.now());
await page.evaluate(() => document.querySelector("[role=dialog] a[href='/services']")?.click());
await page.waitForURL("**/services", { timeout: 15000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
let t2 = await page.evaluate(() => performance.now());
frames = await page.evaluate(() => window.__frames);
summarise("page change → /services", frames, t, t2);
await loafs();
await page.evaluate(() => document.querySelector("button[aria-label='Open menu']")?.click());
await page.waitForTimeout(700);
t = await page.evaluate(() => performance.now());
await page.evaluate(() => document.querySelector("[role=dialog] a[href='/']")?.click());
await page.waitForURL(base + "/", { timeout: 15000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
await page.waitForTimeout(2500);
t2 = await page.evaluate(() => performance.now());
frames = await page.evaluate(() => window.__frames);
summarise("page change → Home (+wave)", frames, t, t2);
await loafs();
await browser.close();
