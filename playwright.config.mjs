import { defineConfig, devices } from "@playwright/test";

// Runs against `next dev` (reused if already up). Never point this at a
// production build while dev is running — they share .next.
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/warmup.js",
  timeout: 30_000,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
  ],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
