"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EASE } from "@/lib/motion";
import { inkCoverSize, inkMask } from "@/lib/inkMask";

// The ink flood: the new theme spreads out of the toggle through an ink-blot
// mask on the View Transition's new snapshot (globals.css, html.ink-switch).
const INK_MS = 1400;
const INK_EASE = "cubic-bezier(0.5, 0.1, 0.3, 1)";

// Parse the blot's SVG ahead of the first click, so the first flood
// doesn't pay for it on its opening frame.
let warmed = false;
function warmInk() {
  if (warmed || typeof document === "undefined" || !document.startViewTransition) return;
  warmed = true;
  const { url } = inkMask();
  document.documentElement.style.setProperty("--ink-mask", url);
  const img = new Image();
  img.src = url.slice(5, -2); // url("…") → …
  img.decode?.().catch(() => {});
}

// Run before the browser paints on the client (avoids a one-frame icon flash
// where dark-mode visitors briefly see the sun), but fall back to useEffect on
// the server to avoid the SSR useLayoutEffect warning.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ThemeToggle() {
  // `mounted` guards against hydration mismatch: server + first client render
  // both show the sun, then we sync to the real theme set by the no-flash script.
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useIsoLayoutEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const button = useRef(null);

  const toggle = () => {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    const apply = () => {
      root.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
      setDark(next);
    };

    // No View Transitions, or reduced motion: the plain 0.45s cross-fade.
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply();
      return;
    }

    warmInk();
    const b = button.current.getBoundingClientRect();
    const x = b.left + b.width / 2;
    const y = b.top + b.height / 2;
    const reach = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const size = inkCoverSize(reach);

    // ink-switch: freezes the colour transitions so the new snapshot is
    // already the final theme, and hands the root pseudos to the mask.
    root.classList.add("ink-switch");
    const vt = document.startViewTransition(apply);
    vt.ready
      .then(() => {
        root.animate(
          {
            maskSize: ["0px 0px", `${size}px ${size}px`],
            maskPosition: [`${x}px ${y}px`, `${x - size / 2}px ${y - size / 2}px`],
          },
          { duration: INK_MS, easing: INK_EASE, fill: "forwards", pseudoElement: "::view-transition-new(root)" }
        );
      })
      .catch(() => {});
    vt.finished.finally(() => root.classList.remove("ink-switch"));
  };

  const showMoon = mounted && dark;

  return (
    <motion.button
      ref={button}
      type="button"
      onClick={toggle}
      onPointerEnter={warmInk}
      onFocus={warmInk}
      whileTap={{ scale: 0.88 }}
      aria-label={showMoon ? "Switch to light mode" : "Switch to dark mode"}
      title={showMoon ? "Light mode" : "Dark mode"}
      className="relative grid place-items-center w-8 h-8 rounded-full border border-ink/25 text-ink transition-colors duration-300 hover:border-electric hover:text-electric"
    >
      <AnimatePresence mode="wait" initial={false}>
        {showMoon ? (
          <motion.svg
            key="moon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ rotate: -70, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 70, scale: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
          </motion.svg>
        ) : (
          <motion.svg
            key="sun"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ rotate: -70, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 70, scale: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
          >
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2.2M12 19.8V22M4.22 4.22l1.56 1.56M18.22 18.22l1.56 1.56M2 12h2.2M19.8 12H22M4.22 19.78l1.56-1.56M18.22 5.78l1.56-1.56" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
