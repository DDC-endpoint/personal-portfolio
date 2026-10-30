"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";
import ProjectCard from "./projects/ProjectCard";
import EndCard from "./projects/EndCard";
import { homeStrip } from "@/lib/projects";
import {
  STRIP,
  stripLayout,
  cardPosition,
  stripOffset,
  focusAt,
  progressForCard,
  depthAt,
  stackDepth,
  stackKeyframes,
  smoothStep,
  nearestToCentre,
} from "@/lib/strip";
import { useReducedMotion } from "@/lib/useReducedMotion";

// § 04 Selected Work (docs/v3/plan-phase-6.md → Task 3): Damian's five and
// the end card, as a carousel.
//
// Desktop (≥ md, motion allowed): the track is 4 screens tall and its
// viewport is sticky, so the section pins for 3 screens of scroll while the
// strip glides along a 12° path through the screen centre, one card centred
// at a time (lib/strip.js). The displayed progress eases after the scroll
// progress, and every frame writes each card's depth of field (scale,
// opacity, blur, saturation) to its style. Below md the cards stack, and the
// ones away from the centre of the screen dim and shrink (no blur). Under
// reduced motion and without JS the cards are a plain list. The pin itself is
// CSS (js:motion-safe:md:, the `js` class set pre-paint by the layout's
// inline script), so the server HTML is right for everyone; only the card
// positions need JS. Heights are in svh, so mobile browser toolbars showing
// and hiding never re-lay it out. Where the browser has view timelines, the
// stack's depth is a scroll-driven animation per card, so the compositor
// draws it in step with the scroll however busy the main thread is; elsewhere
// the frame loop writes it. Either way the cards are compositor layers only
// while the stack scrolls: a layer keeps the scale it was rasterised at,
// which softens its text at any other, so at rest the animations give way to
// the same values as plain styles (the frame loop's layers come off) and the
// cards repaint sharp where they stop.
//
// One card is active at a time, and only it decodes: the centred card (within
// half a step of the centre on desktop, the one nearest the middle of the
// screen on phones). A Tab press hands control to focus: the focused card is
// brought to the centre, so the two agree. The pointer never picks the card
// (Damian, Phase 6). Only keyboard focus scrolls the strip, so a click (whose
// mousedown also focuses the card) never moves the card out from under the
// pointer. The viewport is overflow: clip, not hidden, so the browser's own
// focus scrolling can never shift it sideways.

const CARDS = homeStrip();
const COUNT = CARDS.length + 1; // + the end card
const END = CARDS.length;
const WIDE = "(min-width: 768px)";
// The track: one screen of sticky viewport plus PIN_SCREENS of scroll.
const TRACK_STYLE = { "--pin-track": `${(1 + STRIP.PIN_SCREENS) * 100}svh` };
const REST_MS = 150; // the stack's scroll has rested this long: back to plain paint
const STACK_ITEM ="w-[86%] even:ml-auto md:w-full md:max-w-3xl md:ml-[25%] md:even:ml-[25%]";
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Clears what the frame loop wrote, when the mode changes.
const clearStyles = (el) => {
  for (const k of ["transform", "opacity", "filter", "zIndex", "willChange"]) el.style[k] = "";
};

export default function Projects() {
  const trackRef = useRef(null);
  const stripRef = useRef(null);
  const viewportRef = useRef(null);
  const reduced = useReducedMotion();
  const mode = useRef(null); // "strip" | "stack" | null (the plain list)
  const layoutRef = useRef(null);
  const shown = useRef(null); // the displayed progress, eased after the scroll's
  const lastFrame = useRef(0);
  const wasOnScreen = useRef(true); // the last frame's: skip writes while it stays off
  const focused = useRef(null);
  const keyboard = useRef(false);
  const raf = useRef(0);
  const rest = useRef(0); // the stack's layers come off when this fires
  const timelines = useRef(false); // the stack runs on view timelines
  const timed = useRef([]); // its scroll-driven animations, one per card, while it scrolls
  const sharpen = useRef(0); // after they end: the hint that rasterises the cards again
  const [layout, setLayout] = useState(null);
  const [active, setActiveState] = useState(null);
  // The frame loop asks every frame; React hears only when the centred card
  // actually changes (and then re-renders just the two cards involved:
  // ProjectCard is memoised and its props are stable).
  const activeRef = useRef(null);
  const setActive = useCallback((i) => {
    if (activeRef.current === i) return;
    activeRef.current = i;
    setActiveState(i);
  }, []);

  const items = () => [...(stripRef.current?.children ?? [])];

  // The stack's depth on each card's view timeline (lib/strip.js →
  // stackKeyframes), shaped by its height in screens, from a scroll's first
  // event; again when either changes.
  const bindStack = useCallback(() => {
    const vh = window.innerHeight;
    if (timed.current.length) {
      timed.current.forEach((a, i) => a.effect.setKeyframes(stackKeyframes(items()[i].offsetHeight / vh)));
      return;
    }
    timed.current = items().map((el) =>
      el.animate(stackKeyframes(el.offsetHeight / vh), {
        timeline: new window.ViewTimeline({ subject: el, axis: "block" }),
        rangeStart: "cover 0%",
        rangeEnd: "cover 100%",
        fill: "both",
      })
    );
  }, []);
  const unbindStack = useCallback(() => {
    for (const a of timed.current) a.cancel();
    timed.current = [];
  }, []);
  // At rest: the values the animations show, as styles, and the animations
  // go. A card's layer can keep the raster from the animation (soft at its own
  // scale); a will-change hint a moment later has the browser rasterise it
  // again at its own scale, and the hint goes after that.
  const restStack = useCallback(() => {
    if (!timed.current.length) return;
    const vh = window.innerHeight;
    const els = items();
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const z = stackDepth(Math.abs(r.top + r.height / 2 - vh / 2) / vh);
      el.style.transform = `scale(${z.scale})`;
      el.style.opacity = String(z.opacity);
    }
    unbindStack();
    clearTimeout(sharpen.current);
    sharpen.current = setTimeout(() => {
      if (timed.current.length) return;
      for (const el of els) el.style.willChange = "transform";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!timed.current.length) for (const el of els) el.style.willChange = "";
        })
      );
    }, REST_MS);
  }, [unbindStack]);

  const frame = useCallback((now) => {
    raf.current = 0;
    const strip = stripRef.current, track = trackRef.current;
    if (!strip || !track) return;
    const vh = window.innerHeight;
    const t = track.getBoundingClientRect();
    const onScreen = t.bottom > 0 && t.top < vh;
    const stillOff = !onScreen && !wasOnScreen.current;
    wasOnScreen.current = onScreen;
    if (stillOff && mode.current) return;

    if (mode.current === "strip") {
      const L = layoutRef.current;
      const target = clamp01(-t.top / (t.height - vh));
      const dt = lastFrame.current ? Math.min(now - lastFrame.current, 100) : 16.7;
      const prev = shown.current;
      shown.current = prev === null || !onScreen ? target : smoothStep(prev, target, dt);
      const moving = shown.current !== target;
      lastFrame.current = moving ? now : 0;
      const f = focusAt(shown.current, COUNT);
      const o = stripOffset(f, L);
      strip.style.transform = `translate3d(${o.x}px, ${o.y}px, 0)`;
      items().forEach((el, i) => {
        const d = Math.abs(i - f);
        const z = depthAt(d);
        el.style.transform = z.scale === 1 ? "" : `scale(${z.scale})`;
        el.style.opacity = z.opacity === 1 ? "" : String(z.opacity);
        el.style.filter = z.blur > 0.05 ? `blur(${+z.blur.toFixed(2)}px) saturate(${+z.saturate.toFixed(2)})` : "";
        el.style.zIndex = String(100 - Math.round(d * 10));
      });
      strip.dataset.settled = String(!moving);
      const nearest = Math.round(f);
      setActive(onScreen && Math.abs(nearest - f) < 0.5 && nearest < END ? nearest : null);
      if (moving) raf.current = requestAnimationFrame(frame);
      return;
    }

    if (mode.current === "stack") {
      const els = items();
      const centres = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      // While the stack scrolls each card is a compositor layer of its own, so
      // a scroll frame's new scale and opacity re-composite it instead of
      // repainting every card (a phone's main stall in this section:
      // docs/v3/perf-2026-10-29.md → Finding A). A layer keeps the scale it
      // was rasterised at, which softens its text at any other, so the layers
      // go once the scroll rests and the cards repaint sharp where they stop.
      // With view timelines the animations are the layers, and this writes
      // only while they're not running (before the first scroll).
      const timeline = timelines.current;
      if (!timeline || !timed.current.length)
        els.forEach((el, i) => {
          const z = stackDepth(Math.abs(centres[i] - vh / 2) / vh);
          if (!timeline) el.style.willChange = "transform, opacity";
          el.style.transform = `scale(${z.scale})`;
          el.style.opacity = String(z.opacity);
        });
      clearTimeout(rest.current);
      rest.current = setTimeout(() => {
        if (mode.current !== "stack") return;
        if (timeline) restStack();
        else for (const el of items()) el.style.willChange = "";
      }, REST_MS);
      if (keyboard.current) return setActive(focused.current);
      const i = onScreen ? nearestToCentre(centres, vh) : -1;
      // The end card is a candidate too: when it is nearest, no project card is.
      setActive(i < 0 || i === END ? null : i);
    }
  }, [restStack]);

  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame);
  }, [frame]);

  // Mode and layout: the strip on wide screens with motion allowed, the stack
  // below md, the plain list under reduced motion.
  useEffect(() => {
    const wide = window.matchMedia(WIDE);
    const supported = "ViewTimeline" in window;
    const cards = new ResizeObserver(() => (timed.current.length ? bindStack() : schedule()));
    for (const el of items()) cards.observe(el);
    const measure = () => {
      const next = reduced ? null : wide.matches ? "strip" : "stack";
      if (next !== mode.current) {
        unbindStack();
        items().forEach(clearStyles);
        if (stripRef.current) {
          stripRef.current.style.transform = "";
          delete stripRef.current.dataset.settled;
        }
      }
      mode.current = next;
      const L =
        next === "strip"
          ? stripLayout({ vw: document.documentElement.clientWidth, vh: viewportRef.current?.clientHeight || window.innerHeight })
          : null;
      layoutRef.current = L;
      setLayout(L);
      timelines.current = next === "stack" && supported;
      if (timed.current.length) bindStack();
      shown.current = null; // snap after a resize
      if (!next) setActive(null);
      schedule();
    };
    measure();
    window.addEventListener("resize", measure);
    wide.addEventListener("change", measure);
    return () => {
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", measure);
      cards.disconnect();
      unbindStack();
    };
  }, [reduced, schedule, bindStack, unbindStack]);

  // Scroll drives the frames; a Tab press hands control to focus until the
  // pointer is next used.
  useEffect(() => {
    const onPointerDown = () => {
      keyboard.current = false;
      schedule();
    };
    const onKey = (e) => {
      if (e.key === "Tab") keyboard.current = true;
    };
    // The stack's animations start from the scroll's first event, not a
    // frame later.
    const onScroll = () => {
      if (timelines.current && !timed.current.length) bindStack();
      schedule();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true, capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      clearTimeout(rest.current);
      clearTimeout(sharpen.current);
    };
  }, [schedule, bindStack]);

  // In the strip, brings item i (a card, or the end card) to the centre when
  // it was reached by keyboard. A frame later, so it lands after the
  // browser's own scroll to the newly focused element.
  const scrollStripTo = useCallback((i) => {
    if (mode.current !== "strip" || !keyboard.current) return;
    requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track) return;
      const top = track.getBoundingClientRect().top + window.scrollY;
      const p = progressForCard(i, COUNT);
      window.scrollTo({ top: top + p * (track.offsetHeight - window.innerHeight), behavior: "instant" });
    });
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

  // Each card's place, stable between renders (so the memoised cards skip).
  const places = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        if (!layout) return { className: STACK_ITEM };
        const { left, top } = cardPosition(i, layout);
        return { style: { position: "absolute", left, top, width: layout.cardW } };
      }),
    [layout]
  );
  const onEndFocus = useCallback(() => scrollStripTo(END), [scrollStripTo]);

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
            <div className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-3">
              <p className="max-w-xl text-base md:text-lg text-ink-soft">
                Five favourites from a growing shelf. The rest, and what&rsquo;s on the way, is on the portfolio page.
              </p>
              <a
                href="/portfolio"
                data-hover
                className="group inline-flex items-center gap-2 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.2em] text-electric link-line"
              >
                All work
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      <div ref={trackRef} data-strip-track style={TRACK_STYLE} className="relative mt-16 md:mt-24 js:motion-safe:md:h-(--pin-track)">
        <div
          ref={viewportRef}
          data-strip-viewport
          className="js:motion-safe:md:sticky js:motion-safe:md:top-0 js:motion-safe:md:h-svh js:motion-safe:md:overflow-clip"
        >
          <div
            ref={stripRef}
            data-strip
            onBlur={onBlur}
            className={layout ? "absolute left-0 top-0" : "flex flex-col gap-16 px-4 pb-32 md:gap-24 md:px-10 md:pb-44"}
          >
            {CARDS.map((p, i) => (
              <ProjectCard key={p.slug} project={p} index={i} active={active === i} onFocusCard={onFocusCard} {...places[i]} />
            ))}
            <EndCard onFocus={onEndFocus} {...places[END]} />
          </div>
        </div>
      </div>
    </section>
  );
}
