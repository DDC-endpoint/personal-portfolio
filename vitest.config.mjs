import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests cover the pure lib/ modules only — components are exercised
// end-to-end by Playwright (e2e/).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.js"], environment: "node", globals: true },
});
