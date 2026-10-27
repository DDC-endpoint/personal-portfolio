"use client";
import { motion, useScroll, useSpring } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { SPRING } from "@/lib/motion";

// Thin electric line along the very top edge tracking page scroll.
// z-55: above the nav (50) and .top-fade scrim (40), under .grain (60) —
// grain at ~5% opacity over a 2px line is imperceptible, so the site's
// texture-over-everything rule stays intact.
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const spring = useSpring(scrollYProgress, SPRING.progress);
  // The bar is positional information, so it stays under reduced motion —
  // but bound directly to scroll with no spring lag.
  const scaleX = useReducedMotion() ? scrollYProgress : spring;

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 left-0 right-[var(--lock-gap,0px)] z-55 h-[2px] bg-electric origin-left pointer-events-none"
    />
  );
}
