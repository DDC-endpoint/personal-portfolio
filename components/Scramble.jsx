"use client";
import { useCallback, useEffect, useRef } from "react";
import { scrambleText, TICK_MS, LABEL_MS, LINK_MS } from "@/lib/decode";

// Scramble-and-resolve for mono text: § section labels decode as they enter
// view, mono buttons scramble on hover/focus. Links that already have the
// underline draw (nav, "Services & pricing") don't scramble too (Damian). The text lives
// in ONE node and the font is mono, so the width never changes mid-run.
// Text is written straight to the DOM node each tick — never React state.
// Reduced motion: play() is a no-op, the text stays as rendered.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Returns play(): (re)starts a left-to-right resolve of `text` over
// `durationMs`. aria-busy is set while the node holds noise, and the optional
// onRun(true / false) brackets the run.
export function useScramble(ref, text, durationMs, onRun) {
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return useCallback(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    let last = -Infinity;
    el.setAttribute("aria-busy", "true");
    onRun?.(true);
    const step = (now) => {
      const t = now - start;
      if (t >= durationMs) {
        el.textContent = text;
        el.removeAttribute("aria-busy");
        onRun?.(false);
        return;
      }
      if (now - last >= TICK_MS) {
        last = now;
        el.textContent = scrambleText(text, t / durationMs);
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [ref, text, durationMs, onRun]);
}

// § section label — decodes once, the first time it scrolls into view.
// While its letters hold noise they are aria-hidden and a static sr-only copy
// (hidden the rest of the time) carries the label, like ScrambleText below.
export function DecodeLabel({ as: Tag = "div", className = "", children }) {
  const ref = useRef(null);
  const letters = useRef(null);
  const srCopy = useRef(null);
  // Explicit "true" values: an empty aria-hidden is ignored by assistive tech.
  const onRun = useCallback((running) => {
    for (const [el, attr] of [[ref.current, "aria-busy"], [letters.current, "aria-hidden"]]) {
      if (running) el?.setAttribute(attr, "true");
      else el?.removeAttribute(attr);
    }
    if (srCopy.current) srCopy.current.hidden = !running;
  }, []);
  const play = useScramble(letters, children, LABEL_MS, onRun);

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
      <span ref={letters} data-letters>
        {children}
      </span>
      <span ref={srCopy} className="sr-only" hidden>
        {children}
      </span>
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
