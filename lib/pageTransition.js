// The page transition's rules (docs/v3/plan-phase-5.md; the look is Phase 6's
// curtain, lib/curtain.js): which clicks it takes over, the site's pages and
// the fallback. Pure. The controller is components/transition/
// PageTransitions.jsx, the curtain's engine components/transition/curtain.js.

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
