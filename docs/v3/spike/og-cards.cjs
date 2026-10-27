// Renders the share cards in og-cards.html to public/og.jpg and
// public/og-services.jpg (lib/shareImages.js). Needs the spike server
// (node docs/v3/spike/serve.cjs) on :3200. Run from the repo root:
// node docs/v3/spike/og-cards.cjs
const path = require("path");

(async () => {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const out = {
    home: "public/og.jpg",
    services: "public/og-services.jpg",
  };
  for (const [card, file] of Object.entries(out)) {
    await page.goto(`http://localhost:3200/og-cards.html?card=${card}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(file), type: "jpeg", quality: 88 });
    console.log(file);
  }
  await browser.close();
})();
