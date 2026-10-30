// Frame-matched screenshots of a page change on two builds, under a fake
// clock, then a pixel diff of each pair. usage: node curtain-diff.mjs <urlA> <urlB> <outdir>
import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("sharp");
import { mkdirSync } from "node:fs";

const [A, B, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
// Moments after the click, in ms (cover 0.7 s + stagger 0.24, hold 0.22, lift 0.85 + stagger).
const MOMENTS = [150, 300, 450, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200];

const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function capture(base, tag, dark) {
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1, colorScheme: dark ? "dark" : "light" });
  const page = await ctx.newPage();
  await page.goto(base + "/services", { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // From here on, time is ours: every frame is 16 ms, on both builds.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 5000);
  await page.evaluate(() => document.querySelector('header a[href="/"]').click());
  let at = 0;
  const files = [];
  for (const m of MOMENTS) {
    await page.clock.runFor(m - at);
    at = m;
    // let the frame paint
    await page.waitForTimeout(80);
    const f = `${out}/${tag}-${dark ? "dark" : "light"}-${String(m).padStart(4, "0")}.png`;
    await page.screenshot({ path: f });
    files.push(f);
  }
  await ctx.close();
  return files;
}

async function diff(a, b) {
  const [ia, ib] = await Promise.all([a, b].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const da = ia.data, db = ib.data;
  let px = 0, max = 0;
  for (let i = 0; i < da.length; i += ia.info.channels) {
    const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
    if (d) { px++; if (d > max) max = d; }
  }
  return { px, max, total: da.length / ia.info.channels };
}

for (const dark of [false, true]) {
  const fa = await capture(A, "a", dark), fb = await capture(B, "b", dark);
  for (let i = 0; i < fa.length; i++) {
    const d = await diff(fa[i], fb[i]);
    console.log(`${dark ? "dark " : "light"} t=${MOMENTS[i]}ms  differing px ${d.px} (${((100 * d.px) / d.total).toFixed(2)}%)  max ${d.max}`);
  }
}
await browser.close();
