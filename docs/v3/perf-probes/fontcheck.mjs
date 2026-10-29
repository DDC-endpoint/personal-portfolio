import { chromium } from "@playwright/test";
const b = await chromium.launch({ channel: "chromium" });
const p = await b.newPage();
await p.setContent(`<style>@font-face{font-family:"Probe Fallback";src:local("NoSuchFontAnywhere")}</style>`);
console.log(await p.evaluate(async () => {
  try { const f = await document.fonts.load('700 6px "Probe Fallback"'); return "resolved " + f.length; }
  catch (e) { return "REJECTED " + e.name + ": " + e.message; }
}));
await b.close();
