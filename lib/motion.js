// Shared motion vocabulary — single source of truth for easing, durations,
// viewport settings, and spring configs (mirrors the lib/site.js convention).
// The CSS side (globals.css .link-line, .nav-line) duplicates EASE as a cubic-bezier —
// keep them in sync if this ever changes.

export const EASE = [0.22, 1, 0.36, 1];

export const DUR = { fast: 0.6, base: 1, slow: 1.4 };

export const VIEWPORT = { once: true, margin: "-80px" };

export const SPRING = {
  magnetic: { stiffness: 150, damping: 15, mass: 0.1 },
  draw: { stiffness: 90, damping: 30 },
};

// The scroll bar's easing: no spring. Lenis already eases the scroll, and a
// spring's momentum on top carried the bar past the page's position as Lenis
// slowed, then its rest snap jumped it back (the bar flickered; worst on a
// 240 Hz screen). An exponential follow has no momentum, so each step lands
// between where the bar is and the target: it can lag, never overshoot.
// PROGRESS_LAG is the time constant in seconds (95% of the way in 3x it).
export const PROGRESS_LAG = 0.08;

export function followStep(from, to, dt, lag = PROGRESS_LAG) {
  return to + (from - to) * Math.exp(-Math.max(0, dt) / lag);
}

// ---- Page-load intro and the reveal -------------------------------------

let introDecision; // module-level memo — one decision per page load

// True once per full page load (reloads replay it), unless the visitor
// prefers reduced motion. Memoized so the loader and the hero can never
// disagree within a load.
export function shouldPlayIntro() {
  if (introDecision !== undefined) return introDecision;
  if (typeof window === "undefined") return false; // SSR: undecided, no memo
  try {
    introDecision = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    introDecision = false;
  }
  return introDecision;
}

// Entrances wait for the curtain (Phase 6, docs/v3/plan-phase-6.md → Task 8).
// Every arrival starts covered: a first load or reload under the loader, a
// page change under the curtain. The curtain calls markRevealed() as it
// clears (lib/curtain.js → clearAt), and above-the-fold entrances start
// then. When no curtain plays (reduced motion, forced colours, or its code
// failing to load), the page transition marks the page revealed at once.
let revealed = false;
let waiting = [];

export const isRevealed = () => revealed;

// The curtain is covering the page: the next page's entrances wait again.
export function coverStarts() {
  revealed = false;
}

export function markRevealed() {
  if (revealed) return;
  revealed = true;
  const run = waiting;
  waiting = [];
  for (const fn of run) fn();
}

// Resolves when this arrival's page is revealed (at once if it already is).
export const whenRevealed = () => (revealed ? Promise.resolve() : new Promise((r) => waiting.push(r)));

// Runs `fn` once this arrival's page is revealed. Returns a function that
// calls it off (for an effect's cleanup).
export function onReveal(fn) {
  let live = true;
  whenRevealed().then(() => live && fn());
  return () => {
    live = false;
  };
}

// Tests only: forget this load's decision and the reveal.
export function resetIntroDecision() {
  introDecision = undefined;
  revealed = false;
  waiting = [];
}
