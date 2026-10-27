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
};

// If the next page hasn't arrived by then, the browser loads it normally.
export const FALLBACK_MS = 4000;

// The pages that share the site layout. The 404 page links here but is
// never a target itself.
export const PAGES = ["/", "/services", "/privacy"];

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
