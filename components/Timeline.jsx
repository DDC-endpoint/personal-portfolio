"use client";
import { motion, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useEffect, useMemo, useRef, useState } from "react";
import SplitLines from "./SplitLines";
import YearCounter from "./timeline/YearCounter";
import { SPRING } from "@/lib/motion";
import { ENTRIES, litCount, circuitPoints, traceAt, padLabel } from "@/lib/timeline";
import { scrambleDigits, TICK_MS } from "@/lib/decode";
import { DecodeLabel } from "./Scramble";

// § 05 Timeline — a circuit (Damian). An electric trace runs down the list as
// you scroll and drains back as you scroll up, jogging out to a side lane at
// 45° between milestones, with a glowing head at its tip. Each pad the
// current reaches lights and glows, a short track draws out to its entry, its
// year decodes from scrambled digits and its text goes from faint to full
// ink; pads below the head stay dark. Bright dashes keep flowing along the
// lit trace while the section is on screen. A pinned year (YearCounter) rolls
// to the latest lit milestone. One sprung motion value drives it all: the
// trace's reveal is CSS through the --d custom property, and the head is the
// one element JS moves. The trace's bends need the pads' measured positions,
// so it draws after the first measure.
// No JS: a straight electric line, every milestone lit, no head or counter.
// Reduced motion: the finished circuit, every milestone lit, no head and no
// moving current. The faint and dark states only apply under js:motion-safe:.

const YEAR_MS = 500;
const LANE = 12; // how far the trace jogs out between pads, px
const BOX = 80; // the trace's SVG box, centred on the rail's axis, px

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

// The pads, tracks and labels are lit by default (no JS, reduced motion);
// their js:motion-safe:group-data-[lit=false]: classes keep them dark until
// the current reaches them.

export default function Timeline() {
  const sectionRef = useRef(null);
  const wrapperRef = useRef(null);
  const headRef = useRef(null);
  const yearRefs = useRef([]);
  const yearRafs = useRef(ENTRIES.map(() => ({ current: 0 })));
  const reduce = useReducedMotion();

  // The current runs down the list as it moves through the viewport: it
  // starts when the list top reaches 70% down the screen and completes when
  // the list end passes just below the midpoint.
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start 0.7", "end 0.55"],
  });
  const drawn = useSpring(scrollYProgress, SPRING.draw);

  // The list's height and each pad's centre, in px from the list's top: one
  // batched measure after fonts settle, recomputed (debounced) whenever the
  // list resizes. Pads light as the head passes them.
  const [layout, setLayout] = useState(null);
  const [lit, setLit] = useState(0);
  const trace = useMemo(() => {
    if (!layout) return null;
    const pts = circuitPoints(layout.ys, layout.h, LANE);
    return { ...layout, pts, d: "M" + pts.map((p) => p.join(" ")).join(" L"), thresholds: layout.ys.map((y) => y / layout.h) };
  }, [layout]);
  const traceRef = useRef(null);
  traceRef.current = trace;

  // The head rides the trace, out into its lane between pads.
  const placeHead = (v) => {
    const head = headRef.current, t = traceRef.current;
    if (!head || !t) return;
    const y = v * t.h;
    head.style.transform = `translate(${traceAt(t.pts, y)}px, ${y}px) rotate(45deg)`;
    head.style.opacity = v > 0.001 && v < 0.999 ? "1" : "0";
  };

  useEffect(() => {
    const measure = () => {
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const h = wrap.offsetHeight || 1;
      wrap.style.setProperty("--h", `${h}px`);
      const ys = Array.from(wrap.querySelectorAll("[data-milestone]")).map((li) => {
        const dot = li.querySelector("[data-dot]");
        return li.offsetTop + dot.offsetTop + dot.offsetHeight / 2;
      });
      setLayout({ h, ys });
      setLit(litCount(drawn.get(), ys.map((y) => y / h)));
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

  useEffect(() => placeHead(drawn.get()), [trace, drawn]);

  useMotionValueEvent(drawn, "change", (v) => {
    if (trace) setLit(litCount(v, trace.thresholds));
    placeHead(v);
  });

  // The flowing current only runs while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current, wrap = wrapperRef.current;
    if (!section || !wrap) return;
    const io = new IntersectionObserver(([e]) => (wrap.dataset.flowing = String(e.isIntersecting)));
    io.observe(section);
    return () => io.disconnect();
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
  const svgBox = trace && {
    width: BOX,
    height: trace.h,
    viewBox: `${-BOX / 2} 0 ${BOX} ${trace.h}`,
    "aria-hidden": true,
  };

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
            {/* without JS the trace can't be measured: a straight, finished line */}
            <div
              data-trace-fallback
              aria-hidden
              className="absolute left-4 md:left-0 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-electric js:hidden"
            />
            {trace && (
              <>
                {/* the dark trace, the lit trace over it (revealed down to the
                    head) carrying the flowing current, and the head; all
                    centred on the pads' axis */}
                <svg {...svgBox} data-trace className="absolute top-0 left-4 md:left-0 -translate-x-1/2 overflow-visible">
                  <path d={trace.d} className="fill-none stroke-rule [stroke-width:2] [stroke-linejoin:round] [stroke-linecap:round]" />
                </svg>
                <svg
                  {...svgBox}
                  data-trace-lit
                  className="absolute top-0 left-4 md:left-0 -translate-x-1/2 overflow-visible js:motion-safe:[clip-path:inset(0_0_calc((1_-_var(--d,1))*100%)_0)]"
                >
                  <path d={trace.d} className="fill-none stroke-electric [stroke-width:2] [stroke-linejoin:round] [stroke-linecap:round]" />
                  <path data-flow d={trace.d} className="circuit-flow fill-none stroke-white [stroke-opacity:0.9] [stroke-width:1]" />
                </svg>
                <span
                  ref={headRef}
                  data-head
                  aria-hidden
                  className="absolute top-0 left-4 md:left-0 -ml-[3px] -mt-[3px] hidden h-1.5 w-1.5 bg-electric opacity-0 shadow-[0_0_8px_rgb(var(--c-electric))] js:motion-safe:block"
                />
              </>
            )}

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
                      data-pad-label
                      aria-hidden
                      className={`absolute right-[calc(100%+14px)] top-[13px] hidden font-mono text-[8px] leading-none tracking-[0.1em] text-electric transition-colors duration-300 md:block js:motion-safe:group-data-[lit=false]:text-ink-faint`}
                    >
                      {padLabel(i)}
                    </span>
                    {/* the track out to the entry: dark underneath, drawn in electric when lit */}
                    <span aria-hidden className="absolute left-[22px] md:left-[6px] top-[16.25px] h-[1.5px] w-[18px] md:w-[50px] bg-rule" />
                    <span
                      aria-hidden
                      className={`absolute left-[22px] md:left-[6px] top-[16.25px] h-[1.5px] w-[18px] md:w-[50px] origin-left bg-electric transition-transform duration-300 ease-out js:motion-safe:group-data-[lit=false]:scale-x-0`}
                    />
                    <span
                      aria-hidden
                      className={`absolute left-[39px] md:left-[55px] top-[14px] h-1.5 w-1.5 rounded-full border border-electric bg-electric transition-colors duration-200 delay-300 js:motion-safe:group-data-[lit=false]:border-rule js:motion-safe:group-data-[lit=false]:bg-paper js:motion-safe:group-data-[lit=false]:delay-0`}
                    />
                    <span
                      data-dot
                      aria-hidden
                      className={`absolute left-[10px] md:left-[-6px] top-[11px] grid h-3 w-3 place-items-center rounded-full border-2 border-electric bg-electric shadow-[0_0_8px_rgb(var(--c-electric)/0.7)] transition-[background-color,border-color,box-shadow] duration-300 js:motion-safe:group-data-[lit=false]:border-rule js:motion-safe:group-data-[lit=false]:bg-paper js:motion-safe:group-data-[lit=false]:shadow-none`}
                    >
                      <span className={`h-[3px] w-[3px] rounded-full bg-paper js:motion-safe:group-data-[lit=false]:bg-rule`} />
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
