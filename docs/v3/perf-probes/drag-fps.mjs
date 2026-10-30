// The scroll score on the USB phone: identical synthesised touch drags on each page, and
// the presented frames (Chrome trace, Display::FrameDisplayed) counted only
// from each drag's start to its end (no fling), so pauses and the
// end of a short page don't count as dropped frames. Each drag starts where
// the last one left off; a page that runs out of scroll starts again from the
// top. usage: node drag-fps.mjs <base-url> [drags=10] [paths=/,/services,/portfolio,/privacy]
// CSS="…" injects overrides for isolation.
import { chromium } from "@playwright/test";

const [baseA, dragsA = "10", pathsA = "/,/services,/portfolio,/privacy"] = process.argv.slice(2);
const base = baseA.replace(/\/$/, ""), drags = +dragsA, paths = pathsA.split(",");
const SPEED = 900; // px a second: a brisk read-scroll
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
if (process.env.CSS) await page.addInitScript((css) => { const add = () => { const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st); }; if (document.readyState !== "loading") add(); else document.addEventListener("DOMContentLoaded", add); }, process.env.CSS);
// BLOCK_GA=1: Google Analytics never loads (its scroll tracking is a suspect).
if (process.env.BLOCK_GA) await page.route(/googletagmanager|google-analytics/, (r) => r.abort());
const cdp = await ctx.newCDPSession(page);
const all = [];

for (const path of paths) {
  await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  const b = await browser.newBrowserCDPSession();
  const chunks = [];
  b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
  const done = new Promise((r) => b.on("Tracing.tracingComplete", r));
  await b.send("Tracing.start", { traceConfig: { includedCategories: process.env.DEBUG ? ["viz", "benchmark", "blink.user_timing", "devtools.timeline", "disabled-by-default-devtools.timeline", "cc", "gpu", "v8.execute"] : ["viz", "benchmark", "blink.user_timing"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
  // The main thread's frames (rAF), for what scripts move during the scroll
  // (the compositor scrolls the page; a script-driven effect moves at this rate).
  await page.evaluate(() => { window.__raf = []; const f = (t) => { window.__raf.push(t); requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await page.waitForTimeout(300);
  const marks = []; // [start, end] per drag, in the trace's clock via a console mark
  for (let k = 0; k < drags; k++) {
    const atEnd = await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4);
    if (atEnd) { await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(800); }
    // The browser synthesises the touch drag itself, one move per frame, at
    // a steady SPEED, and lets it fling; the window ends at scrollend, when
    // the page stops. Touch moves sent over USB arrive slower than the
    // screen, and a gesture held still at its end to stop a fling presents
    // no frames: both read as dropped frames (/privacy measured 20 fps, then
    // 50, that way).
    const x = Math.round(vp.w * 0.06), y0 = Math.round(vp.h * 0.8);
    const y0s = await page.evaluate(() => scrollY);
    const stopped = page.evaluate(() => new Promise((r) => {
      let once = false;
      const end = () => { if (once) return; once = true; performance.mark("drag-end"); r(); };
      addEventListener("scrollend", end, { once: true });
      setTimeout(end, 4000); // no scrollend (nothing scrolled): give up
    }));
    await page.evaluate(() => performance.mark("drag-start"));
    await cdp.send("Input.synthesizeScrollGesture", { x, y: y0, yDistance: -Math.round(vp.h * 0.45), speed: SPEED, gestureSourceType: "touch", preventFling: false, repeatCount: 0 });
    await stopped;
    if (process.env.DEBUG) console.log(`  drag ${k}: scrollY ${y0s} → ${await page.evaluate(() => scrollY)} of ${await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)}`);
    await page.waitForTimeout(900);
  }
  await b.send("Tracing.end");
  await done;
  const main = await page.evaluate(() => {
    const st = performance.getEntriesByName("drag-start"), en = performance.getEntriesByName("drag-end");
    return st.map((s, i) => { const e = en[i]?.startTime ?? s.startTime; const r = window.__raf.filter((t) => t >= s.startTime && t <= e); return r.length > 1 ? (1000 * (r.length - 1)) / (r.at(-1) - r[0]) : null; }).filter((v) => v !== null);
  });
  await page.evaluate(() => performance.clearMarks());
  const mk = chunks.filter((e) => e.name === "drag-start" || e.name === "drag-end").sort((a, c) => a.ts - c.ts);
  for (let i = 0; i + 1 < mk.length; i += 2) if (mk[i].name === "drag-start" && mk[i + 1].name === "drag-end") marks.push([mk[i].ts / 1000, mk[i + 1].ts / 1000]);
  const fr = chunks.filter((e) => e.name === "Display::FrameDisplayed").map((e) => e.ts / 1000).sort((a, c) => a - c);
  let n = 0, ms = 0;
  const gaps = [], perDrag = [];
  // From each drag's first presented frame to its last: the gesture's
  // start-up (the round trip, the touch slop) is latency, not frame rate.
  for (const [a, c] of marks) {
    const f = fr.filter((t) => t >= a && t <= c);
    if (f.length < 2) continue;
    const span = f.at(-1) - f[0];
    n += f.length - 1; ms += span;
    perDrag.push((1000 * (f.length - 1)) / span);
    if (process.env.DEBUG) for (let i = 1; i < f.length; i++) if (f[i] - f[i - 1] > 50) {
      // What ran across the gap: events over 15 ms overlapping it, by thread.
      const [g0, g1] = [f[i - 1] * 1000, f[i] * 1000];
      const tn = new Map(chunks.filter((e) => e.ph === "M" && e.name === "thread_name").map((e) => [`${e.pid}:${e.tid}`, e.args.name]));
      const hits = chunks.filter((e) => e.ph === "X" && e.dur > 15000 && e.ts < g1 && e.ts + e.dur > g0).map((e) => `${tn.get(`${e.pid}:${e.tid}`) || "?"}:${e.name}${e.args?.data?.functionName ? " " + e.args.data.functionName : ""}${e.args?.data?.url ? " " + e.args.data.url.split("/").pop() + ":" + e.args.data.lineNumber : ""} ${Math.round(e.dur / 1000)}ms`);
      console.log(`    gap ${Math.round(f[i] - f[i - 1])} ms at +${Math.round(f[i - 1] - f[0])} ms of ${Math.round(f.at(-1) - f[0])}: ${[...new Set(hits)].slice(0, 8).join(" | ")}`);
    }
    if (process.env.DEBUG) console.log(`  drag ${perDrag.length - 1}: ${perDrag.at(-1).toFixed(1)} fps, gaps ${f.slice(1).map((t, i) => Math.round(t - f[i])).filter((g) => g > 25).join(" ")}`);
    for (let i = 1; i < f.length; i++) gaps.push(f[i] - f[i - 1]);
  }
  const fps = (1000 * n) / ms;
  const min = Math.min(...perDrag);
  const mainFps = main.reduce((a, v) => a + v, 0) / (main.length || 1);
  all.push([fps, mainFps]);
  console.log(`${path}: ${marks.length} drags, ${fps.toFixed(1)} fps shown (worst drag ${min.toFixed(1)}), main thread ${mainFps.toFixed(1)} fps (worst ${Math.min(...main).toFixed(1)}), gaps >25: ${gaps.filter((g) => g > 25).length}, >50: ${gaps.filter((g) => g > 50).length}, longest ${Math.round(Math.max(0, ...gaps))} ms`);
}
console.log(`average over pages: ${(all.reduce((s, v) => s + v[0], 0) / all.length).toFixed(1)} fps shown, main thread ${(all.reduce((s, v) => s + v[1], 0) / all.length).toFixed(1)} fps`);
await browser.close().catch(() => {});
