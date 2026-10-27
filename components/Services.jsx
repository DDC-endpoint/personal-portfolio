"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Reveal from "./Reveal";
import EagerReveal from "./EagerReveal";
import SplitLines from "./SplitLines";
import { EMAIL, WHATSAPP_LINK } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { PROJECTS } from "@/lib/projects";
import { SERVICES_HERO, SERVICES, PRICING_NOTE, STEPS, WORK, FAQS, START_TEXT } from "@/lib/services";

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
        Message on WhatsApp
        <span className="transition-transform duration-300 group-hover:translate-x-1">↗</span>
      </a>
      <a
        href={`mailto:${EMAIL}?subject=Website%20enquiry`}
        data-hover
        className="group inline-flex items-center gap-3 border border-ink px-7 py-4 font-mono text-[11px] uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-ivory transition-colors duration-300"
      >
        Email me
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
            Portfolio
            <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
          </motion.a>
        </div>

        <div className="grid grid-cols-12 gap-6 relative">
          {/* Above the fold: EagerReveal (not Reveal) so the hero paints in
              the SSR HTML — the lead paragraph is the page's LCP element. */}
          <div className="col-span-12 md:col-span-3">
            <EagerReveal>
              <div className="section-label">Damian De Cruz</div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
                Web design & development
              </div>
            </EagerReveal>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <EagerReveal delay={0.05}>
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft mb-5">
                {SERVICES_HERO.kicker}
              </div>
            </EagerReveal>
            <SplitLines as="h1" delay={0.1} className="font-display text-5xl md:text-8xl leading-[0.92] tracking-tight text-ink">
              {SERVICES_HERO.heading[0]}
              <span className="italic text-electric">{SERVICES_HERO.heading[1]}</span>
              {SERVICES_HERO.heading[2]}
            </SplitLines>
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
              <div className="section-label">§ 01 — What I do</div>
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
            {PRICING_NOTE}
          </p>
        </Reveal>
      </section>

      {/* How it works */}
      <section id="process" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule bg-paper">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <div className="section-label">§ 02 — How it works</div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitLines as="h2" className="font-display text-4xl md:text-6xl leading-tight tracking-tight text-ink">
              From idea to live in <span className="italic text-electric">four steps</span>.
            </SplitLines>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-9 md:col-start-4 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 md:gap-y-14">
            {STEPS.map((st, i) => (
              <Reveal key={st.n} delay={i * 0.07}>
                <div className="flex gap-5">
                  <div className="font-display text-4xl md:text-5xl italic text-electric leading-none">{st.n}</div>
                  <div>
                    <h3 className="font-display text-2xl md:text-3xl text-ink">{st.title}</h3>
                    <p className="mt-2 max-w-md text-base text-ink-soft leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Recent work */}
      <section id="recent" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <div className="section-label">§ 03 — Recent work</div>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-rule border-y border-rule">
          {WORK.map((w, i) => {
            const external = w.href.startsWith("http");
            const title = PROJECTS.find((p) => p.slug === w.slug).title;
            return (
              <Reveal key={w.slug} delay={i * 0.06} className="h-full">
                <a
                  href={w.href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  data-hover
                  className="group relative overflow-hidden flex flex-col h-full bg-ivory px-7 py-9"
                >
                  {/* Hover fill: mist sweeps up from the bottom edge (same
                      treatment as the homepage project cards). */}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-mist origin-bottom scale-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-y-100"
                  />
                  <div className="relative section-label mb-3">{w.tag}</div>
                  <h3 className="relative font-display text-2xl md:text-3xl text-ink group-hover:text-electric transition-colors duration-500">
                    {title}
                  </h3>
                  <p className="relative mt-3 text-sm md:text-base text-ink-soft leading-relaxed flex-1">{w.note}</p>
                  <span className="relative mt-5 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink group-hover:text-electric transition">
                    {external ? "Visit" : "View"}
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline-block transition-transform duration-500 group-hover:translate-x-0.5"
                    >
                      <path
                        d={external ? "M3 11 L11 3 M4.5 3 H11 V9.5" : "M2 7 H12 M8 3 L12 7 L8 11"}
                        pathLength="1"
                        className="[stroke-dasharray:1] [stroke-dashoffset:1] group-hover:[stroke-dashoffset:0] [@media(hover:none)]:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                    </svg>
                  </span>
                </a>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative px-6 md:px-10 py-24 md:py-36 border-t border-rule bg-paper">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-3">
            <div className="md:sticky md:top-32">
              <div className="section-label">§ 04 — FAQ</div>
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
                    {f.q}
                    <span className="font-mono text-electric text-2xl leading-none transition-transform duration-300 group-open:rotate-45">
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

      {/* Start a project */}
      <section id="start" className="relative px-6 md:px-10 py-28 md:py-40 border-t border-rule overflow-hidden">
        <div className="absolute -bottom-40 -left-32 w-[55vw] h-[55vw] rounded-full bg-sky/50 dark:bg-sky/25 blur-3xl blob pointer-events-none" />
        <div className="grid grid-cols-12 gap-6 relative">
          <div className="col-span-12 md:col-span-3">
            <Reveal>
              <div className="section-label">§ 05 — Start a project</div>
            </Reveal>
          </div>
          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitLines as="h2" delay={0.1} className="font-display text-5xl md:text-8xl leading-[0.9] tracking-tight text-ink">
              Let&rsquo;s build <span className="italic text-electric">your</span> site.
            </SplitLines>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-xl text-lg md:text-xl text-ink-soft leading-relaxed">
                {START_TEXT}
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="mt-10">
                <CTAButtons />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
