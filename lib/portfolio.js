// /portfolio's motion, as pure functions (docs/v3/plan-phase-6.md → Task 5;
// the timings are Damian's from docs/v3/spike/portfolio-page.html).

import { PROJECTS, inFilter } from "./projects";

// The scroll-through preview: resting on a card scrolls its full-page
// capture inside the frame, holds at the bottom, then eases back up.
// Damian: 1.5× the mock's first timing, "more browsable".
export const PREVIEW = {
  msPerPx: 13.5, // down, per pixel of travel…
  minMs: 3900, // …but never quicker than this
  maxMs: 13500, // …or slower than this
  holdMs: 1350, // at the bottom
  backMs: 2100, // back up
  minTravel: 8, // shorter pages don't preview
  settleMs: 450, // phones: the card nearest the centre once scrolling settles
};

// The way down, the hold and the way back, as segments { to, ms } from y = 0
// (to is the image's translateY in px). Null when there's nothing to scroll.
export function previewPlan(travel) {
  if (travel < PREVIEW.minTravel) return null;
  const down = Math.min(PREVIEW.maxMs, Math.max(PREVIEW.minMs, travel * PREVIEW.msPerPx));
  return [
    { to: -travel, ms: down },
    { to: -travel, ms: PREVIEW.holdMs },
    { to: 0, ms: PREVIEW.backMs },
  ];
}

// Leaving early: ease back from wherever the image is.
export const leavePlan = (from) => [{ to: 0, ms: Math.max(380, Math.abs(from) * 0.8) }];

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Where a plan has the image t ms after it started from `from`.
export function positionAt(plan, from, t) {
  let start = from;
  for (const seg of plan) {
    if (t < seg.ms) return start + (seg.to - start) * easeInOut(t / seg.ms);
    t -= seg.ms;
    start = seg.to;
  }
  return start;
}

// The row-by-row entrance: a row's cards land 110 ms apart, capped at three.
export const ENTRANCE = { staggerMs: 110, maxColumns: 3, typeAfterMs: 380 };
export const delayFor = (column) => Math.min(column, ENTRANCE.maxColumns) * ENTRANCE.staggerMs;

export const filterProjects = (filter) => PROJECTS.filter((p) => inFilter(p, filter));
