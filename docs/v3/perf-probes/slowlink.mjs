// A phone-emulated first load over a slow link: when each request starts
// and ends, and when the curtain and the portrait change state.
// usage: node slowlink.mjs <base-url> [downKbps=1600] [rttMs=300] [cpu=4]
import { chromium, devices } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const down = Number(process.argv[3] || 1600), rtt = Number(process.argv[4] || 300), cpu = Number(process.argv[5] || 4);
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(() => {
  window.__t = [];
  const mark = (k, v) => window.__t.push([Math.round(performance.now()), k, v]);
  new MutationObserver((ms) => {
    for (const m of ms) {
      const el = m.target;
      if (el.matches?.("[data-curtain]") && m.attributeName === "data-curtain") mark("curtain", el.dataset.curtain);
      if (el.matches?.("[data-portrait]") && m.attributeName === "data-state") mark("portrait", el.dataset.state);
      if (el === document.documentElement && m.attributeName === "data-transitions") mark("transitions", el.dataset.transitions);
    }
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-curtain", "data-state", "data-transitions"] });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: rtt, downloadThroughput: (down * 1000) / 8, uploadThroughput: (750 * 1000) / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
const reqs = [];
page.on("request", (r) => reqs.push({ url: r.url(), start: Date.now(), r }));
page.on("requestfinished", (r) => { const e = reqs.find((x) => x.r === r); if (e) e.end = Date.now(); });
page.on("requestfailed", (r) => { const e = reqs.find((x) => x.r === r); if (e) e.end = Date.now(), (e.failed = true); });
const t0 = Date.now();
await page.goto(base + "/", { waitUntil: "commit", timeout: 120000 });
await page.waitForTimeout(25000);
const timeline = await page.evaluate(() => window.__t);
const navStart = await page.evaluate(() => performance.timeOrigin);
console.log(`link: ${down} kbps down, ${rtt} ms rtt, cpu ${cpu}x — ${base}`);
for (const e of reqs) {
  const short = e.url.replace(base, "").replace(/^https?:\/\/[^/]+/, (m) => m).slice(0, 80);
  console.log(`${String(e.start - t0).padStart(6)} → ${String((e.end ?? Date.now()) - t0).padStart(6)} ms ${e.failed ? "FAILED " : ""}${short}`);
}
console.log("states:", timeline.map(([t, k, v]) => `${t}ms ${k}=${v}`).join(" | "));
const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
console.log("nav:", JSON.stringify(nav));
await browser.close();
