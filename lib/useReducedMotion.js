import { useSyncExternalStore } from "react";

// Hydration-safe prefers-reduced-motion. framer-motion's useReducedMotion()
// returns the real preference on the client's very first render, but the
// server can't know it — any component that renders differently from it then
// fails hydration, and React rebuilds the document from <html> down (wiping
// the theme script's `dark` / `js` classes). Here the server and the
// hydration render both read `false`, then React re-renders with the real
// value. Use this for anything that branches markup on reduced motion; values
// only read inside effects can keep framer's hook.

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false
  );
}
