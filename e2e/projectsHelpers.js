import { progressForCard } from "../lib/strip.js";

// Project cards are [data-card="<index>"]; the end card is [data-end-card].
export const card = (page, i) => page.locator(`[data-card="${i}"]`);
export const endCard = (page) => page.locator("[data-end-card]");
export const decodeState = (loc) => loc.getAttribute("data-decode");
export const CARD_COUNT = 6; // Home's five + the end card

// The decode controller marks each card once React has hydrated, so the
// section's listeners are live from here on.
export const hydrated = (page) => page.locator('[data-card="0"][data-decode]').waitFor({ state: "attached" });

// Track geometry in page coordinates, plus the viewport the strip lays out in.
export const trackInfo = (page) =>
  page.evaluate(() => {
    const t = document.querySelector("[data-strip-track]").getBoundingClientRect();
    return {
      top: t.top + window.scrollY,
      height: t.height,
      vw: document.documentElement.clientWidth,
      vh: window.innerHeight,
    };
  });

// The strip eases after the scroll (lib/strip.js → smoothStep); it marks
// itself settled once the displayed progress has caught up.
export const settled = (page) =>
  page.waitForFunction(() => document.querySelector("[data-strip]")?.dataset.settled !== "false", null, { timeout: 5000 });

// Scrolls the page to pin progress p (0 → 1) and waits for the glide.
// Hydration first: a scroll before it would be snapped to, not glided.
export async function scrollToProgress(page, p) {
  await hydrated(page);
  const { top, height, vh } = await trackInfo(page);
  await page.evaluate((y) => window.scrollTo(0, y), top + p * (height - vh));
  await page.waitForTimeout(50);
  await settled(page);
}

// Scrolls the pinned strip until item i (the end card is CARD_COUNT − 1) is
// centred, or `off` steps past it.
export const scrollToCard = (page, i, off = 0) => scrollToProgress(page, progressForCard(i + off, CARD_COUNT));

// Centre of an element's box on screen.
export const boxCentre = async (loc) => {
  const b = await loc.boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

// Centre of the part of the element that is inside the viewport.
export function visibleCentre(loc) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const l = Math.max(r.left, 0), t = Math.max(r.top, 0);
    const rr = Math.min(r.right, document.documentElement.clientWidth), b = Math.min(r.bottom, window.innerHeight);
    return { x: (l + rr) / 2, y: (t + b) / 2 };
  });
}

// The card's depth of field, as written per frame.
export const filterOf = (loc) => loc.evaluate((el) => getComputedStyle(el).filter);
