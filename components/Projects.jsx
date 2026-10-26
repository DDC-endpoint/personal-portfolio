"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll } from "framer-motion";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";
import ProjectCard from "./projects/ProjectCard";
import EndCard from "./projects/EndCard";
import { PROJECTS } from "@/lib/projects";
import { stripLayout, cardPosition, stripOffset, progressForCard, nearestToCentre } from "@/lib/strip";
import { useReducedMotion } from "@/lib/useReducedMotion";

// § 04 Selected Work (docs/v3/design.md → 5. Projects).
//
// Desktop (≥ md, motion allowed): the track is 4 screens tall and its
// viewport is sticky, so the section pins for 3 screens of scroll while
// framer's useScroll slides the strip of cards along a 12° path
// (lib/strip.js). Below md, under reduced motion and without JS, the same
// cards are a plain vertical list. The pin itself is CSS (js:motion-safe:md:,
// the `js` class set pre-paint by the layout's inline script), so the server
// HTML is right for everyone; only the card positions need JS. The 400vh
// track is 1 + STRIP.PIN_SCREENS screens; keep the two in step.
//
// One card is active at a time, and only it decodes:
//   fine pointer: the card under the pointer, re-checked as the strip scrolls
//                 under a resting pointer (Damian's stationary-hover rule)
//   touch:        the card nearest the centre of the screen
//   keyboard:     the focused card; in the strip, Tab focus scrolls it into view
// Input modality decides between the last two: a Tab press hands control to
// focus (a parked mouse no longer counts) until the pointer next moves, and
// only keyboard focus scrolls the strip, so a click (whose mousedown also
// focuses the card) never moves the card out from under the pointer.
// The viewport is overflow: clip, not hidden, so the browser's own focus
// scrolling can never shift it sideways.

const COUNT = PROJECTS.length + 1; // + the end card
const FINE = "(hover: hover) and (pointer: fine)";
const WIDE = "(min-width: 768px)";
const STACK_ITEM = "w-[86%] even:ml-auto md:w-full md:max-w-3xl md:ml-[25%] md:even:ml-[25%]";

export default function Projects() {
  const trackRef = useRef(null);
  const stripRef = useRef(null);
  const reduced = useReducedMotion();
  const reducedRef = useRef(false);
  const layoutRef = useRef(null);
  const pointer = useRef(null);
  const focused = useRef(null);
  const keyboard = useRef(false);
  const raf = useRef(0);
  const [layout, setLayout] = useState(null);
  const [active, setActive] = useState(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ["start start", "end end"] });

  const place = useCallback(
    (p) => {
      const L = layoutRef.current;
      const o = L ? stripOffset(p, L) : { x: 0, y: 0 };
      x.set(o.x);
      y.set(o.y);
    },
    [x, y]
  );

  // Which card should be active right now.
  const pick = useCallback(() => {
    const strip = stripRef.current, track = trackRef.current;
    if (reducedRef.current || !strip || !track) return null;
    if (window.matchMedia(FINE).matches) {
      const pt = pointer.current;
      const el = pt && document.elementFromPoint(pt.x, pt.y)?.closest("[data-card]");
      if (el && strip.contains(el)) return Number(el.dataset.card);
      return focused.current;
    }
    const vw = document.documentElement.clientWidth, vh = window.innerHeight;
    const t = track.getBoundingClientRect();
    if (t.bottom <= 0 || t.top >= vh) return focused.current;
    // The end card is a candidate too: when it is nearest, no project card is.
    const items = [...strip.querySelectorAll("[data-card], [data-end-card]")];
    const inStrip = !!layoutRef.current;
    const centres = items.map((c) => {
      const r = c.getBoundingClientRect();
      return inStrip ? r.left + r.width / 2 : r.top + r.height / 2;
    });
    const i = nearestToCentre(centres, inStrip ? vw : vh);
    if (i < 0) return focused.current;
    return items[i].dataset.card === undefined ? null : Number(items[i].dataset.card);
  }, []);

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      setActive(pick());
    });
  }, [pick]);

  // Strip layout: only on wide screens with motion allowed.
  useEffect(() => {
    reducedRef.current = reduced;
    const wide = window.matchMedia(WIDE);
    const measure = () => {
      const L =
        wide.matches && !reduced
          ? stripLayout({ vw: document.documentElement.clientWidth, vh: window.innerHeight, count: COUNT })
          : null;
      layoutRef.current = L;
      setLayout(L);
      place(scrollYProgress.get());
      schedule();
    };
    measure();
    window.addEventListener("resize", measure);
    wide.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", measure);
    };
  }, [reduced, place, schedule, scrollYProgress]);

  // Scroll moves the strip; pointer and scroll both re-pick the active card.
  useEffect(() => {
    const unsub = scrollYProgress.on("change", (p) => {
      place(p);
      schedule();
    });
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      keyboard.current = false;
      pointer.current = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onPointerDown = () => {
      keyboard.current = false;
    };
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      keyboard.current = true;
      pointer.current = null;
      schedule();
    };
    const onLeave = () => {
      pointer.current = null;
      schedule();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    window.addEventListener("scroll", schedule, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      unsub();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("scroll", schedule);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [scrollYProgress, place, schedule]);

  // In the strip, brings item i (a card, or the end card) to its leading slot
  // when it was reached by keyboard.
  const scrollStripTo = useCallback((i) => {
    const L = layoutRef.current, track = trackRef.current;
    if (!L || !track || !keyboard.current) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const p = progressForCard(i, L);
    window.scrollTo({ top: top + p * (track.offsetHeight - window.innerHeight), behavior: "instant" });
  }, []);

  const onFocusCard = useCallback(
    (i) => {
      focused.current = i;
      scrollStripTo(i);
      schedule();
    },
    [scrollStripTo, schedule]
  );

  const onBlur = (e) => {
    if (e.relatedTarget?.closest?.("[data-card]")) return; // the next card's focus takes over
    focused.current = null;
    schedule();
  };

  const at = (i) => {
    if (!layout) return { className: STACK_ITEM };
    const { left, top } = cardPosition(i, layout);
    return { style: { position: "absolute", left, top, width: layout.cardW } };
  };

  return (
    <section id="work" className="relative border-t border-rule">
      <div className="grid grid-cols-12 gap-6 px-6 pt-32 md:px-10 md:pt-44">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 04 — Selected Work</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            A small but <span className="italic text-electric">growing</span> shelf.
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-base md:text-lg text-ink-soft">
              Six projects out in the world, two more on the way. The shelf keeps growing, so check back.
            </p>
          </Reveal>
        </div>
      </div>

      <div ref={trackRef} data-strip-track className="relative mt-16 md:mt-24 js:motion-safe:md:h-[400vh]">
        <div
          data-strip-viewport
          className="js:motion-safe:md:sticky js:motion-safe:md:top-0 js:motion-safe:md:h-screen js:motion-safe:md:overflow-clip"
        >
          <motion.div
            ref={stripRef}
            data-strip
            onBlur={onBlur}
            style={layout ? { x, y } : undefined}
            className={layout ? "absolute left-0 top-0" : "flex flex-col gap-16 px-4 pb-32 md:gap-24 md:px-10 md:pb-44"}
          >
            {PROJECTS.map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} active={active === i} onFocusCard={onFocusCard} {...at(i)} />
            ))}
            <EndCard onFocus={() => scrollStripTo(PROJECTS.length)} {...at(PROJECTS.length)} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
