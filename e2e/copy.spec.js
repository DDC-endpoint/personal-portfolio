import { test, expect } from "@playwright/test";

// Home copy from docs/v3/copy.md, verbatim. Once SplitLines has split a
// heading, its text is an sr-only copy plus aria-hidden word spans: read the
// sr-only copy. Otherwise innerText, so inline-block words keep their spaces.
const text = (loc) =>
  loc.evaluate((el) => {
    const sr = el.querySelector(":scope > .sr-only");
    return (sr ? sr.textContent : el.innerText).replace(/\s+/g, " ").trim();
  });

test("About, Leadership, Résumé and footer carry the approved copy", async ({ page }) => {
  await page.goto("/");

  const statement = page.locator("#about p").first();
  expect(await text(statement)).toBe(
    "I’m Damian, a creative technologist and freelance web designer in Colombo, in my second year of BSc (Hons) Computer Science at the Informatics Institute of Technology."
  );
  // Split words each carry the italic class, so join every italic run.
  const italic = await statement.locator(".italic").evaluateAll((els) => els.map((e) => e.textContent).join(" "));
  for (const phrase of ["creative technologist", "BSc (Hons) Computer Science", "Informatics Institute of Technology"]) {
    expect(italic.replace(/\s+/g, " ")).toContain(phrase);
  }

  expect(await text(page.locator("#about h3", { hasText: "What I build" }).locator("+ p"))).toBe(
    "Small, sharp websites for businesses and creatives in Colombo and beyond, plus my own tools and generative experiments. Most of it sits at the edge of software and design."
  );
  expect(await text(page.locator("#about h3", { hasText: "How I work" }).locator("+ p"))).toBe(
    "Quietly obsessive about details, and fast. Most client sites go from brief to live in a couple of days. I learn fastest by shipping, and I’m always open to projects worth building."
  );
  expect(await text(page.locator("p", { hasText: "council room" }))).toBe(
    "Before the code, there was the council room. Years of student leadership and Rotary Interact service taught me how to organise people, run projects and deliver them for a community."
  );
  expect(await text(page.locator("#resume p"))).toBe("Education, coursework and current pursuits, on a single page.");

  const footer = page.locator("footer");
  await expect(footer).toContainText("© 2026 Damian De Cruz");
  await expect(footer).toContainText("v:04 / Always evolving");
  await expect(footer).not.toContainText("—");
});
