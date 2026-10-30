// Per-page perf audit: a cold first visit of each page on a throttled link,
// then a stepped scroll through it (scroll 0.6 screen, pause 1 s), logging the
// card decodes (data-decode), the curtain, the portrait, rAF intervals, long
// animation frames with script attribution, LCP/CLS, and on the USB phone the
// presented frames (Display::FrameDisplayed from a trace).
// usage: node docs/v3/perf-probes/pages-audit.mjs <phone|emu|desktop> <base-url> <label> [downKbps=1600] [rttMs=300] [cpu=1] [paths=/,/services,/portfolio,/privacy]
import { chromium, devices } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";

const [mode = "phone", baseArg = "http://localhost:3104", label = "x", downA = "1600", rttA = "300", cpuA = "1", pathsA = "/,/services,/portfolio,/privacy"] = process.argv.slice(2);
const base = baseArg.replace(/\/$/, "");
const down = +downA, rtt = +rttA, cpu = +cpuA, paths = pathsA.split(",");
const OUT = process.env.OUT || `${tmpdir()}/perf-runs`; // outside the repo
mkdirSync(OUT, { recursive: true });

let browser, ctx;
if (mode === "phone") {
  browser = await chromium.connectOverCDP("http://localhost:9222");
  ctx = browser.contexts()[0];
} else {
  browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
  ctx = await browser.newContext(mode === "emu" ? { ...devices["Pixel 7"] } : { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
}
const page = mode === "phone" ? ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage()) : await ctx.newPage();
await page.bringToFront();

await page.addInitScript(() => {
  try { sessionStorage.removeItem("ddc-loaded"); } catch {}
  const now = () => performance.now();
  const w = (window.__a = { ev: [], frames: [], loaf: [], lcp: [], cls: 0, failsafe: null, gestures: [], sc: [] });
  addEventListener("scroll", () => w.sc.push(now()), { passive: true, capture: true });
  const decodeEls = () => [...document.querySelectorAll("[data-decode]")];
  new MutationObserver((ms) => {
    for (const m of ms) {
      const el = m.target, a = m.attributeName;
      if (a === "data-curtain" && el.matches("[data-curtain]")) w.ev.push([now(), "curtain", el.dataset.curtain]);
      else if (a === "data-state" && el.matches("[data-portrait]")) w.ev.push([now(), "portrait", el.dataset.state]);
      else if (a === "data-decode") w.ev.push([now(), "decode", el.dataset.decode, decodeEls().indexOf(el)]);
      else if (a === "data-full") w.ev.push([now(), "preview", el.hasAttribute("data-full") ? "full" : "off"]);
    }
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-curtain", "data-state", "data-decode", "data-full"] });
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        w.loaf.push({ t: e.startTime, d: e.duration, b: e.blockingDuration, r: e.renderStart ? e.duration - (e.renderStart - e.startTime) : 0,
          s: e.scripts.map((s) => ({ inv: s.invoker, fn: s.sourceFunctionName, url: (s.sourceURL || "").split("/").pop(), pos: s.sourceCharPosition, d: s.duration, lay: s.forcedStyleAndLayoutDuration })) });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) w.lcp.push([e.startTime, e.element?.tagName + (e.element?.className ? "." + String(e.element.className).slice(0, 30) : "")]); }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) w.cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {}
  let last = 0;
  const tick = (t) => {
    if (last) w.frames.push([t, t - last]);
    last = t;
    const cur = document.querySelector("[data-curtain]");
    if (cur && w.failsafe === null && cur.dataset.curtain === "intro" && getComputedStyle(cur).visibility === "hidden") w.failsafe = now();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
const throttle = async (on) => {
  await cdp.send("Network.emulateNetworkConditions", on ? { offline: false, latency: rtt, downloadThroughput: (down * 1000) / 8, uploadThroughput: (750 * 1000) / 8 } : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
};
if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });

const results = [];
for (const path of paths) {
  await page.goto("about:blank");
  await throttle(true);
  await page.goto(base + path, { waitUntil: "commit", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 45000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; const fcp = performance.getEntriesByName("first-contentful-paint")[0]; return { ttfb: n.responseStart, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, fcp: fcp?.startTime }; });

  // The scroll: a trace on the phone for presented frames.
  let b, chunks = [], traceDone;
  if (mode === "phone") {
    b = await browser.newBrowserCDPSession();
    b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
    traceDone = new Promise((r) => b.on("Tracing.tracingComplete", r));
    await b.send("Tracing.start", { traceConfig: { includedCategories: ["viz", "blink.user_timing", "disabled-by-default-devtools.timeline.frame"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
    await page.waitForTimeout(300);
  }
  const scrollStart = await page.evaluate(() => { performance.mark("audit-anchor"); return performance.now(); });
  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  let prevY = -1, steps = 0;
  while (steps < 45) {
    const y = await page.evaluate(() => scrollY);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    if (y >= max - 2 || (steps > 0 && Math.abs(y - prevY) < 2)) break;
    prevY = y;
    const g0 = await page.evaluate(() => performance.now());
    if (mode === "desktop") await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(vp.w / 2), y: Math.round(vp.h * 0.6), yDistance: -Math.round(vp.h * 0.6), speed: 1400, gestureSourceType: "mouse", repeatCount: 1 });
    else {
      // A finger drag of 0.5 screen over ~400 ms (synthetic touch gestures don't scroll in headless).
      const x = Math.round(vp.w * 0.15), y0 = Math.round(vp.h * 0.75), dy = (vp.h * 0.5) / 24;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 24; i++) {
        await new Promise((r) => setTimeout(r, 16));
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(y0 - i * dy) }] });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    }
    const g1 = await page.evaluate(() => performance.now());
    await page.evaluate(([a, c]) => window.__a.gestures.push([a, c]), [g0, g1]);
    await page.waitForTimeout(1000);
    steps++;
  }
  const scrollEnd = await page.evaluate(() => performance.now());
  let present = null;
  if (mode === "phone") {
    await b.send("Tracing.end");
    await traceDone;
    const anchor = chunks.find((e) => e.name === "audit-anchor");
    const fr = chunks.filter((e) => e.name === "Display::FrameDisplayed").map((e) => e.ts / 1000).sort((x, y) => x - y);
    present = { anchorTs: anchor ? anchor.ts / 1000 : null, frames: fr };
    await b.detach();
  }
  const a = await page.evaluate(() => window.__a);
  const r = { path, mode, label, down, rtt, cpu, vp, nav, scrollStart, scrollEnd, steps, ...a, present };
  results.push(r);
  console.log(`${label} ${path}: idle ${Math.round(a.ev.find(([, k, v]) => k === "curtain" && v === "idle")?.[0] ?? -1)} ms, ${steps} scroll steps, ${a.ev.filter(([, k]) => k === "decode").length} decode events`);
  await throttle(false);
}
const file = `${OUT}/${mode}-${label}-${Date.now()}.json`;
writeFileSync(file, JSON.stringify(results));
console.log("wrote", file);
if (mode === "phone") await browser.close().catch(() => {}); else await browser.close();
