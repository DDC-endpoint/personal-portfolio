// The page transition (docs/v3/plan-phase-5.md): a band of electric-blue
// characters sweeps down the screen to cover the page, the next page swaps in
// underneath, and the same sweep reveals it. Pure: the timings, the sweep
// maths and the rules for which clicks it takes over. The drawing lives in
// components/transition/Veil.js, the controller in PageTransitions.jsx.

// Seconds. Damian chose about 1.3 s in all (twice the prototype's first cut).
export const TIMING = {
  cover: 0.52, // the sweep covers the outgoing page
  hold: 0.12, // fully covered: the page swaps underneath
  reveal: 0.64, // the same sweep uncovers the incoming page
  front: 0.18, // how long a cell flickers as noise at the wave front
  jitter: 0.1, // per-cell randomness in arrival, so the front isn't a hard edge
  bloom: 0.38, // first load: the covered glyph field grows out from the stamp
};

// If the next page hasn't arrived by then, the browser loads it normally.
export const FALLBACK_MS = 4000;

// The pages that share the site layout. The 404 page links here but is
// never a target itself.
export const PAGES = ["/", "/portfolio", "/services", "/privacy"];

const normalise = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

// The page a pathname names, or null if it isn't one of PAGES.
export const pageOf = (pathname) => {
  const path = normalise(pathname);
  return PAGES.includes(path) ? path : null;
};

// Should this click play the transition? `event` carries the mouse fields,
// `anchor` is { href, origin, target, download, raw } (raw = the href
// attribute as written), `here` is { origin, pathname }. Returns null when the
// browser (or SmoothScroll, for bare #… links) should handle it.
export function intercept(event, anchor, here) {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.download) return null;
  if (anchor.raw?.startsWith("#")) return null;
  if (anchor.origin !== here.origin) return null;
  const url = new URL(anchor.href);
  const path = pageOf(url.pathname);
  if (!path) return null;
  const kind = path === normalise(here.pathname) ? "scroll" : "transition";
  return { kind, path, hash: url.hash };
}

// When (0..1, before the front and jitter are fitted in) the sweep reaches
// cell (x, y): led by the row, with a slight lean across the columns.
export function sweepAt(x, y, cols, rows) {
  return (y / rows) * 0.85 + (x / cols) * 0.05;
}

// The time (s) into a phase of `span` seconds at which a cell's front starts,
// from its sweep position and its own random jitter (0..1). The latest front
// still ends inside the phase.
export function arrivalAt(sweep, jit, span, { front = TIMING.front, jitter = TIMING.jitter } = {}) {
  return sweep * (span - front - jitter) + jit * jitter;
}

// What a cell shows at time t of a phase, given its arrival time `at`.
// k is the progress through the front: < 0 not reached, 0..1 at the front,
// > 1 passed. "cover" fills in behind the front; "reveal" clears behind it.
export function cellAt(phase, t, at, { front = TIMING.front } = {}) {
  const k = (t - at) / front;
  if (phase === "cover") return { state: k < 0 ? "page" : k < 1 ? "front" : "covered", k };
  return { state: k < 0 ? "covered" : k <= 1 ? "front" : "page", k };
}

// The veil's backing-store scale: the screen's density, capped at 2 and at
// VEIL_PIXELS device pixels in all, so a big, dense screen doesn't pay for a
// huge canvas (the sweep is soft noise; it never needs full density). Never
// below 1.
export const VEIL_PIXELS = 4_500_000;
export function veilScale(width, height, dpr) {
  return Math.max(1, Math.min(dpr || 1, 2, Math.sqrt(VEIL_PIXELS / (width * height))));
}

// First load: when (0..1 of TIMING.bloom) the covered glyph field reaches a
// cell (dx, dy) px from the middle, so it grows out from the stamp's halo
// instead of popping in (Damian, Phase 5 gate). maxDist is the farthest
// corner; jit (0..1) softens the edge; everything within `inner` px (hidden
// under the halo) arrives at once, so the visible growth starts at once.
export function bloomAt(dx, dy, maxDist, jit, inner = 0) {
  const d = Math.max(0, Math.hypot(dx, dy) - inner) / (maxDist - inner);
  return Math.min(1, d * 0.88 + jit * 0.12 * Math.min(1, d * 8));
}

// The stamp's halo radius (px): 24% of the viewport's shorter side, never
// under 150. globals.css has the same rule as --stamp-r.
export const stampRadius = (width, height) => Math.max(150, 0.24 * Math.min(width, height));
