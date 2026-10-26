// Shared motion vocabulary — single source of truth for easing, durations,
// viewport settings, and spring configs (mirrors the lib/site.js convention).
// The CSS side (globals.css .link-line) duplicates EASE as a cubic-bezier —
// keep them in sync if this ever changes.

export const EASE = [0.22, 1, 0.36, 1];

export const DUR = { fast: 0.6, base: 1, slow: 1.4 };

export const VIEWPORT = { once: true, margin: "-80px" };

export const SPRING = {
  magnetic: { stiffness: 150, damping: 15, mass: 0.1 },
  progress: { stiffness: 120, damping: 30, restDelta: 0.001 },
  draw: { stiffness: 90, damping: 30 },
};

// ---- Page-load intro (IntroStamp + Hero + HeroPortrait must always agree) ---

// How long (s) the hero entrance shifts back while the intro stamp plays. The
// portrait's loader wave also starts here, as the curtain lifts.
export const INTRO_OFFSET = 1.0;

let introDecision; // module-level memo — one decision per page load

// True once per full page load (reloads replay it), unless the visitor
// prefers reduced motion. Memoized so IntroStamp, Hero and HeroPortrait
// (which all call it) can never disagree within a load.
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

// Tests only: forget this load's decision.
export function resetIntroDecision() {
  introDecision = undefined;
}
