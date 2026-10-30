"use client";
import { motion, useAnimationControls } from "framer-motion";
import { createContext, useContext, useEffect, useRef } from "react";
import EagerReveal from "./EagerReveal";
import HeroPortrait from "./HeroPortrait";
import { useHeroDrift } from "./useHeroDrift";
import { EASE, onReveal } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

// The hero's entrance plays on every arrival on Home (Phase 6: first load,
// reload or page change), starting as the curtain clears (lib/motion.js →
// onReveal). Until then the name waits below its line mask. It runs on
// animation controls, not state, so the reveal re-renders nothing: that
// frame is already busy with the lifting curtain and the portrait's wave.
const Entrance = createContext({ words: null, fades: null });

function Word({ children, delay = 0 }) {
  const { words } = useContext(Entrance);
  // No overflow-hidden here — clipping is handled at the line-div level so
  // italic glyph overhang is never cut on either side.
  return (
    <motion.span custom={delay} initial={{ y: "110%" }} animate={words} className="inline-block">
      {children}
    </motion.span>
  );
}

function Fade({ children, delay }) {
  const { fades } = useContext(Entrance);
  return (
    <motion.div custom={delay} initial={{ opacity: 0 }} animate={fades}>
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const words = useAnimationControls();
  const fades = useAnimationControls();
  const entrance = useRef({ words, fades }).current;
  useEffect(() => {
    if (reduced) {
      words.set({ y: 0 });
      fades.set({ opacity: 1 });
      return;
    }
    return onReveal(() => {
      words.start((delay) => ({ y: 0, transition: { duration: 1, ease: EASE, delay } }));
      fades.start((delay) => ({ opacity: 1, transition: { delay, duration: 0.8 } }));
    });
  }, [reduced, words, fades]);
  // The content drifts up and fades as the page scrolls away; the corner
  // metadata fades as soon as it scrolls, so it never collides
  // (lib/heroDrift.js, drawn by the compositor where it can be).
  useHeroDrift(ref);

  return (
    <Entrance.Provider value={entrance}>
    <section id="top" ref={ref} className="relative min-h-screen w-full overflow-hidden pt-44 md:pt-52">
      {/* atmospheric blue blobs — dimmed in dark mode so the sky orb behind
          the portrait doesn't fight the blue glyphs */}
      <div className="absolute -top-40 -right-32 w-[60vw] h-[60vw] rounded-full bg-sky/70 dark:bg-sky/15 blur-3xl blob pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-[40vw] h-[40vw] rounded-full bg-mist dark:bg-[#122848] blur-3xl blob pointer-events-none" style={{ animationDelay: "-6s" }} />

      {/* corner metadata — coordinates top-left, index top-right; both fade out on scroll */}
      <div data-drift-meta className="absolute top-28 left-6 md:left-10 section-label">
        <Fade delay={1.15}>
          <div>N 6.9271° / E 79.8612°</div>
          <div className="mt-1 text-ink-faint">Colombo · Sri Lanka</div>
        </Fade>
      </div>
      <div className="absolute top-28 right-6 md:right-10 flex flex-col items-end gap-4 z-10">
        <div data-drift-meta className="section-label text-right">
          <Fade delay={1.15}>
            <div>(001)</div>
            <div className="mt-1 text-ink-faint">Index / Landing</div>
          </Fade>
        </div>
      </div>

      {/* The drifting content is three siblings sharing one scroll drift, so
          on mobile the portrait sits between the name and the lede while on
          desktop it is absolute against the section (a transformed parent
          would otherwise become its containing block). */}
      <div data-drift className="relative px-6 md:px-10">
        {/* Role kicker — fades in before the name animates. EagerReveal keeps
            it painted in the SSR HTML (early LCP) and replays the entrance
            after hydration, invisible behind the intro curtain. */}
        <EagerReveal
          delay={0.1}
          y={8}
          duration={0.6}
          className="mb-4 md:mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft"
        >
          Creative Technologist · Freelance Web Designer
        </EagerReveal>

        <h1 className="font-display tracking-tightest leading-[0.82] text-ink text-[17vw] md:text-[13.5vw] uppercase">
          {/* Each line rises as one unit from behind its line-level mask. */}
          <div className="overflow-hidden pb-[0.04em] flex flex-wrap items-end gap-x-[0.04em]">
            <Word delay={0.25}>Damian</Word>
          </div>
          <div className="overflow-hidden pb-[0.04em] flex flex-wrap items-end gap-x-[0.04em] -mt-2 md:-mt-4">
            <Word delay={0.4}>
              <span className="italic font-display text-electric">De&nbsp;</span>
            </Word>
            <Word delay={0.4}>Cruz.</Word>
          </div>
        </h1>
      </div>

      {/* Portrait stage — 4:5, bottom-anchored on desktop, height-capped so
          its label clears the nav (values: docs/v3/hero-portrait.md) */}
      <div
        data-drift
        className="mx-auto mt-8 w-[min(86vw,60vh)] aspect-[4/5] md:absolute md:bottom-0 md:mt-0 md:right-[calc(40px+5vw)] md:w-[min(40vw,72vh,calc((100vh-190px)*0.8))] max-[1100px]:md:right-10 max-[1100px]:md:w-[min(38vw,72vh,calc((100vh-190px)*0.8))]"
      >
        <HeroPortrait />
      </div>

      <div data-drift className="relative px-6 md:px-10 pb-16 md:pb-0">
        <div className="mt-10 md:mt-16 grid grid-cols-12 gap-6 items-end">
          {/* The largest above-fold text block = the LCP element on both form
              factors — replay={false} keeps it painted from the very first
              frame and it never fades (Damian, V3 planning). */}
          <EagerReveal
            as="p"
            replay={false}
            className="col-span-12 md:col-span-5 text-lg md:text-xl leading-snug text-ink-soft max-w-lg"
          >
            In my second year of <span className="italic font-display text-ink">BSc (Hons) Computer Science</span>{" "}
            at the Informatics Institute of Technology, Colombo, the University of Westminster&rsquo;s
            campus in Sri Lanka. Building things on the internet at the seam of code, design and curiosity.
          </EagerReveal>
        </div>

      </div>
    </section>
    </Entrance.Provider>
  );
}
