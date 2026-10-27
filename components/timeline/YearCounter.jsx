"use client";
import { useEffect, useRef } from "react";
import { ENTRIES, counterYear } from "@/lib/timeline";
import { scrambleText, TICK_MS } from "@/lib/decode";

// The Timeline's pinned year (Damian): the first year of the latest lit
// milestone, in large serif digits that roll like an odometer, the entry's
// title decoding under it, and a "06 / 10" count. The caption always takes
// two lines of space, so a title that wraps never moves the count (Damian).
// There is no progress bar: the circuit beside it already shows progress.
// Decorative: the list itself carries every year and title.
//   side:  beside the list, in the sticky label column (md and up)
//   strip: a compact strip stuck under the nav (phones)
// Hidden without JS. Reduced motion: the digits and caption switch instantly.

const CAPTION_MS = 450;
const DIGITS = [..."0123456789"];

const LOOK = {
  side: {
    root: "hidden js:md:block mt-10 max-w-[17rem]",
    digits: "text-[7rem]",
    meta: "mt-3",
  },
  strip: {
    root: "hidden js:max-md:flex sticky top-20 z-10 -mx-6 mt-8 items-end gap-5 border-b border-rule bg-paper px-6 py-3",
    digits: "text-[3.25rem]",
    meta: "flex-1 pb-1",
  },
};

export default function YearCounter({ index, reduce, variant }) {
  const look = LOOK[variant];
  const year = counterYear(ENTRIES[Math.max(0, index)]);
  const caption = index < 0 ? "—" : ENTRIES[index].title;
  const captionRef = useRef(null);

  // The caption is written only here (never as a React child), so the
  // decode can rewrite it freely. It resolves left to right out of noise.
  useEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    if (reduce || index < 0) {
      el.textContent = caption;
      return;
    }
    let raf = 0, last = -Infinity;
    const start = performance.now();
    const step = (now) => {
      const t = now - start;
      if (t >= CAPTION_MS) {
        el.textContent = caption;
        return;
      }
      if (now - last >= TICK_MS) {
        last = now;
        el.textContent = scrambleText(caption, t / CAPTION_MS);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.textContent = caption;
    };
  }, [caption, index, reduce]);

  return (
    <div data-counter={variant} data-value={index < 0 ? "" : year} aria-hidden className={look.root}>
      <div
        className={`flex font-display leading-none text-ink transition-opacity duration-500 ${look.digits} ${
          index < 0 ? "opacity-25" : ""
        }`}
      >
        {[...year].map((d, k) => (
          <span key={k} className="inline-block h-[1em] overflow-hidden">
            <span
              className={`block ${reduce ? "" : "transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.8,0.1,1)]"}`}
              style={{ transform: `translateY(-${d}em)`, transitionDelay: `${k * 70}ms` }}
            >
              {DIGITS.map((n) => (
                <span key={n} className="block h-[1em] text-center">
                  {n}
                </span>
              ))}
            </span>
          </span>
        ))}
      </div>
      <div className={`flex flex-col gap-1 font-mono text-[11px] uppercase tracking-[0.18em] ${look.meta}`}>
        <span ref={captionRef} data-counter-caption className="line-clamp-2 min-h-[3em] leading-normal text-ink-soft" />
        <span data-counter-count className="text-ink-faint">
          {`${String(index + 1).padStart(2, "0")} / ${ENTRIES.length}`}
        </span>
      </div>
    </div>
  );
}
