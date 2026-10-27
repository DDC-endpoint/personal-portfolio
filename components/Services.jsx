"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { Fragment, useRef } from "react";
import Reveal from "./Reveal";
import EagerReveal from "./EagerReveal";
import SplitLines from "./SplitLines";
import { DecodeLabel, ScrambleText } from "./Scramble";
import HowItWorks from "./services/HowItWorks";
import RecentWork from "./services/RecentWork";
import StartCard from "./services/StartCard";
import { EMAIL, WHATSAPP_LINK } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { BUSINESS, SERVICES_HERO, SERVICES, PRICING_NOTE, PRICES_UPDATED, FAQS } from "@/lib/services";

function CTAButtons() {
  return (
    <div className="flex flex-wrap gap-4">
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        data-hover
        className="group inline-flex items-center gap-3 bg-electric px-7 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ivory hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90 transition-colors duration-300"
      >
        <ScrambleText text="Message on WhatsApp" />
        <span className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
      </a>
      <a
        href={`mailto:${EMAIL}?subject=Website%20enquiry`}
        data-hover
        className="group inline-flex items-center gap-3 border border-ink px-7 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-ivory transition-colors duration-300"
      >
        <ScrambleText text="Email me" />
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </a>
    </div>
  );
}

export default function Services() {
  const introRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: introRef, offset: ["start start", "end start"] });
  // The (001) index label fades quickly on scroll, exactly like the homepage hero.
  const metaOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  return (
    <>
      {/* Intro */}
      <section id="top" ref={introRef} className="relative px-6 md:px-10 pt-40 md:pt-56 pb-20 md:pb-28 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-[55vw] h-[55vw] rounded-full bg-sky/60 dark:bg-sky/30 blur-3xl blob pointer-events-none" />

        {/* Corner index + Portfolio CTA — mirrors the homepage hero's top-right
            block (index label that fades on scroll, electric button below it).
            Desktop only; mobile reaches the portfolio via the nav overlay. */}
        <div className="hidden md:flex absolute top-28 right-6 md:right-10 flex-col items-end gap-4 z-10">
          <motion.div style={{ opacity: metaOpacity }} className="section-label text-right">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }}>
              <div>(002)</div>
              <div className="mt-1 text-ink-faint">Services / Hire</div>
            </motion.div>
          </motion.div>

          <motion.a
            href="/"
            data-hover
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
            className="group inline-flex items-center gap-2 bg-electric text-ivory hover:bg-electric/90 dark:bg-ink dark:text-ivory dark:hover:bg-ink/90 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors duration-300"
          >
            <ScrambleText text="Portfolio" />
            <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </motion.a>
        </div>

        <div className="grid grid-cols-12 gap-6 relative">
          {/* Above the fold: EagerReveal (not Reveal) so the hero paints in
              the SSR HTML — the lead paragraph is the page's LCP element. */}
          <div className="col-span-12 md:col-span-3">
            <EagerReveal>
              <div className="section-label">{BUSINESS.name}</div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">{BUSINESS.by}</div>
            </EagerReveal>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            {/* The kicker sits inside the H1, so the heading names the service
                and the place; it looks as it did. */}
            <h1>
              <EagerReveal as="span" delay={0.05} className="block font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft mb-5">
                {/* each half stays whole, so a phone wraps it at the dot */}
                {SERVICES_HERO.kicker.split(" · ").map((part, i, all) => (
                  <Fragment key={part}>
                    <span className="whitespace-nowrap">
                      {part}
                      {i < all.length - 1 && " ·"}
                    </span>
                    {i < all.length - 1 && " "}
                  </Fragment>
                ))}
              </EagerReveal>{" "}
              <SplitLines as="span" delay={0.1} className="block font-display text-5xl md:text-8xl leading-[0.92] tracking-tight text-ink">
                {SERVICES_HERO.heading[0]}
                <span className="italic text-electric">{SERVICES_HERO.heading[1]}</span>
                {SERVICES_HERO.heading[2]}
              </SplitLines>
            </h1>
            <EagerReveal replay={false}>
              <p className="mt-8 max-w-xl text-lg md:text-xl leading-relaxed text-ink-soft">
                {SERVICES_HERO.lead}
              </p>
            </EagerReveal>
            <EagerReveal delay={0.3}>
              <div className="mt-10">
                <CTAButtons />
              </div>
            </EagerReveal>
          </div>
        </div>
      </section>

      {/* What I do */}
      <section id="what-i-do" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <DecodeLabel className="section-label">§ 01 — What I do</DecodeLabel>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitLines as="h2" className="font-display text-4xl md:text-6xl leading-tight tracking-tight text-ink">
              Seven ways I can <span className="italic text-electric">help</span>.
            </SplitLines>
          </div>
        </div>

        <div>
          {SERVICES.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="grid grid-cols-12 gap-6 items-start border-t border-rule py-10 md:py-12 first:border-t-0">
                <div className="col-span-12 md:col-span-1">
                  <span className="font-mono text-[11px] tracking-[0.2em] text-ink-soft">({s.n})</span>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <h3 className="font-display text-3xl md:text-4xl leading-tight text-ink">{s.title}</h3>
                  <p className="mt-4 max-w-md text-base md:text-lg leading-relaxed text-ink-soft">{s.desc}</p>
                </div>
                <div className="col-span-12 md:col-span-3 flex flex-col gap-2">
                  {s.includes.map((it) => (
                    <div key={it} className="flex items-baseline gap-2 text-sm md:text-base text-ink-soft">
                      <span className="text-electric">—</span>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
                <div className="col-span-12 md:col-span-3 md:text-right">
                  <div className="font-display text-2xl md:text-3xl text-ink">{s.fromLKR}</div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint mt-1">
                    to start · intl from {s.fromUSD}
                  </div>
                  <div className="mt-3 inline-flex md:justify-end items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric" />
                    {s.turnaround}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-10 max-w-2xl text-sm md:text-base text-ink-faint leading-relaxed">
            {PRICING_NOTE} {PRICES_UPDATED}
          </p>
        </Reveal>
      </section>

      <HowItWorks />

      {/* Recent work */}
      <section id="recent" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <DecodeLabel className="section-label">§ 03 — Recent work</DecodeLabel>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitLines as="h2" className="font-display text-4xl md:text-6xl leading-tight tracking-tight text-ink">
              A few things I&rsquo;ve <span className="italic text-electric">shipped</span>.
            </SplitLines>
            <Reveal delay={0.1}>
              <a
                href="/"
                data-hover
                className="group mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-electric link-line"
              >
                See the full portfolio
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </a>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <RecentWork />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule bg-paper">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <DecodeLabel className="section-label">§ 04 — FAQ</DecodeLabel>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitLines as="h2" className="font-display text-4xl md:text-6xl leading-tight tracking-tight text-ink">
              Good questions, <span className="italic text-electric">answered</span>.
            </SplitLines>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            {FAQS.map((f, i) => (
              <Reveal key={i} delay={i * 0.04}>
                <details className="group border-t border-rule py-6 first:border-t-0">
                  <summary className="flex items-center justify-between gap-6 cursor-pointer list-none font-display text-xl md:text-2xl text-ink [&::-webkit-details-marker]:hidden">
                    <h3 className="font-normal">{f.q}</h3>
                    <span aria-hidden="true" className="font-mono text-electric text-2xl leading-none transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-2xl text-base md:text-lg text-ink-soft leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <StartCard />
    </>
  );
}
