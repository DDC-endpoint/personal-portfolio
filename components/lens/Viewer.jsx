"use client";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FRAMES } from "@/lib/lens";
import { EASE } from "@/lib/motion";
import { ScrambleText } from "../Scramble";

// § 07 full-screen viewer (Damian): it expands from the photo's spot in the
// grid, steps with the arrow keys or a swipe, and closes with Esc or a click
// anywhere but its buttons, shrinking back into the current frame's tile.
// A modal dialog: focus moves to Close and Tab stays inside. The page under
// it is locked the way the mobile menu locks it (Nav): body overflow hidden
// and <main> inert, plus data-lenis-prevent so the smooth scroll ignores it.

const OPEN_MS = 450;
const SWIPE_PX = 50;
const TAP_PX = 10;
const ease = `cubic-bezier(${EASE.join(",")})`;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The transform that lays the viewer's photo box over `rect`.
function flipFrom(box, rect) {
  const b = box.getBoundingClientRect();
  return `translate(${rect.left - b.left}px, ${rect.top - b.top}px) scale(${rect.width / b.width}, ${rect.height / b.height})`;
}

const tilePhoto = (i) => document.querySelector(`[data-frame="${FRAMES[i].n}"] [data-photo]`);

export default function Viewer({ index, originRect, onClose, onStep }) {
  const root = useRef(null);
  const backdrop = useRef(null);
  const box = useRef(null);
  const closeBtn = useRef(null);
  const closing = useRef(false);
  const swipe = useRef({ x: 0, y: 0, id: null, onButton: false });
  const current = useRef(index);
  current.current = index;

  // Lock the page while open; focus Close.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mainEl = document.querySelector("main");
    mainEl?.setAttribute("inert", "");
    closeBtn.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      mainEl?.removeAttribute("inert");
    };
  }, []);

  // Expand from the tile (FLIP), with the backdrop fading in.
  useLayoutEffect(() => {
    if (reducedMotion() || !originRect) return;
    box.current.animate([{ transform: flipFrom(box.current, originRect) }, { transform: "none" }], {
      duration: OPEN_MS,
      easing: ease,
    });
    backdrop.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: ease });
    // Opening measures once; later steps don't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const i = current.current;
    const tile = tilePhoto(i);
    if (reducedMotion() || !tile) return onClose(i);
    const to = flipFrom(box.current, tile.getBoundingClientRect());
    box.current.animate([{ transform: "none" }, { transform: to }], { duration: OPEN_MS, easing: ease, fill: "forwards" });
    const fade = backdrop.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: OPEN_MS, easing: ease, fill: "forwards" });
    fade.finished.then(() => onClose(i), () => onClose(i));
  };

  // Keys: arrows step (wrapping), Esc closes, Tab cycles inside the dialog.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (closing.current) return;
      if (e.key === "Escape") return close();
      if (e.key === "ArrowRight") return onStep(1);
      if (e.key === "ArrowLeft") return onStep(-1);
      if (e.key !== "Tab") return;
      const els = root.current.querySelectorAll("button");
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!root.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  // A horizontal drag steps; a tap anywhere but a button closes. Taps are
  // read from the pointer itself, not from click: after a quick flick Chrome
  // can swallow the next tap's click, which left the viewer stuck open.
  const onPointerDown = (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId, onButton: !!e.target.closest("button") };
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    if (s.id !== e.pointerId) return;
    s.id = null;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE_PX) return onStep(dx < 0 ? 1 : -1);
    if (Math.hypot(dx, dy) < TAP_PX && !s.onButton && !e.target.closest("button")) close();
  };

  const f = FRAMES[index];
  const btn =
    "pointer-events-auto font-mono text-[11px] uppercase tracking-[0.18em] text-ivory dark:text-ink p-3 opacity-80 transition-opacity hover:opacity-100 focus-visible:opacity-100";

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      data-lenis-prevent
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      className="fixed inset-0 z-[100] flex touch-pan-y select-none flex-col items-center justify-center"
    >
      <div ref={backdrop} aria-hidden="true" className="absolute inset-0 bg-ink/95 dark:bg-ivory/95" />

      <div
        ref={box}
        data-viewer-photo
        className="relative aspect-3/4 h-[min(82vh,calc(92vw*4/3))] origin-top-left will-change-transform"
      >
        <Image
          key={f.n}
          src={f.src}
          alt={`${f.caption}, ${f.month}`}
          draggable={false}
          fill
          sizes="(min-aspect-ratio: 2/3) 62vh, 92vw"
          className="object-contain"
        />
      </div>

      <p
        data-viewer-caption
        aria-live="polite"
        className="relative mt-4 px-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-ivory dark:text-ink"
      >
        {`FRAME ${f.n} — ${f.caption} · ${f.month}`}
      </p>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2 md:px-6">
        <button type="button" aria-label="Previous photo" onClick={() => onStep(-1)} className={`${btn} text-2xl`}>
          ←
        </button>
        <button type="button" aria-label="Next photo" onClick={() => onStep(1)} className={`${btn} text-2xl`}>
          →
        </button>
      </div>
      <button
        ref={closeBtn}
        type="button"
        aria-label="Close viewer"
        onClick={close}
        className={`${btn} absolute right-2 top-3 md:right-6 md:top-5`}
      >
        <ScrambleText text="Close" /> <span aria-hidden="true">✕</span>
      </button>
    </div>,
    document.body
  );
}
