"use client";
import { useEffect, useRef } from "react";

// The page transition (docs/v3/plan-phase-5.md). Mounted once in the site
// layout, which persists across client-side navigations, so the veil (a
// full-screen canvas) stays put while the page beneath it changes.
//
// The canvas is in the server HTML but idle and invisible; the drawing engine
// (Veil.js) is split out of the first load and imported once the browser is
// idle. html[data-transitions="ready"] says the controller is live.

const whenIdle = (fn) => {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
};

export default function PageTransitions() {
  const canvasRef = useRef(null);
  const veilRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const cancelIdle = whenIdle(async () => {
      const { createVeil } = await import("./Veil");
      if (cancelled) return;
      veilRef.current = createVeil(canvasRef.current);
      document.documentElement.dataset.transitions = "ready";
    });
    return () => {
      cancelled = true;
      cancelIdle();
      veilRef.current?.destroy();
      delete document.documentElement.dataset.transitions;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-veil="idle"
      aria-hidden="true"
      className="page-veil fixed inset-0 z-70 h-full w-full pointer-events-none nojs:hidden"
    />
  );
}
