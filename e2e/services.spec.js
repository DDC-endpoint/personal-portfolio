import { test, expect } from "@playwright/test";

const squash = (s) => s.replace(/\s+/g, " ").trim();

test("FAQ JSON-LD matches the page", async ({ page }) => {
  await page.goto("/services");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = blocks.map((b) => JSON.parse(b)).find((d) => d["@type"] === "FAQPage");
  expect(faq).toBeTruthy();

  const items = page.locator("#faq details");
  await expect(items).toHaveCount(faq.mainEntity.length);
  for (let i = 0; i < faq.mainEntity.length; i++) {
    // The summary also holds the "+" toggle; the question is its text node.
    const q = await items.nth(i).locator("summary").evaluate((el) => el.firstChild.textContent);
    const a = await items.nth(i).locator("p").textContent();
    expect(faq.mainEntity[i].name).toBe(squash(q));
    expect(faq.mainEntity[i].acceptedAnswer.text).toBe(squash(a));
  }
});
