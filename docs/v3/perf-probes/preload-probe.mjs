import { chromium } from "@playwright/test";
const base = process.argv[2] || "http://localhost:3000";
const b = await chromium.launch();
for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const p = await b.newPage({ viewport: vp });
  const hits = [];
  p.on("request", (r) => { if (/portrait\.webp/.test(r.url())) hits.push({ t: Date.now(), type: r.resourceType() }); });
  const t0 = Date.now();
  await p.goto(base + "/", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  const entries = await p.evaluate(() => performance.getEntriesByType("resource").filter((e) => /portrait\.webp/.test(e.name)).map((e) => ({ init: e.initiatorType, start: Math.round(e.startTime), dur: Math.round(e.duration), xfer: e.transferSize })));
  console.log(vp.width, "requests:", hits.map((h) => `${h.t - t0}ms ${h.type}`).join(", "), "| entries:", JSON.stringify(entries));
  await p.close();
}
await b.close();
