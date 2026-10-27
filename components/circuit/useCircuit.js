"use client";
import { useScroll, useSpring, useMotionValueEvent } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { SPRING } from "@/lib/motion";
import { litCount, circuitPoints, traceAt } from "@/lib/timeline";

// The circuit (Damian): an electric trace runs down a list of milestones as
// you scroll and drains back as you scroll up, jogging out to a side lane at
// 45° between pads, with a glowing head at its tip. Used by the Timeline and
// by /services "How it works".
//
// One sprung motion value (`drawn`) drives it all: the list carries it as the
// --d custom property, which reveals the lit trace in CSS, and the head is
// the one element JS moves. The trace's bends need the pads' measured
// positions ([data-milestone] → [data-dot]), so it draws after the first
// measure, made after fonts settle and again (debounced) whenever the list
// resizes. `lit` counts the pads at or above the head. Bright dashes flow
// along the lit trace only while `sectionRef` is on screen (data-flowing).
export function useCircuit({ listRef, sectionRef, lane = 12 }) {
  const headRef = useRef(null);

  // The current starts when the list top reaches 70% down the screen and
  // completes when the list end passes just below the midpoint.
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ["start 0.7", "end 0.55"],
  });
  const drawn = useSpring(scrollYProgress, SPRING.draw);

  const [layout, setLayout] = useState(null);
  const [lit, setLit] = useState(0);
  const trace = useMemo(() => {
    if (!layout) return null;
    const pts = circuitPoints(layout.ys, layout.h, lane);
    return { ...layout, pts, d: "M" + pts.map((p) => p.join(" ")).join(" L"), thresholds: layout.ys.map((y) => y / layout.h) };
  }, [layout, lane]);
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
      const list = listRef.current;
      if (!list) return;
      const h = list.offsetHeight || 1;
      list.style.setProperty("--h", `${h}px`);
      const ys = Array.from(list.querySelectorAll("[data-milestone]")).map((li) => {
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
    ro.observe(listRef.current);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [drawn, listRef]);

  useEffect(() => placeHead(drawn.get()), [trace, drawn]);

  useMotionValueEvent(drawn, "change", (v) => {
    if (trace) setLit(litCount(v, trace.thresholds));
    placeHead(v);
  });

  // The flowing current only runs while the section is on screen.
  useEffect(() => {
    const section = sectionRef.current, list = listRef.current;
    if (!section || !list) return;
    const io = new IntersectionObserver(([e]) => (list.dataset.flowing = String(e.isIntersecting)));
    io.observe(section);
    return () => io.disconnect();
  }, [sectionRef, listRef]);

  return { drawn, lit, trace, headRef };
}
