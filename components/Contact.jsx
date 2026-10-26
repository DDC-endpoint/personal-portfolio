"use client";
import { motion } from "framer-motion";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import Parallax from "./Parallax";
import { SOCIALS, EMAIL } from "@/lib/site";
import { EASE } from "@/lib/motion";
import { DecodeLabel } from "./Scramble";

export default function Contact() {
  return (
    <section
      id="contact"
      className="relative px-6 md:px-10 pt-32 md:pt-48 pb-20 md:pb-32 border-t border-rule overflow-hidden"
    >
      <div className="grid grid-cols-12 gap-6 relative">

        {/* Left column — label at top, "hello." vertical beside the socials grid */}
        <div className="col-span-12 md:col-span-3 flex flex-col">
          <DecodeLabel className="section-label md:sticky md:top-32">§ 08 — Contact</DecodeLabel>

          <div className="hidden md:flex flex-1 items-center justify-start mt-8 overflow-hidden">
            <Parallax distance={30}>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: EASE }}
                aria-hidden
                className="pointer-events-none select-none font-display italic leading-none text-electric/15"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: "7rem",
                }}
              >
                hello.
              </motion.div>
            </Parallax>
          </div>
        </div>

        {/* Right column — all content */}
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-6xl md:text-[9rem] leading-[0.88] tracking-ultra text-ink">
            Let&rsquo;s <span className="italic text-electric">talk</span>.
          </SplitLines>

          <Reveal delay={0.1}>
            <p className="mt-8 md:mt-10 max-w-xl text-lg md:text-xl text-ink-soft leading-relaxed">
              Need a website? I take on freelance web design and development for businesses and
              creatives — many projects delivered within a couple of days. Internships,
              collaborations, or anyone with a good idea — the inbox is open.
              Pick the channel you like.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <a
              href={`mailto:${EMAIL}?subject=Website%20enquiry`}
              data-hover
              className="group mt-8 inline-flex items-center gap-3 link-line font-display text-2xl md:text-4xl italic text-ink"
            >
              {EMAIL}
              <span className="font-sans not-italic text-base transition-transform duration-500 group-hover:translate-x-1.5">
                →
              </span>
            </a>
          </Reveal>

          <div className="mt-14 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border-y border-rule">
            {SOCIALS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-hover
                  className="group flex items-baseline justify-between gap-6 bg-ivory px-6 py-8 md:px-10 md:py-10 hover:bg-mist transition-colors duration-500"
                >
                  <div>
                    <div className="section-label mb-2">{`0${i + 1} / ${s.label}`}</div>
                    <div className="font-display text-3xl md:text-5xl text-ink group-hover:text-electric transition-colors duration-500">
                      {s.handle}
                    </div>
                  </div>
                  <span className="font-mono text-xl md:text-3xl text-ink-soft transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-1">
                    ↗
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
