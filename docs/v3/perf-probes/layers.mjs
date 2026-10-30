// What gets rasterised during a page change, per compositor layer: the
// trace's RasterTask events (cc), counted and timed by layer. A picture drawn
// once and moved by the compositor rasters once; a layer whose content
// changes every frame rasters every frame. usage:
// node layers.mjs <base-url> [width height dpr]   (CPU=4 throttles the CPU)
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3104").replace(/\/$/, "");
const [w, h, dpr] = [Number(process.argv[3] || 1536), Number(process.argv[4] || 864), Number(process.argv[5] || 1.25)];
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
await page.goto(base + "/", { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
await page.waitForTimeout(1500);
// Layer sizes (CSS px), from the LayerTree domain, keyed by cc layer id.
const pc = await page.context().newCDPSession(page);
const sizes = new Map(), nodes = new Map();
pc.on("LayerTree.layerTreeDidChange", (e) => { for (const l of e.layers || []) { sizes.set(String(l.layerId), `${Math.round(l.width)}×${Math.round(l.height)}`); if (l.backendNodeId) nodes.set(String(l.layerId), l.backendNodeId); } });
await pc.send("LayerTree.enable");
const b = await browser.newBrowserCDPSession();
const ev = [];
b.on("Tracing.dataCollected", (e) => ev.push(...e.value));
const done = new Promise((r) => b.on("Tracing.tracingComplete", r));
await b.send("Tracing.start", { traceConfig: { includedCategories: ["cc", "disabled-by-default-cc.debug", "disabled-by-default-devtools.timeline", "benchmark"], excludedCategories: ["*"] }, transferMode: "ReportEvents" });
await page.waitForTimeout(200);
const t0 = Date.now();
await page.evaluate(() => document.querySelector('header nav a[href="/services"]').click());
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle" && location.pathname === "/services", null, { timeout: 30000 });
const ms = Date.now() - t0;
await b.send("Tracing.end");
await done;
const names = new Map();
for (const [id, nodeId] of nodes) {
  try {
    const { node } = await pc.send("DOM.describeNode", { backendNodeId: nodeId });
    const a = node.attributes || [], at = {};
    for (let i = 0; i < a.length; i += 2) at[a[i]] = a[i + 1];
    const keys = Object.keys(at).filter((k) => k.startsWith("data-")).map((k) => (at[k] ? `${k}=${at[k]}` : k));
    names.set(id, `${node.localName}${keys.length ? "[" + keys.join(" ") + "]" : ""}${!keys.length && at.class ? "." + at.class.split(" ")[0] : ""}`);
  } catch {}
}
const raster = ev.filter((e) => e.name === "RasterTask" && e.ph === "X");
const byLayer = new Map();
for (const e of raster) {
  const id = e.args?.tileData?.layerId ?? "?";
  const r = byLayer.get(id) || { n: 0, dur: 0 };
  r.n++; r.dur += (e.dur || 0) / 1000;
  byLayer.set(id, r);
}
const total = raster.reduce((s, e) => s + (e.dur || 0), 0) / 1000;
console.log(`${ms} ms change: ${raster.length} raster tasks, ${total.toFixed(1)} ms raster, ${byLayer.size} layers`);
for (const [id, r] of [...byLayer.entries()].sort((a, c) => c[1].dur - a[1].dur).slice(0, Number(process.env.TOP || 12))) console.log(`  layer ${id} (${sizes.get(String(id)) || "?"} ${names.get(String(id)) || ""}): ${r.n} tiles, ${r.dur.toFixed(1)} ms`);
if (process.env.DUMP) console.log(JSON.stringify(raster.slice(0, 2).map((e) => e.args)));
if (!raster.length) console.log("event names:", [...new Set(ev.map((e) => e.name))].filter((n) => /Raster|Paint|Tile/i.test(n)).join(", "));
await browser.close();
