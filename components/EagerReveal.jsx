"use client";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import { EASE, onReveal } from "@/lib/motion";

// Above-the-fold entrance that never hides content from the first paint: the
// server HTML renders children fully visible — so the text paints (and LCP is
// recorded) under the curtain — then the entrance replays as it clears. Use
// INSTEAD OF Reveal/motion `initial` for anything visible at the top of a
// page; keep Reveal for below-the-fold sections, where the hidden SSR state
// costs nothing and avoids the replay. Reduced motion: content stays visible,
// no replay.
//
// The same DOM node is kept for the whole lifecycle (initial={false} +
// controls.set) — swapping a plain tag for a motion tag after mount would
// remount the element, and the remounted node's late fade-in paint becomes a
// NEW, larger LCP candidate (webfont vs fallback metrics), pushing LCP right
// back to where it was. Don't "simplify" this into a conditional render.
// replay={false} renders the children as a plain static tag — no entrance at
// all. Use it for the LCP element itself (the largest above-fold text block):
// re-hiding it mid-load lets the webfont swap happen while it's invisible, and
// the reveal paint then re-registers LCP at the animation's end. Everything
// around it can still replay.
export default function EagerReveal({
  as = "div",
  children,
  delay = 0,
  y = 30,
  duration = 1,
  replay = true,
  className = "",
}) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !replay) return;
    // Forced colours: no curtain, so the content has been on screen all
    // along; blinking it away to replay an entrance would read as a glitch.
    if (window.matchMedia("(forced-colors: active)").matches) return;
    // Hidden under the curtain, then in as it clears (every arrival:
    // lib/motion.js → onReveal).
    controls.set({ opacity: 0, y });
    return onReveal(() =>
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration, ease: EASE, delay },
      })
    );
    // Replay exactly once, on mount — later prop changes must not re-hide
    // content, so the deps stay empty on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!replay) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag initial={false} animate={controls} className={className}>
      {children}
    </MotionTag>
  );
}
