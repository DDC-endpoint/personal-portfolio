// The hero's drift as the page scrolls away from it (components/Hero.jsx →
// useHeroDrift): what framer's useScroll({ target: hero, offset: ["start
// start", "end start"] }) and its useTransforms gave. p is the share of the
// hero scrolled past the top of the screen, and every mapping is clamped.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// p from the page's scroll: 0 with the hero's top at the top of the screen,
// 1 with its bottom there. geo: { top, h } of the hero, in page px.
export const heroProgress = (scrollY, { top, h }) => (scrollY - top) / h;

// The name, the portrait and the lede rise 100 px and fade out by 80%.
export const drift = (p) => ({ y: -100 * clamp01(p), opacity: 1 - clamp01(p / 0.8) });
drift.kinks = [0, 0.8, 1];

// The corner metadata fades as soon as the page scrolls, so it never collides.
export const metaFade = (p) => ({ opacity: 1 - clamp01(p / 0.12) });
metaFade.kinks = [0, 0.12];

// As framer writes them: no transform at all at rest at the top (an identity
// transform would still make the element a stacking context).
export const toStyle = ({ y, opacity }) => ({
  ...(y === undefined ? {} : { transform: y === 0 ? "none" : `translateY(${y}px)` }),
  opacity: String(opacity),
});

// A mapping's `prop` ("transform" or "opacity") as keyframes over the
// page's scroll timeline (offset = scrollY over the page's scroll range M).
// The mappings are straight lines between their kinks, so keyframes at the
// kinks (and the range's ends) draw them exactly. geo: { top, h, M }.
export function driftKeyframes(map, { top, h, M }, prop) {
  const offsets = [0, 1, ...map.kinks.map((k) => clamp01((top + k * h) / M))];
  return [...new Set(offsets)]
    .sort((a, b) => a - b)
    .map((offset) => ({ offset, [prop]: toStyle(map(heroProgress(offset * M, { top, h })))[prop] }));
}
