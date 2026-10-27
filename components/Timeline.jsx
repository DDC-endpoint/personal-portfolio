"use client";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useEffect, useRef } from "react";
import SplitLines from "./SplitLines";
import YearCounter from "./timeline/YearCounter";
import { useCircuit } from "./circuit/useCircuit";
import CircuitTrace from "./circuit/CircuitTrace";
import CircuitPad from "./circuit/CircuitPad";
import { ENTRIES } from "@/lib/timeline";
import { scrambleDigits, TICK_MS } from "@/lib/decode";
import { DecodeLabel } from "./Scramble";

// § 05 Timeline — a circuit (Damian). An electric trace runs down the list as
// you scroll and drains back as you scroll up, jogging out to a side lane at
// 45° between milestones, with a glowing head at its tip. Each pad the
// current reaches lights and glows, a short track draws out to its entry, its
// year decodes from scrambled digits and its text goes from faint to full
// ink; pads below the head stay dark. Bright dashes keep flowing along the
// lit trace while the section is on screen. A pinned year (YearCounter) rolls
// to the latest lit milestone. The circuit itself (trace, head, pads, the
// measure) is components/circuit/, shared with /services "How it works".
// No JS: a straight electric line, every milestone lit, no head or counter.
// Reduced motion: the finished circuit, every milestone lit, no head and no
// moving current. The faint and dark states only apply under js:motion-safe:.

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
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);
  const yearRefs = useRef([]);
  const yearRafs = useRef(ENTRIES.map(() => ({ current: 0 })));
  const reduce = useReducedMotion();
  const { drawn, lit, trace, headRef } = useCircuit({ listRef: wrapperRef, sectionRef });

  useEffect(() => {
    const rafs = yearRafs.current;
    return () => rafs.forEach((r) => cancelAnimationFrame(r.current));
  }, []);

  // A milestone that lights up decodes its year; one that goes dark is
  // simply faint again, ready to decode the next time the current passes.
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
    <section ref={sectionRef} id="timeline" className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule bg-paper">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-3">
          <div className="md:sticky md:top-32">
            <DecodeLabel className="section-label">§ 05 — Timeline</DecodeLabel>
            <YearCounter variant="side" index={lit - 1} reduce={reduce} />
          </div>
        </div>

        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            How I got <span className="italic text-electric">here</span>.
          </SplitLines>

          <YearCounter variant="strip" index={lit - 1} reduce={reduce} />

          <motion.div
            ref={wrapperRef}
            data-timeline-list
            data-flowing="false"
            style={{ "--d": drawn }}
            className="relative mt-16 md:mt-24"
          >
            <CircuitTrace trace={trace} headRef={headRef} />

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
                    <CircuitPad index={i} />
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
