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

// ---- Hero loader (HeroPortrait wave + DecodeText) ----------------------------

export const LOADER_KEY = "ddc:loader-played";

let loaderDecision; // module-level memo — one decision per page load

// True on the first page load of a browser session (reloads and returns from
// /services don't replay the 2.4s wave), unless the visitor prefers reduced
// motion or is in forced-colours (high-contrast) mode. Marks the session on the call that says yes. Blocked storage can't
// remember, so it plays. SSR is undecided and not memoized.
export function shouldPlayLoader() {
  if (loaderDecision !== undefined) return loaderDecision;
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (forced-colors: active)").matches) return (loaderDecision = false);
  } catch {
    return (loaderDecision = false);
  }
  try {
    if (window.sessionStorage.getItem(LOADER_KEY)) return (loaderDecision = false);
    window.sessionStorage.setItem(LOADER_KEY, "1");
  } catch {
    // storage blocked — play every load
  }
  return (loaderDecision = true);
}

// Tests only: forget this load's decision.
export function resetLoaderDecision() {
  loaderDecision = undefined;
}
