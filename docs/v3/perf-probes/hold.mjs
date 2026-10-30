import { chromium } from "@playwright/test";
const [base, cpu = "1"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chromium", args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
for (const [from, to] of [["/services", "/"], ["/", "/services"], ["/services", "/portfolio"]]) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(base + from, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: +cpu });
  await page.evaluate(() => {
    window.__st = []; const t0 = performance.now(); let last = t0; window.__fr = [];
    const c = document.querySelector("[data-curtain]");
    new MutationObserver(() => window.__st.push([Math.round(performance.now() - t0), c.dataset.curtain])).observe(c, { attributes: true, attributeFilter: ["data-curtain"] });
    const f = (now) => { window.__fr.push([Math.round(now - t0), Math.round(now - last)]); last = now; if (now - t0 < 4000) requestAnimationFrame(f); }; requestAnimationFrame(f);
  });
  await page.evaluate((h) => document.querySelector(`header nav a[href="${h}"]`).click(), to);
  await page.waitForFunction(() => document.querySelector("[data-curtain]")?.dataset.curtain === "idle", null, { timeout: 30000 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ st: window.__st, fr: window.__fr }));
  const cov = r.st.find((s) => s[1] === "covered")?.[0], lif = r.st.find((s) => s[1] === "lifting")?.[0];
  const hold = r.fr.filter(([t]) => t > cov && t < lif).map(([, d]) => d);
  console.log(`${from} → ${to} cpu×${cpu}: covered ${cov} lifting ${lif} hold ${lif - cov} ms; frame gaps in hold: ${hold.join(" ")}`);
  await ctx.close();
}
await browser.close();
