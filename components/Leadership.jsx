"use client";
import { useEffect, useRef, useState } from "react";
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

// Roles draw in as the list scrolls into view: each row's top rule draws
// left to right, then its text rises, staggered down the list. One observer
// flips data-shown once; the rest is CSS. The hidden start state only applies
// under js:motion-safe: with data-shown="false", so no-JS visitors and reduced
// motion get the finished rows from the server HTML.
const STAGGER = 120; // ms between rows
const TEXT_LAG = 250; // ms from a row's rule to its text

export default function Leadership() {
  const listRef = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
        <div
          ref={listRef}
          data-shown={shown ? "true" : "false"}
          className="group/roles col-span-12 md:col-span-9 md:col-start-4"
        >
          {roles.map((r, i) => (
            <div key={i} data-role-row className="relative py-6">
              {/* The first row has no rule, as before. */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  data-role-rule
                  style={{ transitionDelay: `${i * STAGGER}ms` }}
                  className="absolute inset-x-0 top-0 h-px origin-left bg-rule transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] js:motion-safe:group-data-[shown=false]/roles:scale-x-0"
                />
              )}
              <div
                data-role-text
                style={{ transitionDelay: `${i * STAGGER + TEXT_LAG}ms` }}
                className="grid grid-cols-12 gap-4 items-baseline transition-[opacity,translate] duration-[700ms] ease-[cubic-bezier(0.22,1,0.36,1)] js:motion-safe:group-data-[shown=false]/roles:translate-y-4 js:motion-safe:group-data-[shown=false]/roles:opacity-0"
              >
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
