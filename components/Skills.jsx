"use client";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";
import Terminal from "./skills/Terminal";

export default function Skills() {
  return (
    <section className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule">
      <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 03 — Stack</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Tools of the <span className="italic text-electric">trade</span>.
          </SplitLines>
        </div>
      </div>

      {/* The terminal spans the section's full width (Damian). */}
      <Terminal />
    </section>
  );
}
