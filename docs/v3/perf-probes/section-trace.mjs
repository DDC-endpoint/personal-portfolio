// Timeline trace of a scroll through one section on the USB phone: main-thread
// self time by event (style, layout, paint, script by function), raster and GPU
// time, and presented frames. usage: node section-trace.mjs <base> <path> <selector> [drags=8] [label]
// CSS="…" injects overrides for isolation.
import { chromium } from "@playwright/test";

const [baseA, path = "/", sel = "[data-decode]", dragsA = "8", label = ""] = process.argv.slice(2);
const base = baseA.replace(/\/$/, ""), drags = +dragsA;
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
if (process.env.CSS) await page.addInitScript((css) => { const add = () => { const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st); }; if (document.readyState !== "loading") add(); else document.addEventListener("DOMContentLoaded", add); }, process.env.CSS);
await page.addInitScript(() => { window.__dec = []; new MutationObserver((ms) => { for (const m of ms) window.__dec.push(m.target.dataset.decode); }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-decode"] }); });
await page.goto(base + path, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(1500);
// Start one screen above the section.
await page.evaluate((s) => { const el = document.querySelector(s); const y = el.getBoundingClientRect().top + scrollY - innerHeight; scrollTo(0, Math.max(0, y)); }, sel);
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
const b = await browser.newBrowserCDPSession();
const chunks = [];
b.on("Tracing.dataCollected", (e) => chunks.push(...e.value));
const done = new Promise((r) => b.on("Tracing.tracingComplete", r));
await b.send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "viz", "cc", "gpu", "blink", "v8.execute", "__metadata"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
await page.waitForTimeout(400);
const t0 = Date.now();
for (let k = 0; k < drags; k++) {
  const x = Math.round(vp.w * 0.06), y0 = Math.round(vp.h * 0.8), dy = (vp.h * 0.45) / 24;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 24; i++) { await new Promise((r) => setTimeout(r, 16)); await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: Math.round(y0 - i * dy) }] }); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1100);
}
const wall = Date.now() - t0;
await b.send("Tracing.end");
await done;
const dec = await page.evaluate(() => window.__dec.join(","));

// Threads by name.
const tname = new Map();
for (const e of chunks) if (e.ph === "M" && e.name === "thread_name") tname.set(`${e.pid}:${e.tid}`, e.args.name);
const pagePid = chunks.find((e) => e.name === "TracingStartedInBrowser")?.args?.data?.frames?.[0]?.processId;
// Self time per thread group and event name (X events nest per thread).
const by = new Map(), add = (k, v) => by.set(k, (by.get(k) || 0) + v);
const perThread = new Map();
for (const e of chunks) if (e.ph === "X" && e.dur != null) { const k = `${e.pid}:${e.tid}`; (perThread.get(k) || perThread.set(k, []).get(k)).push(e); }
for (const [k, evs] of perThread) {
  const tn = tname.get(k) || "?";
  const group = /CrRendererMain/.test(tn) ? "main" : /Compositor$/.test(tn) ? "compositor" : /Raster|CompositorTileWorker/.test(tn) ? "raster" : /CrGpuMain|VizCompositor|GpuMain/.test(tn) ? "gpu/viz" : null;
  if (!group) continue;
  evs.sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  const stack = [];
  for (const e of evs) {
    while (stack.length && stack.at(-1).ts + stack.at(-1).dur <= e.ts) stack.pop();
    if (stack.length) stack.at(-1).child += e.dur;
    e.child = 0;
    stack.push(e);
  }
  for (const e of evs) {
    let name = e.name;
    if (name === "FunctionCall" || name === "EvaluateScript") { const d = e.args?.data || {}; name += ` ${d.functionName || ""} ${(d.url || "").split("/").pop()}:${d.lineNumber ?? ""}:${d.columnNumber ?? ""}`; }
    add(`${group}\t${name}`, (e.dur - e.child) / 1000);
  }
}
const groups = {};
for (const [k, v] of by) { const [g] = k.split("\t"); groups[g] = (groups[g] || 0) + v; }
console.log(`${label} ${base}${path} ${sel}: ${drags} drags, ${wall} ms; decodes: ${dec.split(",").filter((s) => s === "decoding").length}`);
console.log("self ms by thread:", Object.entries(groups).map(([g, v]) => `${g} ${Math.round(v)}`).join(", "));
for (const g of ["main", "raster", "gpu/viz", "compositor"]) {
  const top = [...by.entries()].filter(([k]) => k.startsWith(g + "\t")).sort((a, b) => b[1] - a[1]).slice(0, g === "main" ? 14 : 5);
  console.log(`-- ${g}`); for (const [k, v] of top) console.log(`${v.toFixed(0).padStart(7)}  ${k.split("\t")[1]}`);
}
const fr = chunks.filter((e) => e.name === "Display::FrameDisplayed").map((e) => e.ts / 1000).sort((a, b) => a - b);
const gaps = []; for (let i = 1; i < fr.length; i++) gaps.push(fr[i] - fr[i - 1]);
console.log(`presented: ${fr.length}, gaps 34-50: ${gaps.filter((g) => g > 34 && g <= 50).length}, 50-100: ${gaps.filter((g) => g > 50 && g <= 100).length} (idle pauses excluded >100: ${gaps.filter((g) => g > 100).length})`);
await browser.close().catch(() => {});
