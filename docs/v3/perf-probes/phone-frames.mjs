// Presented frames on the USB phone during a page change, from Chrome's
// screencast (fed by the compositor, so it keeps counting while the main
// thread is stalled, unlike requestAnimationFrame). usage: node phone-frames.mjs <base-url>
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
await page.waitForTimeout(2500);
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", (e) => {
  frames.push(e.metadata.timestamp * 1000);
  cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 20, maxWidth: 120, maxHeight: 240, everyNthFrame: 1 });
await page.evaluate(() => document.querySelector("button[aria-label='Open menu']")?.click());
await page.waitForTimeout(800);
const t0 = Date.now();
const marks = [];
await page.evaluate(() => {
  window.__st = [];
  new MutationObserver(() => window.__st.push([Date.now(), document.querySelector("[data-curtain]").dataset.curtain])).observe(document.querySelector("[data-curtain]"), { attributes: true, attributeFilter: ["data-curtain"] });
  document.querySelector("[role=dialog] a[href='/services']")?.click();
});
await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
const t1 = Date.now();
await cdp.send("Page.stopScreencast");
const st = await page.evaluate(() => window.__st);
// frame timestamps are in the page's wall clock; the change window is [t0, t1]
const f = frames.filter((t) => t >= t0 - 50 && t <= t1 + 50).sort((a, b) => a - b);
const gaps = [];
for (let i = 1; i < f.length; i++) gaps.push(f[i] - f[i - 1]);
gaps.sort((a, b) => a - b);
const q = (p) => (gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))].toFixed(0) : "-");
const over = (ms) => gaps.filter((g) => g > ms).length;
console.log(`${base}: page change ${t1 - t0} ms, ${f.length} presented frames (~${Math.round((1000 * f.length) / (t1 - t0))} fps), median gap ${q(0.5)} ms, p90 ${q(0.9)}, gaps >25 ms: ${over(25)}, >50: ${over(50)}, >100: ${over(100)}, longest ${gaps.slice(-4).map((g) => g.toFixed(0)).join(",")}`);
console.log("states:", st.map(([t, s]) => `${t - t0}ms ${s}`).join(" | "));
// where the longest gaps fall
const big = [];
for (let i = 1; i < f.length; i++) if (f[i] - f[i - 1] > 50) big.push(`${Math.round(f[i - 1] - t0)}→${Math.round(f[i] - t0)}ms`);
console.log("gaps >50 ms at:", big.join(", ") || "none");
await browser.close();
