"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE, shouldPlayIntro } from "@/lib/motion";

// Every-reload intro: the name + coordinates resolve out of glitch characters
// (same visual language as GlitchField), then the ivory curtain wipes upward
// into the hero entrance. Reduced-motion-gated via shouldPlayIntro(); Hero
// shifts its delays by INTRO_OFFSET on the same decision. pointer-events-none
// — it can never trap a click.
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

export default function IntroStamp() {
  // true at SSR: the curtain is part of the server HTML.
  const [active, setActive] = useState(true);
  const [display, setDisplay] = useState(INITIAL);

  useEffect(() => {
    if (!shouldPlayIntro()) {
      setActive(false);
      return;
    }
    // Slow connection: the static stamp has already been on screen for
    // seconds (SSR curtain) — resolve quickly instead of holding the page
    // hostage for another full second. Prompt loads play the full timing.
    const late = performance.now() > 2500;
    const resolveMs = late ? 220 : RESOLVE_MS;
    const holdMs = late ? 80 : HOLD_MS;
    const start = performance.now();
    const id = setInterval(() => {
      const t = performance.now() - start;
      if (t >= resolveMs + holdMs) {
        clearInterval(id);
        setActive(false);
        return;
      }
      const p = Math.min(1, t / resolveMs);
      setDisplay(LINES.map((l) => scramble(l, p)));
    }, 50);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.35, ease: EASE }}
          className="intro-stamp fixed inset-0 z-65 bg-ivory pointer-events-none grid place-items-center"
          style={{ clipPath: "inset(0 0 0% 0)" }}
        >
          <div className="text-center font-mono uppercase">
            <div className="text-[13px] md:text-[15px] tracking-[0.3em] text-ink">
              {display[0]}
            </div>
            <div className="mt-3 text-[10px] md:text-[11px] tracking-[0.24em] text-ink-faint">
              {display[1]}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
