// Presented frames on the USB phone during a page change, from a Chrome
// trace (the viz/GPU process's own swap events, independent of the
// renderer's main thread). usage: node phone-trace.mjs <base-url>
// FROM=/ TO=/services (the defaults) pick the change; it goes through the menu.
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
if (process.env.CSS) await ctx.addInitScript((css) => { const add = () => { const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st); }; if (document.readyState !== "loading") add(); else document.addEventListener("DOMContentLoaded", add); }, process.env.CSS);
console.log("CSS:", process.env.CSS || "none");
const FROM = process.env.FROM || "/", TO = process.env.TO || "/services";
await page.goto(base + FROM, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.evaluate(() => document.querySelector("button[aria-label='Open menu']")?.click());
await page.waitForTimeout(800);
const b = await browser.newBrowserCDPSession();
const chunks = [];
b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
const done = new Promise((r) => b.on("Tracing.tracingComplete", r));
await b.send("Tracing.start", { traceConfig: { includedCategories: ["viz", "benchmark", "disabled-by-default-devtools.timeline.frame", "gpu"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
await page.waitForTimeout(300);
const t0 = Date.now();
await page.evaluate((to) => { window.__st = []; window.__t0 = Date.now(); new MutationObserver(() => window.__st.push([Date.now() - window.__t0, document.querySelector("[data-curtain]").dataset.curtain])).observe(document.querySelector("[data-curtain]"), { attributes: true, attributeFilter: ["data-curtain"] }); document.querySelector(`[role=dialog] a[href='${to}']`)?.click(); }, TO);
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
const t1 = Date.now();
await page.waitForTimeout(200);
await b.send("Tracing.end");
await done;
// which events look like presented frames: count names in the GPU/viz process
const names = new Map();
for (const e of chunks) if (e.ph === "X" || e.ph === "I" || e.ph === "i") names.set(e.name, (names.get(e.name) || 0) + 1);
const candidates = [...names.entries()].filter(([n]) => /DrawAndSwap|SwapBuffers|FrameDisplayed|DrawFrame|PresentFrame|Display::|SubmitCompositorFrame|DidReceiveSwapBuffersAck/i.test(n)).sort((a, b) => b[1] - a[1]);
console.log("candidate frame events:", candidates.slice(0, 8).map(([n, c]) => `${n} ×${c}`).join(" | "));
// trace ts is µs from an arbitrary origin; the change window is the trace's span minus the setup
const all = chunks.filter((e) => e.ts).map((e) => e.ts);
const tMin = Math.min(...all), tMax = Math.max(...all);
const windowStart = tMax - (t1 - t0 + 200) * 1000; // the last (change + 200 ms) of the trace
for (const [name] of candidates.slice(0, 3)) {
  const ts = chunks.filter((e) => e.name === name && e.ts >= windowStart && e.ts <= tMax - 200 * 1000).map((e) => e.ts / 1000).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i - 1]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))].toFixed(1) : "-");
  console.log(`${name}: ${ts.length} over ${t1 - t0} ms (~${Math.round((1000 * ts.length) / (t1 - t0))} fps), median gap ${q(0.5)} ms, p90 ${q(0.9)}, >25 ms: ${gaps.filter((g) => g > 25).length}, >50: ${gaps.filter((g) => g > 50).length}, >100: ${gaps.filter((g) => g > 100).length}, longest ${sorted.slice(-4).map((g) => g.toFixed(0)).join(",")}`);
}
console.log("states:", (await page.evaluate(() => window.__st)).map(([t, v]) => `${t}ms ${v}`).join(" | "));
{ const name = "Display::FrameDisplayed"; const ts = chunks.filter((e) => e.name === name && e.ts >= windowStart).map((e) => e.ts / 1000).sort((a, b) => a - b); const t00 = tMax / 1 - (t1 - t0 + 200); const big = []; for (let i = 1; i < ts.length; i++) if (ts[i] - ts[i - 1] > 50) big.push(`${Math.round(ts[i - 1] / 1 - windowStart / 1000)}→${Math.round(ts[i] - windowStart / 1000)}ms`); console.log("gaps >50 ms at (ms after the click):", big.join(", ")); }
await browser.close();
