// The scroll score on this machine as a slow desktop: each page at 1366×768
// with the CPU throttled, scrolled by the mouse wheel in bursts (Lenis smooths
// the wheel on desktop, so the page moves on the main thread's frames, and
// the rAF rate is the scroll's rate). Counts rAF intervals only while the page
// is moving. usage: node desk-scroll.mjs <base-url> [cpu=4] [bursts=8] [paths=/,/services,/portfolio,/privacy]
import { chromium } from "@playwright/test";

const [baseA, cpuA = "4", burstsA = "8", pathsA = "/,/services,/portfolio,/privacy"] = process.argv.slice(2);
const base = baseA.replace(/\/$/, ""), bursts = +burstsA;
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const scores = [];
for (const path of pathsA.split(",")) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: +cpuA });
  // Frames while the page moves: a rAF whose scrollY differs from the last one's.
  await page.evaluate(() => {
    window.__mv = []; let lastT = 0, lastY = scrollY;
    const f = (t) => { if (scrollY !== lastY && lastT) window.__mv.push(t - lastT); lastY = scrollY; lastT = t; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  await page.mouse.move(683, 400);
  for (let k = 0; k < bursts; k++) {
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(40); }
    await page.waitForTimeout(900);
  }
  const mv = await page.evaluate(() => window.__mv);
  const ms = mv.reduce((s, v) => s + v, 0), fps = (1000 * mv.length) / (ms || 1);
  scores.push(fps);
  console.log(`${path}: ${mv.length} moving frames, ${fps.toFixed(1)} fps, >25 ms: ${mv.filter((d) => d > 25).length}, >50: ${mv.filter((d) => d > 50).length}, longest ${Math.round(Math.max(0, ...mv))} ms`);
  await ctx.close();
}
console.log(`average over pages: ${(scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1)} fps (cpu ×${cpuA})`);
await browser.close();
