"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import EagerReveal from "./EagerReveal";
import HeroPortrait from "./HeroPortrait";
import { EASE, onReveal } from "@/lib/motion";
import { useReducedMotion } from "@/lib/useReducedMotion";

// The hero's entrance plays on every arrival on Home (Phase 6: first load,
// reload or page change), starting as the curtain clears (lib/motion.js →
// onReveal). Until then the name waits below its line mask.
const Shown = createContext(false);

function Word({ children, delay = 0 }) {
  const shown = useContext(Shown);
  // No overflow-hidden here — clipping is handled at the line-div level so
  // italic glyph overhang is never cut on either side.
  return (
    <motion.span
      initial={{ y: "110%" }}
      animate={shown ? { y: 0 } : { y: "110%" }}
      transition={shown ? { duration: 1, ease: EASE, delay } : { duration: 0 }}
      className="inline-block"
    >
      {children}
    </motion.span>
  );
}

function Fade({ children, delay }) {
  const shown = useContext(Shown);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: shown ? 1 : 0 }} transition={shown ? { delay, duration: 0.8 } : { duration: 0 }}>
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  useEffect(() => onReveal(() => setRevealed(true)), []);
  const shown = revealed || reduced;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  // metadata fades quickly as soon as the user scrolls, so it never collides
  const metaOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
    <Shown.Provider value={shown}>
    <section id="top" ref={ref} className="relative min-h-screen w-full overflow-hidden pt-44 md:pt-52">
      {/* atmospheric blue blobs — dimmed in dark mode so the sky orb behind
          the portrait doesn't fight the blue glyphs */}
      <div className="absolute -top-40 -right-32 w-[60vw] h-[60vw] rounded-full bg-sky/70 dark:bg-sky/15 blur-3xl blob pointer-events-none" />
      <div className="absolute top-1/3 -left-40 w-[40vw] h-[40vw] rounded-full bg-mist dark:bg-[#122848] blur-3xl blob pointer-events-none" style={{ animationDelay: "-6s" }} />

      {/* corner metadata — coordinates top-left, index top-right; both fade out on scroll */}
      <motion.div
        style={{ opacity: metaOpacity }}
        className="absolute top-28 left-6 md:left-10 section-label"
      >
        <Fade delay={1.15}>
          <div>N 6.9271° / E 79.8612°</div>
          <div className="mt-1 text-ink-faint">Colombo · Sri Lanka</div>
        </Fade>
      </motion.div>
      <div className="absolute top-28 right-6 md:right-10 flex flex-col items-end gap-4 z-10">
        <motion.div style={{ opacity: metaOpacity }} className="section-label text-right">
          <Fade delay={1.15}>
            <div>(001)</div>
            <div className="mt-1 text-ink-faint">Index / Landing</div>
          </Fade>
        </motion.div>
      </div>

      {/* The drifting content is three siblings sharing one scroll drift, so
          on mobile the portrait sits between the name and the lede while on
          desktop it is absolute against the section (a transformed parent
          would otherwise become its containing block). */}
      <motion.div style={{ y, opacity }} className="relative px-6 md:px-10">
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
      </motion.div>

      {/* Portrait stage — 4:5, bottom-anchored on desktop, height-capped so
          its label clears the nav (values: docs/v3/hero-portrait.md) */}
      <motion.div
        style={{ y, opacity }}
        className="mx-auto mt-8 w-[min(86vw,60vh)] aspect-[4/5] md:absolute md:bottom-0 md:mt-0 md:right-[calc(40px+5vw)] md:w-[min(40vw,72vh,calc((100vh-190px)*0.8))] max-[1100px]:md:right-10 max-[1100px]:md:w-[min(38vw,72vh,calc((100vh-190px)*0.8))]"
      >
        <HeroPortrait />
      </motion.div>

      <motion.div style={{ y, opacity }} className="relative px-6 md:px-10 pb-16 md:pb-0">
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

      </motion.div>
    </section>
    </Shown.Provider>
  );
}
