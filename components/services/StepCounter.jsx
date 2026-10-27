"use client";
import { useEffect, useRef } from "react";
import { STEPS } from "@/lib/services";
import { scrambleText, TICK_MS } from "@/lib/decode";

// How it works' pinned step (Damian): the latest lit step's title in large
// serif type, decoding from the last one (Brief → Design → …), and a
// "02 / 04" count. The sibling of the Timeline's YearCounter, without the
// odometer. It sits under the § label in the sticky label column, md and up
// only: phones get no strip here (Damian; that stays the Timeline's).
// Decorative: the list itself carries every title.
// Hidden without JS. Reduced motion: the title switches instantly.

const TITLE_MS = 450;

export default function StepCounter({ index, reduce }) {
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
    <div data-step-counter aria-hidden data-nosnippet="" className="hidden js:md:block mt-10">
      <div
        ref={titleRef}
        data-step-title
        className={`font-display text-5xl xl:text-7xl leading-none tracking-tight text-ink transition-opacity duration-500 ${
          index < 0 ? "opacity-25" : ""
        }`}
      />
      <div data-step-count className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        {`${String(index + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")}`}
      </div>
    </div>
  );
}
