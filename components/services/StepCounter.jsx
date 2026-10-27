"use client";
import { useEffect, useRef } from "react";
import { STEPS } from "@/lib/services";
import { scrambleText, TICK_MS } from "@/lib/decode";

// How it works' pinned step (Damian): the latest lit step's title in large
// serif type, decoding from the last one (Brief → Design → …), and a
// "02 / 04" count. The sibling of the Timeline's YearCounter, without the
// odometer. Decorative: the list itself carries every title.
//   side:  under the § label, in the sticky label column (md and up)
//   strip: a compact strip stuck under the nav (phones)
// Hidden without JS. Reduced motion: the title switches instantly.

const TITLE_MS = 450;

const LOOK = {
  side: {
    root: "hidden js:md:block mt-10",
    title: "text-5xl xl:text-7xl",
    count: "mt-3",
  },
  strip: {
    root: "hidden js:max-md:flex sticky top-20 z-10 -mx-6 mb-10 items-baseline justify-between gap-5 border-b border-rule bg-paper px-6 py-3",
    title: "text-4xl",
    count: "",
  },
};

export default function StepCounter({ index, reduce, variant }) {
  const look = LOOK[variant];
  const title = STEPS[Math.max(0, index)].title;
  const titleRef = useRef(null);

  // The title is written only here (never as a React child), so the decode
  // can rewrite it freely. It resolves left to right out of noise.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    if (reduce || index < 0) {
      el.textContent = title;
      return;
    }
    let raf = 0, last = -Infinity;
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      if (t >= TITLE_MS) {
        el.textContent = title;
        return;
      }
      if (now - last >= TICK_MS) {
        last = now;
        el.textContent = scrambleText(title, t / TITLE_MS);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = title;
    };
  }, [title, index, reduce]);

  return (
    <div data-step-counter={variant} aria-hidden data-nosnippet="" className={look.root}>
      <div
        ref={titleRef}
        data-step-title
        className={`font-display leading-none tracking-tight text-ink transition-opacity duration-500 ${look.title} ${
          index < 0 ? "opacity-25" : ""
        }`}
      />
      <div data-step-count className={`font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint ${look.count}`}>
        {`${String(index + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`}
      </div>
    </div>
  );
}
