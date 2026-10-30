// The first load's intro on a slow link and a slow CPU, for smoothness: the
// loader's count while the curtain holds, the lift, then the page's
// entrance. Logs when the curtain and the portrait change state, the count
// over time (and whether the 5 s CSS failsafe dissolved the curtain before
// the loader finished), and per phase the frame intervals (rAF) and the
// long animation frames.
// usage: node intro-smooth.mjs <base-url> [phone|desktop] [downKbps=1600] [rttMs=300] [cpu=4]
import { chromium, devices } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3104").replace(/\/$/, "");
const kind = process.argv[3] || "phone";
const down = Number(process.argv[4] || 1600), rtt = Number(process.argv[5] || 300), cpu = Number(process.argv[6] || 4);
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const ctx = await browser.newContext(kind === "phone" ? { ...devices["Pixel 7"] } : { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  const w = (window.__intro = { states: [], counts: [], frames: [], loaf: [], failsafe: null });
  const now = () => Math.round(performance.now());
  new MutationObserver((ms) => {
    for (const m of ms) {
      const el = m.target;
      if (el.matches?.("[data-curtain]") && m.attributeName === "data-curtain") w.states.push([now(), "curtain", el.dataset.curtain]);
      if (el.matches?.("[data-portrait]") && m.attributeName === "data-state") w.states.push([now(), "portrait", el.dataset.state]);
      if (el.matches?.(".morph-loader") && m.attributeName === "data-phase") w.states.push([now(), "loader", el.dataset.phase]);
    }
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-curtain", "data-state", "data-phase"] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.loaf.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
  let last = 0, shown = "";
  const tick = (t) => {
    if (last) w.frames.push([Math.round(t), +(t - last).toFixed(1)]);
    last = t;
    const c = document.querySelector("[data-count]")?.textContent ?? "";
    if (c !== shown) w.counts.push([now(), (shown = c)]);
    const cur = document.querySelector("[data-curtain]");
    if (cur && w.failsafe === null && cur.dataset.curtain === "intro" && getComputedStyle(cur).visibility === "hidden") w.failsafe = now();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: rtt, downloadThroughput: (down * 1000) / 8, uploadThroughput: (750 * 1000) / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
await page.goto(base + "/", { waitUntil: "commit", timeout: 120000 });
// Until the curtain has lifted and the entrance has had 3 s, or 40 s.
await page.waitForFunction(() => window.__intro?.states.some(([, k, v]) => k === "curtain" && v === "idle"), null, { timeout: 40000, polling: 250 }).catch(() => {});
await page.waitForTimeout(3000);
const r = await page.evaluate(() => window.__intro);
const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
console.log(`${kind}, ${down} kbps / ${rtt} ms rtt, CPU ${cpu}× — ${base}`);
console.log("nav:", JSON.stringify(nav), "| failsafe dissolved the curtain at:", r.failsafe ?? "never");
console.log("states:", r.states.map(([t, k, v]) => `${t} ${k}=${v}`).join(" | "));
const counts = r.counts.filter(([, c]) => c !== "");
console.log("count:", counts.length ? `${counts[0][1]} at ${counts[0][0]} → ${counts.at(-1)[1]} at ${counts.at(-1)[0]} ms, ${counts.length} steps` : "never shown");
const at = (k, v) => r.states.find(([, kk, vv]) => kk === k && vv === v)?.[0];
const lift = at("curtain", "lifting"), idle = at("curtain", "idle"), firstCount = counts.find(([, c]) => c !== "0")?.[0];
const phases = [
  ["loading (count rising → lift)", firstCount ?? 0, lift ?? Infinity],
  ["lift (lifting → idle)", lift ?? Infinity, idle ?? Infinity],
  ["entrance (idle → +2.5 s)", idle ?? Infinity, (idle ?? Infinity) + 2500],
];
for (const [name, a, b] of phases) {
  const f = r.frames.filter(([t]) => t > a && t <= b).map(([, d]) => d);
  if (!f.length) { console.log(`  ${name}: no frames`); continue; }
  const s = [...f].sort((x, y) => x - y), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const lo = r.loaf.filter(([t]) => t > a && t <= b);
  console.log(`  ${name}: ${f.length} frames over ${Math.round(b === Infinity ? 0 : Math.min(b, r.frames.at(-1)[0]) - a)} ms, median ${q(0.5)} ms, p95 ${q(0.95)}, >34 ms: ${f.filter((d) => d > 34).length}, >50: ${f.filter((d) => d > 50).length}, longest ${s.slice(-3).join(",")}; long frames ${lo.length} (${lo.map(([, d]) => d).sort((x, y) => y - x).slice(0, 4).join(",")} ms)`);
}
await browser.close();
