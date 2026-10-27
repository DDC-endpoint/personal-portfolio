"use client";
import { motion, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useEffect, useRef, useState } from "react";
import SplitLines from "./SplitLines";
import { SPRING } from "@/lib/motion";
import { ENTRIES, litCount } from "@/lib/timeline";
import { scrambleDigits, TICK_MS } from "@/lib/decode";
import { DecodeLabel } from "./Scramble";

// § 05 Timeline — a running stitch (Damian). An electric dashed thread, led by
// a needle, sews down the list as you scroll and unpicks as you scroll back.
// Each milestone the needle passes gets a cross-stitch ×, its year decodes
// from scrambled digits and its text goes from faint to full ink; milestones
// below the needle stay faint. One sprung motion value drives it all through
// the --d custom property, so the per-frame work is CSS only.
// No JS or reduced motion: fully stitched, every milestone lit, no needle. The
// faint state and the clip only apply under js:motion-safe:.

const YEAR_MS = 500;

// Decodes one year in place: digits scramble and resolve left to right.
function decodeYear(el, year, raf) {
  if (!el) return;
  cancelAnimationFrame(raf.current);
  const start = performance.now();
  let last = -Infinity;
  const step = (now) => {
    const t = now - start;
    if (t >= YEAR_MS) {
      el.textContent = year;
      return;
    }
    if (now - last >= TICK_MS) {
      last = now;
      el.textContent = scrambleDigits(year, t / YEAR_MS);
    }
    raf.current = requestAnimationFrame(step);
  };
  raf.current = requestAnimationFrame(step);
}

export default function Timeline() {
  const wrapperRef = useRef(null);
  const yearRefs = useRef([]);
  const yearRafs = useRef(ENTRIES.map(() => ({ current: 0 })));
  const reduce = useReducedMotion();

  // The thread sews down the list as it moves through the viewport: it
  // starts when the list top reaches 70% down the screen and completes when
  // the list end passes just below the midpoint.
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start 0.7", "end 0.55"],
  });
  const drawn = useSpring(scrollYProgress, SPRING.draw);

  // Milestones light as the needle passes their dot. Thresholds are each
  // dot's position as a fraction of the list height: one batched measure
  // after fonts settle, recomputed (debounced) whenever the list resizes.
  const [thresholds, setThresholds] = useState([]);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const measure = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const h = wrap.offsetHeight || 1;
      wrap.style.setProperty("--h", `${h}px`);
      const items = wrap.querySelectorAll("[data-milestone]");
      const next = Array.from(items).map((li) => {
        const dot = li.querySelector("[data-dot]");
        return (li.offsetTop + dot.offsetTop + dot.offsetHeight / 2) / h;
      });
      setThresholds(next);
      setLit(litCount(drawn.get(), next));
    };
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(measure, 150);
    };
    (async () => {
      try {
        await document.fonts.ready;
      } catch {}
      measure();
    })();
    // The list can reflow without a window resize (a scrollbar appearing,
    // late layout above), so watch the list itself.
    const ro = new ResizeObserver(onResize);
    ro.observe(wrapperRef.current);
    const rafs = yearRafs.current;
    return () => {
      clearTimeout(t);
      ro.disconnect();
      rafs.forEach((r) => cancelAnimationFrame(r.current));
    };
  }, [drawn]);

  useMotionValueEvent(drawn, "change", (v) => setLit(litCount(v, thresholds)));

  // A milestone that lights up decodes its year; one that goes dark is
  // simply faint again, ready to decode the next time the needle passes.
  const prevLit = useRef(0);
  useEffect(() => {
    if (reduce) return;
    for (let i = prevLit.current; i < lit; i++) decodeYear(yearRefs.current[i], ENTRIES[i].year, yearRafs.current[i]);
    for (let i = lit; i < prevLit.current; i++) {
      cancelAnimationFrame(yearRafs.current[i].current);
      if (yearRefs.current[i]) yearRefs.current[i].textContent = ENTRIES[i].year;
    }
    prevLit.current = lit;
  }, [lit, reduce]);

  const litNow = reduce ? ENTRIES.length : lit;

  return (
    <section id="timeline" className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule bg-paper">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="md:sticky md:top-32">
            <DecodeLabel className="section-label">§ 05 — Timeline</DecodeLabel>
          </div>
        </div>

        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            How I got <span className="italic text-electric">here</span>.
          </SplitLines>

          <motion.div
            ref={wrapperRef}
            data-timeline-list
            style={{ "--d": drawn }}
            className="relative mt-16 md:mt-24"
          >
            {/* faint base rule, the running stitch over it, and the needle at its tip,
                all centred on one axis with the dots and cross-stitches */}
            <div className="absolute left-4 md:left-0 top-0 bottom-0 w-px -translate-x-1/2 rule-v" aria-hidden />
            <div
              aria-hidden
              className="absolute left-4 md:left-0 top-0 bottom-0 w-[1.5px] -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,rgb(var(--c-electric))_0_7px,transparent_7px_12px)] js:motion-safe:[clip-path:inset(0_0_calc((1_-_var(--d,1))*100%)_0)]"
            />
            <div
              data-needle
              aria-hidden
              className="absolute left-4 md:left-0 top-0 hidden js:motion-safe:block [transform:translate(-50%,calc(var(--d,0)*var(--h,0px)_-_100%))]"
            >
              <svg width="6" height="16" viewBox="0 0 6 16" className="block overflow-visible">
                <ellipse cx="3" cy="3" rx="1.6" ry="2.4" className="fill-none stroke-electric" strokeWidth="1" />
                <path d="M3 5.6 L3 16" className="stroke-electric" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <ol className="flex flex-col gap-12 md:gap-16">
              {ENTRIES.map((e, i) => {
                const on = i < litNow;
                return (
                  <li
                    key={`${e.year}-${e.title}`}
                    data-milestone
                    data-lit={on}
                    className="group relative pl-12 md:pl-20"
                  >
                    <span
                      data-dot
                      aria-hidden
                      className="absolute left-[12px] md:left-[-4px] top-[13px] h-2 w-2 rounded-full border border-rule bg-paper"
                    />
                    <span
                      data-stitch
                      aria-hidden
                      className={`absolute left-[10px] md:left-[-6px] top-[11px] h-3 w-3 transition-transform duration-300 ease-out ${
                        on ? "scale-100" : "js:motion-safe:scale-0"
                      }`}
                    >
                      <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-electric" />
                      <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[11px] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-electric" />
                    </span>
                    <div className="transition-opacity duration-500 js:motion-safe:group-data-[lit=false]:opacity-45">
                      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft mb-2">
                        <span ref={(el) => (yearRefs.current[i] = el)} data-year aria-hidden="true">
                          {e.year}
                        </span>
                        <span className="sr-only">{e.year}</span> &mdash; {e.place}
                      </div>
                      <h3 className="font-display text-3xl md:text-5xl leading-tight text-ink">{e.title}</h3>
                      <p className="mt-3 max-w-xl text-base md:text-lg text-ink-soft">{e.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
