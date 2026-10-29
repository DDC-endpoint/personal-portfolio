// Real touch gestures on the USB phone (CDP Input.dispatchTouchEvent): a
// quick swipe over the portrait must scroll the page; a held press must
// open the lens and then drag it without scrolling.
// usage: node phone-touch.mjs <base-url>
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3102").replace(/\/$/, "");
const browser = await chromium.connectOverCDP("http://localhost:9222");
const ctx = browser.contexts()[0];
const page = ctx.pages().find((p) => p.url().startsWith("http://localhost")) || (await ctx.newPage());
await page.bringToFront();
await page.goto(base + "/", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => /^(static|skipped)$/.test(document.querySelector("[data-portrait]")?.dataset.state || ""), null, { timeout: 60000 });
await page.waitForTimeout(1500);
const cdp = await ctx.newCDPSession(page);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const face = () => page.evaluate(() => { const b = document.querySelector("[data-portrait]").getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + b.height * 0.38 }; });
const warm = (p) => page.evaluate((p) => {
  const c = document.querySelector("[data-portrait] canvas"), r = c.getBoundingClientRect(), k = c.width / r.width;
  const d = c.getContext("2d").getImageData((p.x - r.left) * k - 5, (p.y - r.top) * k - 5, 10, 10).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i] > d[i + 1] + 10) n++; return n;
}, p);
const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });

// 1. a quick swipe up over the portrait
let p = await face();
console.log("face at", p, "scrollY", await scrollY(), "warm", await warm(p));
await touch("touchStart", p.x, p.y);
for (let i = 1; i <= 6; i++) { await sleep(16); await touch("touchMove", p.x, p.y - i * 25); }
await touch("touchEnd");
await sleep(600);
console.log("after a quick swipe: scrollY", await scrollY(), "(expect > 0)  warm", await warm(p), "(expect 0)");

// 2. back to the top, then a held press, then a drag
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await sleep(800);
p = await face();
await touch("touchStart", p.x, p.y);
await sleep(120);
console.log("120 ms into the press: warm", await warm(p), "(expect 0)");
await sleep(400);
const held = await warm(p);
const y0 = await scrollY();
for (let i = 1; i <= 8; i++) { await sleep(16); await touch("touchMove", p.x + i * 5, p.y); }
await sleep(300);
const dragged = await warm({ x: p.x + 40, y: p.y }); const left = await warm({ x: p.x - 100, y: p.y });
const y1 = await scrollY();
await touch("touchEnd");
await sleep(1000);
console.log(`held 520 ms: warm ${held} (expect > 0); after dragging 40 px right: warm there ${dragged} (expect > 0), 100 px left of the face ${left} (expect 0: outside the lens), scrollY ${y0} → ${y1} (expect unchanged); after lifting: warm ${await warm({ x: p.x + 40, y: p.y })} (expect 0)`);
await browser.close();
