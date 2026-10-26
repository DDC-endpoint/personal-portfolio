"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import EagerReveal from "./EagerReveal";
import HeroPortrait from "./HeroPortrait";
import { ScrambleText } from "./Scramble";
import { EASE, INTRO_OFFSET, shouldPlayIntro } from "@/lib/motion";

const SERVICES_BUTTON =
  "items-center gap-2 bg-electric text-ivory hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300 group";

function ServicesArrow() {
  return <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>;
}

export default function Hero() {
  const ref = useRef(null);
  // On a first visit the whole entrance chains after the intro stamp; on
  // repeat visits t0 is 0 and the sequence starts immediately. The memoized
  // shouldPlayIntro() guarantees this always matches IntroStamp's decision.
  const t0 = shouldPlayIntro() ? INTRO_OFFSET : 0;
  const at = (s) => t0 + s;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  // metadata fades quickly as soon as the user scrolls, so it never collides
  const metaOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  return (
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: at(1.15), duration: 0.8 }}>
          <div>N 6.9271° / E 79.8612°</div>
          <div className="mt-1 text-ink-faint">Colombo · Sri Lanka</div>
        </motion.div>
      </motion.div>
      <div className="absolute top-28 right-6 md:right-10 flex flex-col items-end gap-4 z-10">
        <motion.div style={{ opacity: metaOpacity }} className="section-label text-right">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: at(1.15), duration: 0.8 }}>
            <div>(001)</div>
            <div className="mt-1 text-ink-faint">Index / Landing</div>
          </motion.div>
        </motion.div>

        {/* Prominent Services CTA — stays visible while at the top, scrolls away with the hero */}
        <motion.a
          href="/services"
          data-hover
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: at(1.3), duration: 0.6, ease: EASE }}
          className={`hidden md:inline-flex ${SERVICES_BUTTON}`}
        >
          <ScrambleText text="Services" />
          <ServicesArrow />
        </motion.a>
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
          delay={at(0.1)}
          y={8}
          duration={0.6}
          className="mb-4 md:mb-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft"
        >
          Creative Technologist · Freelance Web Designer
        </EagerReveal>

        <h1 className="font-display tracking-tightest leading-[0.82] text-ink text-[17vw] md:text-[13.5vw] uppercase">
          <div className="pb-[0.04em]">
            <span>Damian</span>
          </div>
          <div className="pb-[0.04em] -mt-2 md:-mt-4">
            <span className="italic font-display text-electric">de&nbsp;</span>
            <span>Cruz.</span>
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
            className="col-span-12 md:col-span-5 text-lg md:text-xl leading-snug text-ink-soft max-w-md"
          >
            In my second year of <span className="italic font-display text-ink">BSc (Hons) Computer Science</span>{" "}
            at the Informatics Institute of Technology, Colombo, the University of Westminster&rsquo;s
            campus in Sri Lanka. Building things on the internet at the seam of code, design and curiosity.
          </EagerReveal>
        </div>

        {/* Mobile only: the top-right CTA is hidden below md, so the hero
            ends on a full-width Services button instead */}
        <a href="/services" data-hover className={`md:hidden mt-6 flex w-full justify-center ${SERVICES_BUTTON}`}>
          <ScrambleText text="Services" />
          <ServicesArrow />
        </a>
      </motion.div>
    </section>
  );
}
