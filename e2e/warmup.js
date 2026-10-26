import { chromium } from "@playwright/test";

// next dev compiles routes and chunks on first request. Load the home page
// once before the suite so first-visit timing checks (the loader's 2.5 s
// slow-load cut-off) measure the page, not the compiler.
export default async function warmup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await browser.close();
}
