"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import WorkRow from "./WorkRow";
import { PROJECTS } from "@/lib/projects";
import { WORK } from "@/lib/services";
import { nearestToCentre } from "@/lib/strip";
import { useReducedMotion } from "@/lib/useReducedMotion";

// /services § 03 Recent work: full-width editorial rows (WorkRow), each a
// Projects browser frame (skeleton, decode, screenshot) beside its text,
// swapping sides down the list. One row is active at a time, picked like
// Projects.jsx (see its header comment), minus the strip:
//   fine pointer: the card under the pointer, re-checked on scroll so a
//                 resting pointer works (Damian's stationary-hover rule)
//   touch:        the card nearest the centre of the screen
//   keyboard:     the focused card (a Tab press hands control to focus)
// Reduced motion: every screenshot shows (ProjectCard's CSS).

const FINE = "(hover: hover) and (pointer: fine)";

const CARDS = WORK.map((w, i) => ({
  ...PROJECTS.find((p) => p.slug === w.slug),
  n: String(i + 1).padStart(2, "0"),
  href: w.href,
  self: w.href === "/",
  blurb: w.note,
  tags: [w.tag],
}));

export default function RecentWork() {
  const gridRef = useRef(null);
  const pointer = useRef(null);
  const focused = useRef(null);
  const keyboard = useRef(false);
  const touch = useRef(false);
  const raf = useRef(0);
  const reduced = useReducedMotion();
  const reducedRef = useRef(false);
  const [active, setActive] = useState(null);

  const pick = useCallback(() => {
    const grid = gridRef.current;
    if (reducedRef.current || !grid) return null;
    if (keyboard.current) return focused.current;
    const vh = window.innerHeight;
    const g = grid.getBoundingClientRect();
    if (g.bottom <= 0 || g.top >= vh) return focused.current;
    if (window.matchMedia(FINE).matches && !touch.current) {
      const pt = pointer.current;
      const el = pt && document.elementFromPoint(pt.x, pt.y)?.closest("[data-card]");
      if (el && grid.contains(el)) return Number(el.dataset.card);
      return focused.current;
    }
    const cards = [...grid.querySelectorAll("[data-card]")];
    const i = nearestToCentre(
      cards.map((c) => {
        const r = c.getBoundingClientRect();
        return r.top + r.height / 2;
      }),
      vh
    );
    return i < 0 ? focused.current : i;
  }, []);

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      setActive(pick());
    });
  }, [pick]);

  useEffect(() => {
    reducedRef.current = reduced;
    schedule();
  }, [reduced, schedule]);

  useEffect(() => {
    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      keyboard.current = false;
      touch.current = false;
      pointer.current = { x: e.clientX, y: e.clientY };
      schedule();
    };
    const onPointerDown = (e) => {
      keyboard.current = false;
      if (e.pointerType === "touch") {
        touch.current = true;
        pointer.current = null;
        schedule();
      }
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
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("scroll", schedule);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [schedule]);

  const onFocusCard = useCallback(
    (i) => {
      focused.current = i;
      schedule();
    },
    [schedule]
  );

  const onBlur = (e) => {
    if (e.relatedTarget?.closest?.("[data-card]")) return; // the next card's focus takes over
    focused.current = null;
    schedule();
  };

  return (
    <div ref={gridRef} onBlur={onBlur}>
      {CARDS.map((p, i) => (
        <WorkRow
          key={p.slug}
          project={p}
          index={i}
          active={active === i}
          onFocusCard={onFocusCard}
          linkNote={p.self ? "(portfolio home)" : undefined}
        />
      ))}
    </div>
  );
}
