// CPU profile of a page change on the USB phone: self time by function.
// usage: node phone-profile.mjs <base-url> <from-path> <to-link-href>
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const from = process.argv[3] || "/", to = process.argv[4] || "/services";
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
await page.goto(base + from, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(3000);
const cdp = await ctx.newCDPSession(page);
await cdp.send("Profiler.enable");
await cdp.send("Profiler.setSamplingInterval", { interval: 250 });
await page.evaluate(() => document.querySelector("button[aria-label='Open menu']")?.click());
await page.waitForTimeout(700);
await cdp.send("Profiler.start");
const t0 = await page.evaluate(() => performance.now());
await page.evaluate((to) => document.querySelector(`[role=dialog] a[href='${to}']`)?.click(), to);
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
const t1 = await page.evaluate(() => performance.now());
const { profile } = await cdp.send("Profiler.stop");
// self time per node
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas;
for (let i = 0; i < profile.samples.length; i++) {
  const n = byId.get(profile.samples[i]);
  const cf = n.callFrame;
  const key = `${cf.functionName || "(anon)"} ${(cf.url || "").split("/").pop().slice(0, 22)}:${cf.lineNumber}:${cf.columnNumber}`;
  self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log(`${from} → ${to}: ${Math.round(t1 - t0)} ms wall, ${Math.round(total)} ms sampled`);
for (const [k, v] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28)) console.log(`${v.toFixed(1).padStart(7)} ms  ${k}`);
// inclusive time for a few interesting names
const parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const incl = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  let id = profile.samples[i];
  const seen = new Set();
  while (id) {
    const cf = byId.get(id).callFrame;
    const key = `${cf.functionName || "(anon)"} ${(cf.url || "").split("/").pop().slice(0, 22)}:${cf.lineNumber}:${cf.columnNumber}`;
    if (!seen.has(key)) { incl.set(key, (incl.get(key) || 0) + (dt[i] || 0) / 1000); seen.add(key); }
    id = parent.get(id);
  }
}
console.log("--- inclusive, top 20 ---");
for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`${v.toFixed(1).padStart(7)} ms  ${k}`);
await browser.close();
