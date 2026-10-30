// The hero portrait's own frame rate while Home scrolls, on the USB phone:
// short synthesised drags over the hero (the portrait stays on screen), from
// the top each time. In a worker, the renderer's frame count
// (canvas.portraitSnapshot().frames) over the drag; drawn on the page, its loop
// is the page's rAF, so the page's rAF rate over the same window.
// usage: node portrait-fps.mjs <base-url> [drags=8]
import { chromium } from "@playwright/test";

const [baseA, dragsA = "8"] = process.argv.slice(2);
const base = baseA.replace(/\/$/, "");
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
const cdp = await ctx.newCDPSession(page);
await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => /^(static|skipped)$/.test(document.querySelector("[data-portrait]")?.dataset.state || ""), null, { timeout: 60000 });
await page.waitForTimeout(1500);
const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
const worker = await page.evaluate(() => !!document.querySelector("[data-portrait] canvas").portraitSnapshot);
const rates = [];
for (let k = 0; k < +dragsA; k++) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    window.__raf = 0;
    const f = () => { window.__raf++; window.__rafId = requestAnimationFrame(f); };
    window.__rafId = requestAnimationFrame(f);
    const c = document.querySelector("[data-portrait] canvas");
    window.__f0 = c.portraitSnapshot ? (await c.portraitSnapshot()).frames : 0;
    window.__t0 = performance.now();
    window.__done = new Promise((r) => { const end = () => r(); addEventListener("scrollend", end, { once: true }); setTimeout(end, 4000); });
  });
  await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(vp.w * 0.5), y: Math.round(vp.h * 0.7), yDistance: -Math.round(vp.h * 0.3), speed: 900, gestureSourceType: "touch", preventFling: false, repeatCount: 0 });
  const r = await page.evaluate(async () => {
    await window.__done;
    const ms = performance.now() - window.__t0;
    cancelAnimationFrame(window.__rafId);
    const c = document.querySelector("[data-portrait] canvas");
    const frames = c.portraitSnapshot ? (await c.portraitSnapshot()).frames - window.__f0 : null;
    return { ms, raf: window.__raf, frames };
  });
  rates.push(r);
}
const fps = (n, ms) => (1000 * n) / ms;
const portrait = rates.map((r) => fps(worker ? r.frames : r.raf, r.ms));
const main = rates.map((r) => fps(r.raf, r.ms));
const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length;
console.log(`${base}: portrait in a worker: ${worker} | portrait ${avg(portrait).toFixed(1)} fps (worst ${Math.min(...portrait).toFixed(1)}) | page rAF ${avg(main).toFixed(1)} fps (worst ${Math.min(...main).toFixed(1)})`);
await browser.close().catch(() => {});
