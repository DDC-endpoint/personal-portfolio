"use client";
import { useEffect, useRef, useState } from "react";

// Shared perf/a11y hooks for lab demos. The gating pattern (IntersectionObserver
// + visibilitychange) is lifted from components/GlitchField.jsx:97 — but where
// GlitchField merely pauses its loop, lab demos are fully UNMOUNTED while
// inactive (see LabStage): WebGL contexts are capped per page (~8–16), so
// off-screen demos must release theirs, not just idle.

export function useActive(ref) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let onScreen = false;
    const update = () => setActive(onScreen && !document.hidden);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        update();
      },
      { rootMargin: "100px" }
    );
    io.observe(el);

    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ref]);

  return active;
}

// For imperative demos (GSAP timelines, ogl render loops, raw rAF) that can't
// lean on Framer's MotionConfig. Contract: reducedMotion === true → render the
// settled end-state, run no loop.
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// Latest-value ref for pointer positions read inside rAF loops without
// re-rendering (the former homepage Marquee direct-mutation pattern).
export function useLatest(value) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
