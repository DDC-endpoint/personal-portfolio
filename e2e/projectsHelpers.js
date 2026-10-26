import { stripLayout, progressForCard } from "../lib/strip.js";

// Project cards are [data-card="<index>"]; the end card is [data-end-card].
export const card = (page, i) => page.locator(`[data-card="${i}"]`);
export const decodeState = (loc) => loc.getAttribute("data-decode");
export const CARD_COUNT = 9; // 8 projects + the end card

// The decode controller marks each card once React has hydrated, so the
// section's pointer and key listeners are live from here on.
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

// Scrolls the page to pin progress p (0 → 1).
export async function scrollToProgress(page, p) {
  const { top, height, vh } = await trackInfo(page);
  await page.evaluate((y) => window.scrollTo(0, y), top + p * (height - vh));
  await page.waitForTimeout(300);
}

// Scrolls the pinned strip until card i is the leading card.
export async function scrollToCard(page, i) {
  const { vw, vh } = await trackInfo(page);
  await scrollToProgress(page, progressForCard(i, stripLayout({ vw, vh, count: CARD_COUNT })));
}

// Centre of the part of the element that is inside the viewport.
export function visibleCentre(loc) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const l = Math.max(r.left, 0), t = Math.max(r.top, 0);
    const rr = Math.min(r.right, document.documentElement.clientWidth), b = Math.min(r.bottom, window.innerHeight);
    return { x: (l + rr) / 2, y: (t + b) / 2 };
  });
}

export async function hoverCard(page, i) {
  await scrollToCard(page, i);
  const { x, y } = await visibleCentre(card(page, i).locator("[data-shot-area]"));
  await page.mouse.move(x, y);
}

// Somewhere that is never a card: the nav strip at the top-left.
export const pointerAway = (page) => page.mouse.move(5, 5);
