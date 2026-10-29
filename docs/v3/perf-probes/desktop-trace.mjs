// Presented frames (viz's Display::FrameDisplayed) during a page change on
// this machine's GPU, with the CPU throttled: whether the compositor keeps
// the panels moving through a main-thread stall.
// usage: node desktop-trace.mjs <base-url> [cpuThrottle]
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const throttle = Number(process.argv[3] || 4);
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(2500);
const b = await browser.newBrowserCDPSession();
const chunks = [];
b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
const done = new Promise((r) => b.on("Tracing.tracingComplete", r));
await b.send("Tracing.start", { traceConfig: { includedCategories: ["viz", "benchmark"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
await page.waitForTimeout(300);
const t0 = Date.now();
await page.evaluate(() => {
  window.__st = []; window.__t0 = Date.now();
  new MutationObserver(() => window.__st.push([Date.now() - window.__t0, document.querySelector("[data-curtain]").dataset.curtain])).observe(document.querySelector("[data-curtain]"), { attributes: true, attributeFilter: ["data-curtain"] });
  document.querySelector('header a[href="/services"]').click();
});
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
const t1 = Date.now();
await page.waitForTimeout(200);
await b.send("Tracing.end");
await done;
const all = chunks.filter((e) => e.ts).map((e) => e.ts);
const tMax = Math.max(...all);
const windowStart = tMax - (t1 - t0 + 200) * 1000, windowEnd = tMax - 200 * 1000;
const ts = chunks.filter((e) => e.name === "Display::FrameDisplayed" && e.ts >= windowStart && e.ts <= windowEnd).map((e) => e.ts / 1000).sort((a, b) => a - b);
const gaps = []; for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i - 1]);
const sorted = [...gaps].sort((a, b) => a - b);
const q = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))].toFixed(1) : "-");
console.log(`${base} cpu ${throttle}x: ${ts.length} frames shown over ${t1 - t0} ms (~${Math.round((1000 * ts.length) / (t1 - t0))} fps), median gap ${q(0.5)} ms, p90 ${q(0.9)}, >25 ms: ${gaps.filter((g) => g > 25).length}, >50: ${gaps.filter((g) => g > 50).length}, >100: ${gaps.filter((g) => g > 100).length}, longest ${sorted.slice(-4).map((g) => g.toFixed(0)).join(",")}`);
console.log("states:", (await page.evaluate(() => window.__st)).map(([t, v]) => `${t}ms ${v}`).join(" | "));
await browser.close();
