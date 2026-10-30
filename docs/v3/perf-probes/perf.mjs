// Frame times on this machine's real GPU through the first load and one page
// change. usage: node perf.mjs <base-url> [cpuThrottle] [headed]
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "https://damiandc.com").replace(/\/$/, "");
const throttle = Number(process.argv[3] || 1);
const headed = process.argv[4] === "headed";
const browser = await chromium.launch({ channel: "chromium",
  headless: !headed,
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"],
});
const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1.25 });
await ctx.addInitScript(() => {
  window.__frames = [];
  const loop = (t) => { window.__frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__loaf = [];
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__loaf.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), block: Math.round(e.blockingDuration), scripts: e.scripts.slice(0, 3).map((s) => `${s.invoker || s.name} ${Math.round(s.duration)}ms ${(s.sourceURL || "").split("/").pop()}:${s.sourceFunctionName || ""}`) });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch {}
});
if (process.env.CSS) await ctx.addInitScript((css) => { const add = () => { const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st); }; if (document.readyState !== "loading") add(); else document.addEventListener("DOMContentLoaded", add); }, process.env.CSS);
console.log("CSS override:", process.env.CSS || "none");
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
const gpu = await (async () => {
  const p = await browser.newPage();
  await p.goto("about:blank");
  const r = await p.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "no webgl";
  });
  await p.close();
  return r;
})();
console.log("GPU:", gpu, "throttle:", throttle);

function summarise(label, frames, from, to) {
  const f = frames.filter((t) => t >= from && t <= to);
  const d = [];
  for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  if (!d.length) return console.log(label, "no frames");
  d.sort((a, b) => a - b);
  const q = (p) => d[Math.min(d.length - 1, Math.floor(p * d.length))].toFixed(1);
  const over = d.filter((x) => x > 25).length;
  const worst = d.slice(-5).map((x) => x.toFixed(0)).join(",");
  console.log(`${label}: ${d.length} frames over ${((to - from) / 1000).toFixed(2)}s, ~${(1000 * d.length / (to - from)).toFixed(0)} fps, median ${q(0.5)}ms p90 ${q(0.9)}ms, >25ms: ${over}, worst ${worst}`);
}

await page.goto(base + "/", { waitUntil: "commit", timeout: 90000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 90000 }).catch(() => console.log("curtain never idle"));
await page.waitForTimeout(2500);
let frames = await page.evaluate(() => window.__frames);
summarise("first load (all)", frames, frames[0], frames.at(-1));
let loaf = await page.evaluate(() => window.__loaf);
console.log("long frames on first load:", loaf.length);
for (const l of loaf.sort((a, b) => b.dur - a.dur).slice(0, 6)) console.log("  ", JSON.stringify(l));

// idle on the hero (portrait idle loop)
let t = await page.evaluate(() => performance.now());
await page.waitForTimeout(3000);
frames = await page.evaluate(() => window.__frames);
summarise("hero idle", frames, t, t + 3000);

// one page change
await page.evaluate(() => (window.__loaf = []));
t = await page.evaluate(() => performance.now());
await page.click('header a[href="/services"]');
await page.waitForURL("**/services");
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 90000 }).catch(() => console.log("curtain never idle"));
const t2 = await page.evaluate(() => performance.now());
frames = await page.evaluate(() => window.__frames);
summarise("page change → /services", frames, t, t2);
loaf = await page.evaluate(() => window.__loaf);
for (const l of loaf.sort((a, b) => b.dur - a.dur).slice(0, 6)) console.log("  ", JSON.stringify(l));

// and back to Home
await page.evaluate(() => (window.__loaf = []));
t = await page.evaluate(() => performance.now());
await page.click('header a[href="/"]');
await page.waitForURL(base + "/");
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 90000 }).catch(() => console.log("curtain never idle"));
await page.waitForTimeout(2500);
const t3 = await page.evaluate(() => performance.now());
frames = await page.evaluate(() => window.__frames);
summarise("page change → Home (+wave)", frames, t, t3);
loaf = await page.evaluate(() => window.__loaf);
for (const l of loaf.sort((a, b) => b.dur - a.dur).slice(0, 6)) console.log("  ", JSON.stringify(l));
await browser.close();
