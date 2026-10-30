// Drives Chrome on the USB phone over CDP (adb forward tcp:9222
// localabstract:chrome_devtools_remote; adb reverse tcp:<port> tcp:<port>).
// usage: node phone.mjs <base-url> <outdir>
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const out = process.argv[3] || ".";
mkdirSync(out, { recursive: true });
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
let page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
await page.addInitScript(() => {
  window.__t = [];
  new MutationObserver((ms) => {
    for (const m of ms) {
      const el = m.target;
      if (el.matches?.("[data-curtain]") && m.attributeName === "data-curtain") window.__t.push([Math.round(performance.now()), "curtain", el.dataset.curtain]);
      if (el.matches?.("[data-portrait]") && m.attributeName === "data-state") window.__t.push([Math.round(performance.now()), "portrait", el.dataset.state]);
    }
  }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-curtain", "data-state"] });
  // The clip-path and the screen at the moment the curtain is fully down.
  window.__probeCover = () => {
    const p = document.querySelector('[data-panel="2"]');
    const r = p.getBoundingClientRect();
    const e = p.querySelector('[data-end-over="bottom"]');
    const m = e.querySelector("[data-end-shape]").style.clipPath.match(/L [\d.]+ ([\d.]+) Q/);
    const bot = m ? new DOMMatrix(getComputedStyle(e).transform).m42 + Number(m[1]) : NaN;
    return { innerHeight: innerHeight, cssVh: +(r.height / 1.3).toFixed(1), panelTop: +r.top.toFixed(1), clipBottomOnScreen: +(r.top + bot).toFixed(1), clientHeight: document.documentElement.clientHeight, gap: +(innerHeight - (r.top + bot)).toFixed(1) };
  };
});
console.log("visible:", await page.evaluate(() => document.visibilityState)); console.log("phone:", await browser.version(), "ua:", (await page.evaluate(() => navigator.userAgent)).slice(0, 60));
await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(9000);
const info = await page.evaluate(() => ({
  dpr: devicePixelRatio, innerW: innerWidth, innerH: innerHeight,
  portrait: document.querySelector("[data-portrait]")?.dataset.state,
  label: document.querySelector("[data-portrait-label]")?.textContent,
  curtain: document.querySelector("[data-curtain]")?.dataset.curtain,
  fonts: [...document.fonts].filter((f) => /JetBrains/.test(f.family)).map((f) => `${f.family} ${f.weight} ${f.status}`),
  timeline: window.__t,
}));
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: `${out}/phone-home.png` });
// A page change, probed at full cover (hold is 220 ms: poll fast).
await page.evaluate(() => { window.__cover = null; });
await page.evaluate(() => {
  new MutationObserver(() => { const c = document.querySelector("[data-curtain]")?.dataset.curtain; if (c === "covered" && !window.__cover) window.__cover = window.__probeCover(); }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-curtain"] });
  document.querySelector("button[aria-label='Open menu']")?.click();
});
await page.waitForTimeout(600);
const shotP = page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "covered", null, { timeout: 8000 }).then(() => page.screenshot({ path: `${out}/phone-covered.png` })).catch(() => {});
await page.evaluate(() => document.querySelector("[role=dialog] a[href='/services']")?.click());
await shotP;
await page.waitForTimeout(3000);
console.log("at cover:", JSON.stringify(await page.evaluate(() => window.__cover)));
console.log("timeline:", JSON.stringify(await page.evaluate(() => window.__t)));
await browser.close();
