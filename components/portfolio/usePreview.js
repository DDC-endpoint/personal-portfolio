"use client";
import { useEffect, useRef } from "react";
import { previewPlan, leavePlan, positionAt } from "@/lib/portfolio";

// The scroll-through preview (lib/portfolio.js): while `on`, the full-page
// capture in `imgRef` scrolls down inside its frame (the image's parent),
// holds and comes back up; turning off early eases it home from wherever it
// is. Time-driven once started, so a resting pointer keeps it going. `ready`
// turns true once the full capture has loaded (it swaps in only when a
// preview first starts).

export function usePreview(imgRef, on, ready) {
  const y = useRef(0);

  useEffect(() => {
    const img = imgRef.current, vp = img?.parentElement;
    if (!img || !vp || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (on && !ready) return;
    const from = y.current;
    const plan = on ? previewPlan(img.offsetHeight - vp.clientHeight) : from ? leavePlan(from) : null;
    if (!plan) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      y.current = positionAt(plan, from, now - t0);
      img.style.transform = y.current ? `translate3d(0, ${y.current.toFixed(1)}px, 0)` : "";
      if (now - t0 < plan.reduce((t, s) => t + s.ms, 0)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [imgRef, on, ready]);
}
