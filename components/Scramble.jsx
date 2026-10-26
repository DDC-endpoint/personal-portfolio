"use client";
import { useCallback, useEffect, useRef } from "react";
import { scrambleText, TICK_MS, LABEL_MS, LINK_MS } from "@/lib/decode";

// Scramble-and-resolve for mono text: § section labels decode as they enter
// view, nav links and mono buttons scramble on hover/focus. The text lives
// in ONE node and the font is mono, so the width never changes mid-run.
// Text is written straight to the DOM node each tick — never React state.
// Reduced motion: play() is a no-op, the text stays as rendered.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Returns play(): (re)starts a left-to-right resolve of `text` over
// `durationMs`. aria-busy is set while the node holds noise.
export function useScramble(ref, text, durationMs) {
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return useCallback(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    let last = -Infinity;
    el.setAttribute("aria-busy", "true");
    const step = (now) => {
      const t = now - start;
      if (t >= durationMs) {
        el.textContent = text;
        el.removeAttribute("aria-busy");
        return;
      }
      if (now - last >= TICK_MS) {
        last = now;
        el.textContent = scrambleText(text, t / durationMs);
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [ref, text, durationMs]);
}

// § section label — decodes once, the first time it scrolls into view.
export function DecodeLabel({ as: Tag = "div", className = "", children }) {
  const ref = useRef(null);
  const play = useScramble(ref, children, LABEL_MS);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        play();
      },
      { rootMargin: "0px 0px -80px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

// Link / button label — scrambles when its link or button is hovered or
// focused. The visible copy is aria-hidden and a static sr-only copy carries
// the accessible name, so assistive tech never reads the noise.
export function ScrambleText({ text }) {
  const ref = useRef(null);
  const play = useScramble(ref, text, LINK_MS);

  useEffect(() => {
    const trigger = ref.current?.closest("a, button");
    if (!trigger) return;
    trigger.addEventListener("pointerenter", play);
    trigger.addEventListener("focus", play);
    return () => {
      trigger.removeEventListener("pointerenter", play);
      trigger.removeEventListener("focus", play);
    };
  }, [play]);

  return (
    <>
      <span ref={ref} aria-hidden="true">
        {text}
      </span>
      <span className="sr-only">{text}</span>
    </>
  );
}
