"use client";
import Reveal from "./Reveal";
import SplitLines from "./SplitLines";
import { DecodeLabel } from "./Scramble";

const roles = [
  {
    years: "2024 — 2025",
    org: "St. Joseph's College, Colombo 10",
    title: "Head Prefect",
  },
  {
    years: "2024 — 2025",
    org: "Rotary International · District 3220",
    title: "District Interact Representative",
  },
  {
    years: "2023 — 2024",
    org: "Interact · District 3220",
    title: "Assistant District Interact Secretary",
  },
  {
    years: "2022 — 2023",
    org: "St. Joseph's College, Colombo 10",
    title: "Senior Prefect",
  },
  {
    years: "2022 — 2023",
    org: "St. Joseph's College · Interact Club",
    title: "Club President",
  },
];

export default function Leadership() {
  return (
    <section className="relative px-6 md:px-10 py-32 md:py-44 border-t border-rule bg-paper">
      <div className="grid grid-cols-12 gap-6 mb-16 md:mb-24">
        <div className="col-span-12 md:col-span-3">
          <DecodeLabel className="section-label">§ 02 — Beyond the Code</DecodeLabel>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          <SplitLines as="h2" className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight text-ink">
            Leading people, not just <span className="italic text-electric">pixels</span>.
          </SplitLines>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-base md:text-lg text-ink-soft">
              Before the code, there was the council room. Years of student leadership and Rotary
              Interact service taught me how to organise people, run projects and deliver them for
              a community.
            </p>
          </Reveal>
        </div>
      </div>

      {/* roles */}
      <div className="grid grid-cols-12 gap-6 border-t border-rule pt-16 md:pt-20">
        <div className="col-span-12 md:col-span-3">
          <Reveal>
            <h3 className="section-label">Roles held</h3>
          </Reveal>
        </div>
        <div className="col-span-12 md:col-span-9 md:col-start-4">
          {roles.map((r, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div className="grid grid-cols-12 gap-4 items-baseline border-t border-rule py-6 first:border-t-0">
                <div className="col-span-12 md:col-span-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                  {r.years}
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="font-display text-2xl md:text-3xl text-ink leading-tight">
                    {r.title}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-3 md:text-right text-sm text-ink-soft">
                  {r.org}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
