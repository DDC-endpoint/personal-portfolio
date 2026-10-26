"use client";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { EMAIL } from "@/lib/site";
import { DecodeLabel, ScrambleText } from "./Scramble";

export default function Resume() {
  return (
    <section id="resume" className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule">
      <div className="grid grid-cols-12 gap-6 items-center">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 06 — Résumé</DecodeLabel>
        </div>

        <div className="col-span-12 md:col-span-6">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Want the <span className="italic text-electric">long form</span>?
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-base md:text-lg text-ink-soft">
              Education, coursework, and current pursuits — packaged as a single page.
            </p>
          </Reveal>
        </div>

        <div className="col-span-12 md:col-span-3 md:text-right">
          <Reveal delay={0.2}>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent("CV request — damiandc.com")}`}
              data-hover
              aria-label="Request CV by email"
              className="group inline-flex items-center gap-3 px-6 py-4 border border-ink rounded-full hover:bg-ink hover:text-ivory transition-colors duration-500"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                <ScrambleText text="Request CV" />
              </span>
              <span className="inline-block transition-transform duration-500 group-hover:translate-x-0.5">
                →
              </span>
            </a>
            <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              PDF · by email · 2026
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
