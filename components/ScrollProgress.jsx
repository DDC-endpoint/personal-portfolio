"use client";
import { useEffect, useState } from "react";
import { motion, useAnimationFrame, useMotionValue, useScroll } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { followStep } from "@/lib/motion";

// Thin electric line along the very top edge tracking page scroll.
// z-55: above the nav (50) and .top-fade scrim (40), under .grain (60) —
// grain at ~5% opacity over a 2px line is imperceptible, so the site's
// texture-over-everything rule stays intact.
const LINE = "fixed top-0 left-0 right-[var(--lock-gap,0px)] z-55 h-[2px] bg-electric origin-left pointer-events-none";

// Where the browser has scroll timelines the line runs on the page's own
// (globals.css → .scroll-progress): the compositor draws it exactly with the
// scroll, every frame, however busy the page is (Damian, 2026-10-30: "track
// the scroll exactly at 60"). Elsewhere the frame loop below draws it.
export default function ScrollProgress() {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(CSS.supports("animation-timeline: scroll()")), []);
  return native ? <div aria-hidden className={`scroll-progress ${LINE}`} /> : <FollowedLine />;
}

function FollowedLine() {
  const { scrollYProgress } = useScroll();
  // Eased toward the scroll each frame without momentum (lib/motion.js →
  // followStep), so it never runs past the page and snaps back.
  const eased = useMotionValue(scrollYProgress.get());
  useAnimationFrame((_, delta) => {
    const to = scrollYProgress.get();
    const from = eased.get();
    if (from === to) return;
    const next = followStep(from, to, delta / 1000);
    // Within 0.01% (0.2px on a 1920px bar): land on it.
    eased.set(Math.abs(next - to) < 1e-4 ? to : next);
  });
  // The bar is positional information, so it stays under reduced motion —
  // but bound directly to scroll with no lag.
  const scaleX = useReducedMotion() ? scrollYProgress : eased;

  return <motion.div aria-hidden style={{ scaleX }} className={LINE} />;
}
