"use client";
import { motion, useInView } from "framer-motion";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { Children, isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { EASE, VIEWPORT, isRevealed, onReveal } from "@/lib/motion";

// Masked line reveal for headings: the rendered text is measured into real
// wrapped lines, then each line rises from behind an overflow-hidden mask.
//
// - SSR renders the words as plain text spans (real content for SEO, no CLS).
// - Splitting happens client-side after `document.fonts.ready` (Instrument
//   Serif changes wrap points, so measuring on fallback metrics would split
//   at the wrong words).
// - Resize re-measures (debounced, width-change only); once the reveal has
//   played, new line groupings render in their final state — no replay.
// - Fallbacks (reduced motion, unsupported children, measurement failure)
//   render the original children with a plain Reveal-style fade.

// Flattens children into a stream of { text, className } pieces. Only strings
// and (nested) <span>s are supported — anything else aborts to the fallback.
function flatten(children, inherited, out) {
  for (const child of Children.toArray(children)) {
    if (child === null || child === false) continue;
    if (typeof child === "string" || typeof child === "number") {
      out.push({ text: String(child), className: inherited });
    } else if (isValidElement(child) && child.type === "span") {
      const cls = [inherited, child.props.className || ""].filter(Boolean).join(" ");
      if (!flatten(child.props.children, cls, out)) return false;
    } else {
      return false;
    }
  }
  return true;
}

// Groups the flat stream into whitespace-separated "words". A word can span
// styled boundaries (e.g. <span class="italic">talk</span> followed by ".")
// — those parts stay glued in one non-breaking group so punctuation never
// wraps onto its own line.
function tokenize(children) {
  const stream = [];
  if (!flatten(children, "", stream)) return null;
  const words = [];
  let current = [];
  for (const piece of stream) {
    for (const seg of piece.text.split(/(\s+)/)) {
      if (!seg) continue;
      if (/^\s+$/.test(seg)) {
        if (current.length) {
          words.push(current);
          current = [];
        }
      } else {
        current.push({ text: seg, className: piece.className });
      }
    }
  }
  if (current.length) words.push(current);
  return words.length ? words : null;
}

function WordSpan({ word }) {
  return (
    <span data-word="" className="inline-block whitespace-nowrap">
      {word.map((part, j) =>
        part.className ? (
          <span key={j} className={part.className}>
            {part.text}
          </span>
        ) : (
          <span key={j}>{part.text}</span>
        )
      )}
    </span>
  );
}

export default function SplitLines({
  children,
  as = "h2",
  className = "",
  delay = 0,
  stagger = 0.09,
  duration = 1,
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;

  const containerRef = useRef(null);
  const measureRef = useRef(null);
  const hasPlayedRef = useRef(false);
  const [lines, setLines] = useState(null); // number[][] of word indices
  const [failed, setFailed] = useState(false);
  const [measurePass, setMeasurePass] = useState(0);

  const words = useMemo(() => tokenize(children), [children]);
  const plainText = useMemo(
    () => (words ? words.map((w) => w.map((p) => p.text).join("")).join(" ") : ""),
    [words]
  );

  const canSplit = !reduce && !failed && words !== null;
  const inView = useInView(containerRef, { once: true, margin: VIEWPORT.margin });
  // A heading in view on arrival rises as the curtain clears (lib/motion.js).
  const [revealed, setRevealed] = useState(isRevealed);
  useEffect(() => onReveal(() => setRevealed(true)), []);

  // Measure real line breaks: wait for the display font, then one batched
  // read of every word's offsetTop, grouped into lines.
  useEffect(() => {
    if (!canSplit || lines !== null) return;
    let cancelled = false;
    let raf;
    (async () => {
      try {
        await document.fonts.ready;
      } catch {}
      if (cancelled) return;
      raf = requestAnimationFrame(() => {
        if (cancelled || !measureRef.current) return;
        const spans = measureRef.current.querySelectorAll("[data-word]");
        if (!spans.length) {
          setFailed(true);
          return;
        }
        const groups = [];
        let lastTop = null;
        spans.forEach((s, idx) => {
          const top = s.offsetTop;
          if (lastTop === null || Math.abs(top - lastTop) > 2) {
            groups.push([]);
            lastTop = top;
          }
          groups[groups.length - 1].push(idx);
        });
        setLines(groups);
      });
    })();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [canSplit, lines, words, measurePass]);

  // Re-split when the container width actually changes (debounced). Going
  // back to `lines = null` re-renders the natural flow for one frame, which
  // is exactly what a plain heading does on resize anyway.
  useEffect(() => {
    if (!canSplit) return;
    let width = containerRef.current?.clientWidth ?? 0;
    let t;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const w = containerRef.current?.clientWidth ?? 0;
        if (w && w !== width) {
          width = w;
          setLines(null);
          setMeasurePass((k) => k + 1);
        }
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
    };
  }, [canSplit]);

  // Fallback: plain children, Reveal-equivalent fade.
  if (!canSplit) {
    return (
      <Tag
        ref={containerRef}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration, ease: EASE, delay }}
        className={className}
      >
        {children}
      </Tag>
    );
  }

  const played = hasPlayedRef.current;
  const show = inView && revealed && lines !== null;

  return (
    <Tag ref={containerRef} className={className}>
      {/* Split innards are hidden from AT — a visually-hidden span carries the
          one coherent string instead of per-word soup. (aria-label is invalid
          on generic elements like <p>, so this works for every `as`.) */}
      <span className="sr-only">{plainText}</span>
      <span aria-hidden="true" className="block">
        {lines === null ? (
          <span
            ref={measureRef}
            className={`block ${played ? "" : "opacity-0 nojs:opacity-100"}`}
          >
            {words.map((w, i) => (
              <WordSpan key={i} word={w} />
            )).reduce((acc, el, i) => (i ? [...acc, " ", el] : [el]), [])}
          </span>
        ) : (
          lines.map((line, li) => (
            // 0.14em descender allowance (offset by the negative margin so the
            // block height doesn't change): italic serif descenders (g, y, j)
            // reach far deeper than the hero's all-caps 0.04em needs.
            <span key={li} className="block overflow-hidden pb-[0.14em] mb-[-0.14em]">
              <motion.span
                className="inline-block will-change-transform"
                initial={played ? false : { y: "120%" }}
                animate={{ y: show || played ? "0%" : "120%" }}
                transition={{ duration, ease: EASE, delay: delay + li * stagger }}
                onAnimationComplete={() => {
                  // Only the real reveal counts — this also fires for the
                  // hidden-state no-op animation while below the fold.
                  if (show && li === lines.length - 1) hasPlayedRef.current = true;
                }}
              >
                {line
                  .map((wi) => <WordSpan key={wi} word={words[wi]} />)
                  .reduce((acc, el, i) => (i ? [...acc, " ", el] : [el]), [])}
              </motion.span>
            </span>
          ))
        )}
      </span>
    </Tag>
  );
}
