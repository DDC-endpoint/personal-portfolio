import { test, expect } from "@playwright/test";
import { trackErrors } from "./helpers";

test("home renders with no errors", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Damian");
  expect(errors).toEqual([]);
});
