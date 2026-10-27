"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { EASE, shouldPlayIntro } from "@/lib/motion";

// Every-reload intro, on every page (Damian, Phase 5): the name + coordinates
// resolve out of glitch characters (same visual language as GlitchField).
// Mounted once by the page transition (components/transition/), which owns
// the sequence: once its veil is drawn behind the stamp (`glyphs`), the
// stamp's ivory gives way to the covered glyph field; when the name has
// resolved (`onDone`), the stamp fades and the veil's sweep reveals the page.
// If the veil isn't drawn by then, the ivory curtain wipes upward instead, as
// it did before. Reduced-motion-gated via shouldPlayIntro(); Hero shifts its
// delays by INTRO_OFFSET on the same decision. pointer-events-none — it can
// never trap a click.
//
// The curtain is SSR-rendered so it covers the page from the very first paint:
// pre-hydration visitors see the static glitch stamp instead of a blank page,
// and the hero content painting beneath it records an early LCP (Lighthouse).
// Two CSS gates in globals.css hide `.intro-stamp` for visitors the effect
// must never reach: reduced-motion (media query) and no-JS (html:not(.js) —
// nothing would ever remove the curtain without JS).

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*+=<>/";
const LINES = ["DAMIAN DE CRUZ", "N 6.9271° / E 79.8612°"];
const RESOLVE_MS = 650;
const HOLD_MS = 250;

function scramble(line, progress, rand = Math.random) {
  const resolved = Math.floor(line.length * progress);
  let out = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    out += i < resolved || c === " " ? c : CHARS[(rand() * CHARS.length) | 0];
  }
  return out;
}

// Deterministic zero-progress frame — the server and the first client render
// must produce identical text or hydration would mismatch.
const seeded = (
  (i) => () =>
    ((i = (i * 1103515245 + 12345) & 0x7fffffff) % 1000) / 1000
)(42);
const INITIAL = LINES.map((l) => scramble(l, 0, seeded));

// The stamp leaves by fading over the veil, or by the old upward wipe.
const VARIANTS = {
  exit: (glyphs) =>
    glyphs
      ? { opacity: 0, transition: { duration: 0.2, ease: EASE } }
      : { clipPath: "inset(0 0 100% 0)", transition: { duration: 0.35, ease: EASE } },
};

// One span per letter, so the letters can shimmer (CSS, globals.css) from the
// first paint until the decode takes over.
function Letters({ text }) {
  return [...text].map((c, i) => (
    <span key={i} data-ch="" style={{ "--i": i }}>
      {c}
    </span>
  ));
}

// `active` is true at SSR: the curtain is part of the server HTML.
export default function IntroStamp({ active, glyphs = false, onDone }) {
  const [display, setDisplay] = useState(INITIAL);
  // The frozen server-HTML letters shimmer until the decode starts.
  const [decoding, setDecoding] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!shouldPlayIntro()) return;
    // Slow connection: the static stamp has already been on screen for
    // seconds (SSR curtain) — resolve quickly instead of holding the page
    // hostage for another full second. Prompt loads play the full timing.
    const late = performance.now() > 2500;
    const resolveMs = late ? 220 : RESOLVE_MS;
    const holdMs = late ? 80 : HOLD_MS;
    const start = performance.now();
    setDecoding(true);
    const id = setInterval(() => {
      const t = performance.now() - start;
      if (t >= resolveMs + holdMs) {
        clearInterval(id);
        done.current?.();
        return;
      }
      const p = Math.min(1, t / resolveMs);
      setDisplay(LINES.map((l) => scramble(l, p)));
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence custom={glyphs}>
      {active && (
        <motion.div
          aria-hidden="true"
          // scrambled letters: never a search snippet
          data-nosnippet=""
          data-glyphs={glyphs ? "" : undefined}
          data-shimmer={decoding ? undefined : ""}
          custom={glyphs}
          variants={VARIANTS}
          exit="exit"
          // Above the veil (z-70), so the name sits over the glyph field. Its
          // backgrounds (ivory with a faint glow, then a soft halo over the
          // glyphs) are in globals.css.
          className="intro-stamp fixed inset-0 z-75 pointer-events-none grid place-items-center"
          style={{ clipPath: "inset(0 0 0% 0)" }}
        >
          <div className="px-6 py-4 text-center font-mono uppercase">
            <div className="text-[13px] md:text-[15px] tracking-[0.3em] text-ink">
              <Letters text={display[0]} />
            </div>
            <div className="mt-3 text-[10px] md:text-[11px] tracking-[0.24em] text-ink-faint">
              <Letters text={display[1]} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
